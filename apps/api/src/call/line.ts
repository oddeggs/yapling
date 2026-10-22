import type Anthropic from '@anthropic-ai/sdk';
import type { CharacterId } from '@yapling/contracts';
import { CAST } from '@yapling/story';

import { NO_CONTROL, OUTCOMES, parseControl, type Control, type Outcome } from './control';
import type { FrameSender } from './frames';
import { hedged } from './hedge';
import { noUsage, type Usage } from './llm';
import type { GuardAction } from './narration-guard';
import type { MappedAlignment } from './phrase-breaks';
import { ReplySplitter } from './reply-splitter';
import { TtsLine, type TtsVoice } from './tts';
import { TTS_SAMPLE_RATE } from './upstream';

/*
 * One character line spoken with live TTS: text from the model (streamed, with its control line
 * split off) or written text, into Flash, out to the phone as `say_start`, binary audio,
 * `alignment` frames and `say_end`.
 *
 * A gated line (the answer to a learner turn, started speculatively at the first short pause)
 * holds its audio in the call object until `release()`; `abort()` drops it, and if no audio
 * reached the phone the learner never hears it.
 */

export type LineSource =
  | {
      readonly kind: 'model';
      readonly params: Anthropic.MessageStreamParams;
      readonly hedge: number;
    }
  | { readonly kind: 'text'; readonly text: string };

export interface LineTimings {
  start: number;
  llmFirstToken?: number;
  ttsReady?: number;
  ttsFirstText?: number;
  ttsFirstAudio?: number;
  release?: number;
  firstAudioOut?: number;
  done?: number;
}

/**
 * A line that makes no progress (no model text, no audio) for `stallMs` has failed: the call
 * says so (a non-fatal error) and goes on, instead of waiting on a provider that went quiet.
 * Mutable for the tests.
 */
export const lineTiming = { stallMs: 10_000, checkMs: 500 };

export interface LineResult {
  readonly streamId: number;
  /** The spoken text; empty when the line said nothing. */
  readonly text: string;
  /** Milliseconds of audio sent to the phone. */
  readonly audioMs: number;
  readonly control: Control;
  readonly aborted: boolean;
  readonly failed: 'llm' | 'tts' | null;
  /** What the narration guard did, or null when the line passed untouched. */
  readonly guard: GuardReport | null;
}

export interface GuardReport {
  /** `replaced`: nothing safe was left, so the line's safe text was spoken instead. */
  readonly action: GuardAction | 'replaced';
  /** The text kept from the voice (for the logs). */
  readonly dropped: string;
}

export interface LineHost {
  readonly frames: FrameSender;
  readonly llm: Anthropic;
  nextStreamId(): number;
  /** A Flash socket for the voice (a spare one when ready). */
  takeTts(voice: TtsVoice): Promise<WebSocket>;
}

export interface LineOptions {
  readonly speaker: CharacterId;
  readonly voice: TtsVoice;
  readonly source: LineSource;
  readonly gated: boolean;
  readonly maxWords: number;
  /** A recorded reaction plays first: a leading reaction word is dropped. */
  readonly afterReaction: boolean;
  /** The first audio went to the phone: the line is committed. */
  readonly onFirstAudio?: () => void;
  /** The model's control line, as soon as its stream ends. */
  readonly onControl?: (control: Control) => void;
  /**
   * The case the model wrote first (`[unclear]` → `unclear`), once its first word is in: before
   * any of the line is spoken. Null when the line started without one. Model lines only.
   */
  readonly onCaseTag?: (tag: Outcome | null) => void;
  /** Spoken instead when the guard leaves nothing of a model line (it was all narration). */
  readonly safeLine?: string;
}

export class SpokenLine {
  readonly streamId: number;
  readonly timings: LineTimings = { start: Date.now() };
  readonly usage: Usage = noUsage();
  ttsChars = 0;
  private readonly ctrl = new AbortController();
  private tts: TtsLine | null = null;
  private held: { pcm: Uint8Array; alignment: MappedAlignment | null }[] = [];
  private gated: boolean;
  private audioSent = false;
  private audioMs = 0;
  private ttsDone = false;
  private aborted = false;
  private failed: 'llm' | 'tts' | null = null;
  private control: Control = NO_CONTROL;
  private splitter: ReplySplitter;
  private replacedBySafeLine = false;
  private settle!: (result: LineResult) => void;
  readonly done: Promise<LineResult>;
  private lastProgress = 0;
  private stallCheck: ReturnType<typeof setInterval> | null = null;
  private tagSent = false;

  constructor(
    private readonly host: LineHost,
    private readonly options: LineOptions,
  ) {
    this.streamId = host.nextStreamId();
    this.gated = options.gated;
    this.splitter = new ReplySplitter({
      maxWords: options.maxWords,
      afterReaction: options.afterReaction,
      speaker: CAST[options.speaker].name,
      guard: options.source.kind === 'model',
    });
    this.done = new Promise((resolve) => (this.settle = resolve));
  }

  get committed(): boolean {
    return this.audioSent;
  }

  get isGated(): boolean {
    return this.gated;
  }

  get isAborted(): boolean {
    return this.aborted;
  }

  /** The words spoken so far. */
  get text(): string {
    return this.splitter.text;
  }

  /** The model's line was all narration and its safe text was spoken instead. */
  get replaced(): boolean {
    return this.replacedBySafeLine;
  }

  get guard(): GuardReport | null {
    const action = this.replacedBySafeLine ? 'replaced' : this.splitter.guardAction;
    if (action === null) return null;
    return { action, dropped: this.splitter.guardDropped.join(' ').slice(0, 300) };
  }

  start(): this {
    this.lastProgress = Date.now();
    this.stallCheck = setInterval(() => this.checkStall(), lineTiming.checkMs);
    void this.run();
    return this;
  }

  /** The model or the voice went quiet mid-line: give up on it. */
  private checkStall(): void {
    if (this.finished || this.aborted || this.ttsDone) {
      this.stopStallCheck();
      return;
    }
    if (Date.now() - this.lastProgress < lineTiming.stallMs) return;
    const kind = this.splitter.text === '' ? 'llm' : 'tts';
    console.warn('call line stalled', { kind, streamId: this.streamId });
    this.ctrl.abort();
    this.fail(kind);
  }

  private stopStallCheck(): void {
    if (this.stallCheck !== null) clearInterval(this.stallCheck);
    this.stallCheck = null;
  }

  /** Lets held audio go to the phone. */
  release(): void {
    if (!this.gated || this.aborted) return;
    this.gated = false;
    this.timings.release = Date.now();
    const held = this.held;
    this.held = [];
    for (const chunk of held) this.forward(chunk.pcm, chunk.alignment);
    if (this.ttsDone) this.finish();
  }

  abort(): void {
    if (this.aborted) return;
    this.aborted = true;
    this.ctrl.abort();
    this.tts?.abort();
    this.resolve();
  }

  private async run(): Promise<void> {
    const ttsSocket = this.host.takeTts(this.options.voice).catch(() => null);
    const openTts = async (): Promise<boolean> => {
      if (this.tts) return true;
      const ws = await ttsSocket;
      if (this.aborted) {
        ws?.close(1000, 'aborted');
        return false;
      }
      if (ws === null) {
        this.fail('tts');
        return false;
      }
      this.timings.ttsReady = Date.now();
      this.tts = new TtsLine(ws, this.options.voice, {
        audio: (pcm, alignment) => this.onAudio(pcm, alignment),
        done: () => this.onTtsDone(),
        failed: () => this.fail('tts'),
      });
      return true;
    };
    const say = (words: string) => {
      if (!words || !this.tts) return;
      this.timings.ttsFirstText ??= Date.now();
      this.tts.push(words);
    };

    try {
      const { source } = this.options;
      if (source.kind === 'text') {
        const words = this.splitter.push(`${source.text} `);
        if (words && !(await openTts())) return;
        say(words);
      } else {
        const stream = hedged(
          (signal) => this.host.llm.messages.stream(source.params, { signal }),
          source.hedge,
          this.ctrl.signal,
        );
        for await (const event of stream) {
          if (this.aborted) return;
          this.lastProgress = Date.now();
          if (event.type === 'message_start') {
            const u = event.message.usage;
            this.usage.input += u.input_tokens;
            this.usage.cacheRead += u.cache_read_input_tokens ?? 0;
            this.usage.cacheWrite += u.cache_creation_input_tokens ?? 0;
          } else if (event.type === 'message_delta') {
            this.usage.output += event.usage.output_tokens;
          } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            this.timings.llmFirstToken ??= Date.now();
            const words = this.splitter.push(event.delta.text);
            if (this.splitter.caseTagKnown) this.sendTag();
            if (this.aborted) return;
            if (words && !(await openTts())) return;
            say(words);
          }
        }
      }
      if (this.aborted) return;
      const end = this.splitter.end();
      if (source.kind === 'model') this.sendTag();
      if (this.aborted) return;
      let tail = end.tail;
      const { safeLine } = this.options;
      if (this.splitter.text === '' && this.splitter.guardAction !== null && safeLine) {
        this.replacedBySafeLine = true;
        tail = this.splitter.speakInstead(safeLine);
      }
      this.control = withCaseTag(parseControl(end.control), this.splitter.caseTag);
      this.options.onControl?.(this.control);
      if (tail && !(await openTts())) return;
      say(tail);
      if (this.splitter.text === '') {
        // Nothing to say (only a control line): no stream at all.
        void ttsSocket.then((ws) => ws?.close(1000, 'unused'));
        this.ttsDone = true;
        if (!this.gated) this.finish();
        return;
      }
      this.ttsChars = this.tts?.chars ?? 0;
      this.tts?.end();
    } catch (error) {
      if (this.aborted) return;
      console.error('call line failed', { error: String(error).slice(0, 300) });
      this.fail('llm');
    }
  }

  /** Tells the host the line's case once, as soon as it is known. */
  private sendTag(): void {
    if (this.tagSent) return;
    this.tagSent = true;
    this.options.onCaseTag?.(outcomeOf(this.splitter.caseTag));
  }

  private onAudio(pcm: Uint8Array, alignment: MappedAlignment | null): void {
    if (this.aborted) return;
    this.lastProgress = Date.now();
    this.timings.ttsFirstAudio ??= Date.now();
    if (this.gated) this.held.push({ pcm, alignment });
    else this.forward(pcm, alignment);
  }

  private onTtsDone(): void {
    if (this.aborted) return;
    this.ttsDone = true;
    this.ttsChars = this.tts?.chars ?? this.ttsChars;
    if (!this.gated) this.finish();
  }

  private forward(pcm: Uint8Array, alignment: MappedAlignment | null): void {
    const { frames } = this.host;
    if (!this.audioSent) {
      this.audioSent = true;
      this.timings.firstAudioOut = Date.now();
      frames.send({
        type: 'say_start',
        streamId: this.streamId,
        character: this.options.speaker,
        codec: 'pcm16',
        sampleRateHz: TTS_SAMPLE_RATE,
      });
      this.options.onFirstAudio?.();
    }
    if (pcm.byteLength > 0) {
      frames.audio(this.streamId, pcm);
      this.audioMs += pcm.byteLength / ((TTS_SAMPLE_RATE * 2) / 1_000);
    }
    if (alignment && alignment.chars.length > 0) {
      frames.send({ type: 'alignment', streamId: this.streamId, ...alignment });
    }
  }

  private finished = false;

  private finish(): void {
    if (this.finished || this.aborted) return;
    this.finished = true;
    this.timings.done = Date.now();
    const text = this.splitter.text;
    if (this.audioSent && text) {
      this.host.frames.send({
        type: 'say_end',
        streamId: this.streamId,
        character: this.options.speaker,
        text,
      });
    }
    this.resolve();
  }

  private fail(kind: 'llm' | 'tts'): void {
    if (this.aborted || this.finished) return;
    this.failed = kind;
    this.tts?.abort();
    this.finished = true;
    if (this.audioSent && this.splitter.text) {
      this.host.frames.send({
        type: 'say_end',
        streamId: this.streamId,
        character: this.options.speaker,
        text: this.splitter.text,
      });
    }
    this.resolve();
  }

  private resolve(): void {
    this.stopStallCheck();
    this.settle({
      streamId: this.streamId,
      text: this.aborted ? '' : this.splitter.text,
      audioMs: Math.round(this.audioMs),
      control: this.control,
      aborted: this.aborted,
      failed: this.failed,
      guard: this.guard,
    });
  }
}

const outcomeOf = (tag: string | null): Outcome | null =>
  OUTCOMES.find((o): o is Outcome => o === tag) ?? null;

/** The line was written for the case it was tagged with: that is the turn's outcome. */
function withCaseTag(control: Control, tag: string | null): Control {
  const outcome = outcomeOf(tag);
  return outcome === null ? control : { ...control, outcome };
}
