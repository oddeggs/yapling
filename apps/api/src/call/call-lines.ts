import type { CallEndReason, CharacterId } from '@yapling/contracts';
import { speechSettings } from '@yapling/domain';
import {
  findLine,
  plainCaption,
  type LineLanguage,
  type Scene,
  type SceneEffect,
} from '@yapling/story';

import { promptStage, type Director } from './director';
import type { CallData } from './finalize';
import type { FrameSender } from './frames';
import type { AgainAsk } from './judge';
import type { LearnerTurn } from './learner-turn';
import { SpokenLine, type LineHost, type LineSource } from './line';
import type { Active } from './reply';
import { replayBy, replayOf } from './scene-lines';
import { lastCharacterLine } from './transcript';
import { logGuardedLine } from './turn-log';
import type { TtsVoice } from './tts';
import { slowerVoice } from './voice-pool';
import { withName } from './words';

/** A line with no audio yet after this long shows the thinking head tilt. */
const THINKING_AFTER_MS = 600;

/*
 * The lines of a live call that don't answer a learner turn: a line from the model or written
 * text in the live voice (`startLine`), and the scene's written lines: a line the runner waits on (its recording, or the live
 * voice while it has none, and always when said again slower), the name spliced in before a line
 * that greets the learner, the short fixed lines it doesn't wait on (praise, "Again?"), and
 * "again" / "slowly", said by the runner or by the call itself.
 */

export type PlayRec = Extract<SceneEffect, { type: 'play_rec' }>;

/** A line said again whole, never cut at a reply's length. */
export const REPLAY_MAX_WORDS = 60;

export interface StartExtra {
  readonly endAfter?: CallEndReason;
  readonly beatId?: string;
  readonly safeLine?: string;
  readonly voice?: TtsVoice;
  readonly maxWords?: number;
}

export interface CallLinesHost {
  readonly data: CallData;
  readonly director: Director;
  readonly scene: Scene;
  lineHost(): LineHost;
  thinking(on: boolean): void;
  addUsage(line: SpokenLine): void;
  /** The line now playing. */
  active(): Active | null;
  frames(): FrameSender;
  learner(): LearnerTurn | null;
  voice(character: CharacterId, language?: LineLanguage): TtsVoice;
  newActive(streamId: number, after: Active['after']): Active;
  ready(active: Active, silent?: boolean): void;
  pushCharacterLine(
    speaker: CharacterId,
    text: string,
    lineId: string | null,
    beatId: string | null,
  ): void;
  nextStreamId(): number;
  /** Plays next, before anything already queued. */
  queueFirst(effect: PlayRec | { readonly type: 'rec_now'; readonly effect: PlayRec }): void;
  run(effects: readonly SceneEffect[]): void;
  pump(): void;
}

export class CallLines {
  constructor(private readonly host: CallLinesHost) {}

  /** A line from the model or written text, not waiting on the learner. */
  startLine(
    speaker: CharacterId,
    source: LineSource,
    after: Active['after'],
    extra: StartExtra = {},
  ): void {
    const endAfter = extra.endAfter ?? null;
    const beatId = extra.beatId ?? null;
    const line = new SpokenLine(this.host.lineHost(), {
      speaker,
      voice: extra.voice ?? this.host.voice(speaker),
      source,
      gated: false,
      // A written line is said whole; a generated one is held to the stage's length.
      maxWords:
        extra.maxWords ??
        (source.kind === 'model'
          ? speechSettings(promptStage(this.host.scene, this.host.data.learner.stage))
              .maxWordsPerTurn
          : REPLAY_MAX_WORDS),
      afterReaction: false,
      onFirstAudio: () => this.host.thinking(false),
      ...(extra.safeLine ? { safeLine: extra.safeLine } : {}),
    });
    const active = this.host.newActive(line.streamId, after);
    active.endAfter = endAfter;
    const thinkingTimer = setTimeout(() => {
      if (!line.committed && this.host.active() === active) this.host.thinking(true);
    }, THINKING_AFTER_MS);
    line.start();
    void line.done.then((result) => {
      clearTimeout(thinkingTimer);
      this.host.thinking(false);
      this.host.addUsage(line);
      logGuardedLine(this.host.data.meta.callId, beatId ?? this.host.director.state.beatId, result);
      if (this.host.active() !== active) return;
      if (result.failed !== null && result.text === '') {
        this.host.frames().send({
          type: 'error',
          code: result.failed === 'llm' ? 'llm_failed' : 'tts_failed',
          fatal: false,
        });
      }
      if (result.text)
        this.host.pushCharacterLine(
          speaker,
          result.text,
          null,
          beatId ?? this.host.director.state.beatId,
        );
      active.durationMs = result.audioMs;
      this.host.ready(active, result.text === '');
    });
  }

  /**
   * A written line the runner waits on (`rec_played`): its recording, or the character's live
   * voice reading it while it waits for one, and always when it is said again slower.
   */
  playRec(effect: PlayRec): void {
    const line = findLine(effect.lineId);
    if (effect.slower || !effect.recorded || !line?.audio) {
      const voice = this.host.voice(effect.character, effect.language ?? 'en');
      this.startLine(
        effect.character,
        { kind: 'text', text: withName(plainCaption(effect.text), this.host.data.learner.name) },
        'rec_played',
        { beatId: effect.beatId, voice: effect.slower ? slowerVoice(voice) : voice },
      );
      return;
    }
    if (line.nameSplice === 'before' && this.host.data.learner.name.trim() !== '') {
      // "Lan! Nice to meet you.": the name in the character's live voice, then the recording.
      this.host.queueFirst({ type: 'rec_now', effect });
      this.startLine(
        effect.character,
        { kind: 'text', text: `${this.host.data.learner.name}!` },
        null,
        {
          beatId: effect.beatId,
        },
      );
      return;
    }
    this.playRecorded(effect);
  }

  playRecorded(effect: PlayRec): void {
    const line = findLine(effect.lineId);
    const streamId = this.host.nextStreamId();
    this.host.frames().send({
      type: 'play_rec',
      streamId,
      lineId: effect.lineId,
      character: effect.character,
    });
    this.host.pushCharacterLine(effect.character, effect.caption, effect.lineId, effect.beatId);
    const active = this.host.newActive(streamId, 'rec_played');
    active.durationMs = line?.audio?.durationMs ?? 0;
    this.host.ready(active);
  }

  /** A short fixed line not waited on (praise, "Again?"): its recording, or the live voice. */
  say(effect: Extract<SceneEffect, { type: 'say' }>): void {
    const line = effect.lineId === null ? undefined : findLine(effect.lineId);
    if (line?.audio && effect.lineId !== null) {
      const streamId = this.host.nextStreamId();
      this.host.frames().send({
        type: 'play_rec',
        streamId,
        lineId: effect.lineId,
        character: effect.speaker,
      });
      this.host.pushCharacterLine(effect.speaker, line.caption, effect.lineId, effect.beatId);
      const active = this.host.newActive(streamId, null);
      active.durationMs = line.audio.durationMs;
      this.host.ready(active);
      return;
    }
    this.startLine(
      effect.speaker,
      { kind: 'text', text: withName(plainCaption(effect.text), this.host.data.learner.name) },
      null,
      { beatId: effect.beatId, voice: this.host.voice(effect.speaker, effect.language) },
    );
  }

  /** "Nói lại" / "Chậm thôi" tapped: logged, and the same replay as saying it. */
  tapped(ask: AgainAsk): void {
    const { data, director } = this.host;
    const { callId } = data.meta;
    console.log({ msg: 'call replay', callId, beatId: director.state.beatId, replay: ask });
    this.askedAgain(ask);
  }

  /**
   * "Sorry? Again, please." or "Slowly, please." (said, or tapped as `replay`): the last line
   * again, never a try. The runner says it when it changes the scene or knows the line; otherwise
   * the call says its own last line: the recording, or the text in the live voice (a step slower,
   * with longer breaks, for "slowly").
   */
  askedAgain(ask: AgainAsk): void {
    const now = this.host.director.listening();
    const last = lastCharacterLine(this.host.data.transcript);
    if (
      now !== null &&
      replayBy(this.host.director.state, now.answer.onReplay, last) === 'runner'
    ) {
      const effects = this.host.director.dispatch({
        type: ask === 'slower' ? 'slower_request' : 'repeat_request',
      });
      if (effects.length > 0) {
        this.host.run(effects);
        return;
      }
    }
    if (last === null) {
      this.host.pump();
      return;
    }
    const slower = ask === 'slower';
    const written = replayOf(last, this.host.director.state.beatId ?? last.beatId ?? '', slower);
    if (written !== null) {
      // Not waited on by the runner: after it, the beat goes on waiting.
      this.host.queueFirst(written);
      this.host.pump();
      return;
    }
    const voice = this.host.voice(last.speaker);
    this.host.learner()?.closeWindow();
    this.startLine(last.speaker, { kind: 'text', text: last.text }, null, {
      voice: slower ? slowerVoice(voice) : voice,
      maxWords: REPLAY_MAX_WORDS,
    });
  }
}
