import type { CharacterId, TtsCodec } from '@yapling/contracts';
import type { LineTiming } from '@yapling/story';
import type { AudioBuffer, AudioBufferSourceNode, AudioContext } from 'react-native-audio-api';

import {
  appendAlignment,
  EMPTY_TRACK,
  perfAt,
  trackFromTiming,
  type CaptionTrack,
  type ClockAnchor,
} from './caption-clock';
import type { Lipsync } from './lipsync';
import { pcm16BytesToFloat, resampleClip } from './pcm';
import { DEFAULT_PLAYOUT, StreamPlayout, type PlayoutConfig, type Segment } from './playout';
import { localVisemeTrack, type VisemeTrackFn } from './visemes';

/*
 * Character audio: streamed TTS lines through the jitter buffer, and recorded lines from the app
 * bundle (or a download). Lines play one after another in the order the call sent them, so a
 * recorded reaction is followed seamlessly by the generated reply. The player keeps the lipsync
 * clock pointed at the audible line and reports when each line is first heard and when it ends.
 */

export type LineKind = 'live' | 'recorded';

export interface LineInfo {
  readonly streamId: number;
  readonly kind: LineKind;
  readonly character: CharacterId;
}

export interface PlayerEvents {
  /** The line's first sample is scheduled; `audiblePerfMs` is when it will be heard. */
  scheduled(line: LineInfo, audiblePerfMs: number): void;
  /** The line is now audible. */
  audible(line: LineInfo): void;
  /** The caption text grew (live) or is known (recorded). */
  caption(line: LineInfo, text: string): void;
  /** The line finished (or was cut short). */
  ended(line: LineInfo, interrupted: boolean): void;
  /** Nothing is playing or waiting. */
  idle(): void;
  /** A line couldn't play (bad audio, missing recorded line). */
  failed(line: LineInfo, reason: string): void;
}

/** Where recorded lines come from: the bundled asset and its timing, or null when not bundled. */
export type RecordedLineSource = (
  lineId: string,
) => { readonly audio: number | string; readonly timing: LineTiming | null } | null;

interface BaseLine extends LineInfo {
  track: CaptionTrack;
  nodes: AudioBufferSourceNode[];
  /** Context time the last scheduled sample ends; null until fully scheduled. */
  doneCtx: number | null;
  firstCtx: number | null;
  audibleTimer: ReturnType<typeof setTimeout> | null;
  isAudible: boolean;
  segments: Segment[];
}

interface LiveLine extends BaseLine {
  readonly kind: 'live';
  readonly codec: TtsCodec;
  readonly sampleRateHz: number;
  readonly playout: StreamPlayout<AudioBuffer>;
  mp3: Uint8Array[];
  sayEnded: boolean;
  /** `performance.now()` of the last chunk, to give up on a stream whose `say_end` never came. */
  lastArrivalMs: number;
}

interface RecordedLine extends BaseLine {
  readonly kind: 'recorded';
  buffer: AudioBuffer | null;
  loading: boolean;
}

type Line = LiveLine | RecordedLine;

export interface PlayerOptions {
  readonly context: AudioContext;
  readonly lipsync: Lipsync;
  readonly events: Partial<PlayerEvents>;
  readonly recorded: RecordedLineSource;
  /** Seconds from leaving the graph to being heard. */
  readonly outputLatency: () => number;
  readonly playout?: PlayoutConfig;
  readonly visemeTrack?: VisemeTrackFn;
}

const TICK_MS = 20;
/** Start a recorded line at least this far ahead of the clock. */
const LEAD_S = 0.03;
/** A live line with no audio for this long, and no `say_end`, is treated as over. */
const STALLED_MS = 5_000;

export class CallPlayer {
  private lines: Line[] = [];
  private readonly decoded = new Map<string, Promise<AudioBuffer>>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly ctx: AudioContext;
  private readonly visemes: VisemeTrackFn;
  private remoteBase: string | null = null;
  private resuming = false;

  constructor(private readonly options: PlayerOptions) {
    this.ctx = options.context;
    this.visemes = options.visemeTrack ?? localVisemeTrack;
  }

  get busy(): boolean {
    return this.lines.length > 0;
  }

  /** Dev diagnostics: each waiting line and where it is on the clock. */
  debug(): string {
    return this.lines
      .map(
        (l) =>
          `${l.streamId}:${l.kind} first=${l.firstCtx?.toFixed(2) ?? '-'} done=${l.doneCtx?.toFixed(2) ?? '-'}`,
      )
      .join(' ');
  }

  /** Where recorded lines download from when they aren't bundled (`ready.recordedLineBaseUrl`). */
  setRecordedLineBaseUrl(url: string | null): void {
    this.remoteBase = url;
  }

  /** Decodes recorded lines ahead of need (a scene's opening lines while the call rings). */
  preload(lineIds: readonly string[]): void {
    for (const id of lineIds) void this.decodeRecorded(id).catch(() => undefined);
  }

  /** `say_start`: a generated line begins; its audio follows on `streamId`. */
  startLive(streamId: number, character: CharacterId, codec: TtsCodec, sampleRateHz: number): void {
    if (this.find(streamId)) return;
    const line: LiveLine = {
      ...this.base(streamId, character),
      kind: 'live',
      codec,
      sampleRateHz,
      playout: new StreamPlayout<AudioBuffer>(this.options.playout ?? DEFAULT_PLAYOUT),
      mp3: [],
      sayEnded: false,
      lastArrivalMs: performance.now(),
    };
    this.lines.push(line);
    this.ensureTimer();
  }

  /** A binary TTS chunk for a live line. */
  pushAudio(streamId: number, seq: number, payload: Uint8Array): void {
    const line = this.find(streamId);
    if (line?.kind !== 'live') return;
    line.lastArrivalMs = performance.now();
    if (line.codec === 'mp3') {
      // MP3 can't be cut at arbitrary bytes: held whole and decoded at say_end.
      line.mp3.push(payload.slice());
      return;
    }
    let samples = pcm16BytesToFloat(payload);
    if (line.sampleRateHz !== this.ctx.sampleRate) {
      samples = resampleClip(samples, line.sampleRateHz, this.ctx.sampleRate);
    }
    if (samples.length === 0) return;
    const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    const durationMs = (samples.length / this.ctx.sampleRate) * 1000;
    line.playout.enqueue({ seq, durationMs, data: buffer }, this.ctx.currentTime);
    this.pump();
  }

  /** An alignment frame for a live line: captions and mouths. */
  pushAlignment(
    streamId: number,
    chars: readonly string[],
    startMs: readonly number[],
    endMs: readonly number[],
  ): void {
    const line = this.find(streamId);
    if (line?.kind !== 'live') return;
    line.track = appendAlignment(line.track, chars, startMs, endMs);
    this.options.events.caption?.(line, line.track.text);
    if (line.isAudible) this.pointLipsync(line);
  }

  /** `say_end`: the live line's audio is all sent. */
  endLive(streamId: number): void {
    const line = this.find(streamId);
    if (line?.kind !== 'live') return;
    line.sayEnded = true;
    if (line.codec === 'mp3') {
      void this.decodeMp3(line);
      return;
    }
    this.pump();
  }

  /** `play_rec`: a recorded line from the bundle. */
  playRecorded(streamId: number, lineId: string, character: CharacterId): void {
    if (this.find(streamId)) return;
    const line: RecordedLine = {
      ...this.base(streamId, character),
      kind: 'recorded',
      buffer: null,
      loading: true,
    };
    this.lines.push(line);
    const source = this.options.recorded(lineId);
    if (source?.timing) {
      line.track = trackFromTiming(source.timing);
      this.options.events.caption?.(line, line.track.text);
    }
    this.decodeRecorded(lineId)
      .then((buffer) => {
        line.buffer = buffer;
        line.loading = false;
        this.pump();
      })
      .catch((e: unknown) => {
        line.loading = false;
        this.options.events.failed?.(line, String(e));
        this.finish(line, true);
      });
    this.ensureTimer();
  }

  /** Stops everything at once (hang-up, interruption, barge-in). Unfinished lines end interrupted. */
  stopAll(): void {
    const lines = this.lines;
    this.lines = [];
    for (const line of lines) this.silence(line);
    for (const line of lines) this.options.events.ended?.(line, true);
    this.options.lipsync.source.value = null;
    this.stopTimer();
    this.options.events.idle?.();
  }

  dispose(): void {
    this.stopAll();
    this.decoded.clear();
  }

  private base(streamId: number, character: CharacterId) {
    return {
      streamId,
      character,
      track: EMPTY_TRACK,
      nodes: [] as AudioBufferSourceNode[],
      doneCtx: null,
      firstCtx: null,
      audibleTimer: null,
      isAudible: false,
      segments: [] as Segment[],
    };
  }

  private find(streamId: number): Line | undefined {
    return this.lines.find((l) => l.streamId === streamId);
  }

  private decodeRecorded(lineId: string): Promise<AudioBuffer> {
    const cached = this.decoded.get(lineId);
    if (cached) return cached;
    const source = this.options.recorded(lineId);
    const input = source?.audio ?? (this.remoteBase ? `${this.remoteBase}/${lineId}.mp3` : null);
    if (input === null) return Promise.reject(new Error(`no recorded line ${lineId}`));
    const p = this.ctx.decodeAudioData(input);
    this.decoded.set(lineId, p);
    p.catch(() => this.decoded.delete(lineId));
    return p;
  }

  private async decodeMp3(line: LiveLine): Promise<void> {
    const total = line.mp3.reduce((n, c) => n + c.byteLength, 0);
    const joined = new Uint8Array(total);
    let at = 0;
    for (const c of line.mp3) {
      joined.set(c, at);
      at += c.byteLength;
    }
    line.mp3 = [];
    try {
      const buffer = await this.ctx.decodeAudioData(joined.buffer);
      line.playout.enqueue(
        { seq: 1, durationMs: buffer.duration * 1000, data: buffer },
        this.ctx.currentTime,
      );
      this.pump();
    } catch (e) {
      this.options.events.failed?.(line, String(e));
      this.finish(line, true);
    }
  }

  /** Schedules what can be scheduled, in line order, and retires lines that have finished. */
  private pump(): void {
    if (this.ctx.state !== 'running') {
      // The graph stopped under us (a failed mic start, an engine rebuild): start it again first.
      this.resume();
      return;
    }
    const now = this.ctx.currentTime;
    let gate = now;
    for (const line of this.lines) {
      if (line.kind === 'live') {
        line.playout.delayUntil(gate);
        const placed = line.sayEnded ? line.playout.finish(now) : line.playout.tick(now);
        for (const p of placed) this.schedule(line, p.data, p.ctxStart, p);
        if (line.sayEnded && line.playout.bufferedMs === 0 && line.codec === 'pcm16') {
          line.doneCtx = line.playout.endCtx ?? Math.max(gate, now);
        } else if (
          !line.sayEnded &&
          line.playout.bufferedMs === 0 &&
          performance.now() - line.lastArrivalMs > STALLED_MS
        ) {
          // The call went quiet mid-line: don't hold every later line behind it.
          line.doneCtx = line.playout.endCtx ?? Math.max(gate, now);
        }
      } else if (line.buffer && line.firstCtx === null) {
        const start = Math.max(gate, now + LEAD_S);
        const seg: Segment = {
          seq: 1,
          ctxStart: start,
          streamMs: 0,
          durationMs: line.buffer.duration * 1000,
        };
        this.schedule(line, line.buffer, start, seg);
        line.doneCtx = start + line.buffer.duration;
      } else if (!line.buffer && !line.loading && line.firstCtx === null) {
        line.doneCtx = gate;
      }
      if (line.doneCtx === null) break;
      gate = line.doneCtx;
    }
    this.retire(now);
  }

  private resume(): void {
    if (this.resuming) return;
    this.resuming = true;
    this.ctx
      .resume()
      .catch(() => undefined)
      .finally(() => {
        this.resuming = false;
      });
  }

  private schedule(line: Line, buffer: AudioBuffer, ctxStart: number, seg: Segment): void {
    const rate = this.ctx.sampleRate;
    // Sample-exact starts (the engine truncates time × rate), so chunks join without a click.
    const frame = Math.round(ctxStart * rate);
    const node = this.ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(this.ctx.destination);
    node.start((frame + 0.25) / rate);
    line.nodes.push(node);
    line.segments.push(seg);
    const anchor = this.anchor();
    if (line.firstCtx === null) {
      line.firstCtx = ctxStart;
      const audible = perfAt(anchor, ctxStart) + this.options.outputLatency() * 1000;
      this.options.events.scheduled?.(line, audible);
      line.audibleTimer = setTimeout(
        () => {
          line.audibleTimer = null;
          if (!this.lines.includes(line)) return;
          line.isAudible = true;
          this.pointLipsync(line);
          this.options.events.audible?.(line);
        },
        Math.max(0, audible - performance.now()),
      );
    } else if (line.isAudible) {
      this.pointLipsync(line);
    }
  }

  private pointLipsync(line: Line): void {
    this.options.lipsync.source.value = {
      streamId: line.streamId,
      track: line.track,
      visemes: this.visemes(line.track),
      segments: line.segments.slice(),
      anchor: this.anchor(),
      outputLatencyS: this.options.outputLatency(),
    };
  }

  private anchor(): ClockAnchor {
    return { ctx: this.ctx.currentTime, perfMs: performance.now() };
  }

  /** Ends lines whose last sample has been heard. */
  private retire(now: number): void {
    const latency = this.options.outputLatency();
    while (this.lines.length > 0) {
      const head = this.lines[0];
      if (!head || head.doneCtx === null || now < head.doneCtx + latency) break;
      this.finish(head, false);
    }
    if (this.lines.length === 0) {
      this.stopTimer();
      this.options.events.idle?.();
    }
  }

  private finish(line: Line, interrupted: boolean): void {
    const i = this.lines.indexOf(line);
    if (i === -1) return;
    this.lines.splice(i, 1);
    this.silence(line);
    this.options.events.ended?.(line, interrupted);
    if (interrupted && this.lines.length === 0) {
      this.stopTimer();
      this.options.events.idle?.();
    }
  }

  private silence(line: Line): void {
    if (line.audibleTimer) clearTimeout(line.audibleTimer);
    line.audibleTimer = null;
    for (const node of line.nodes) {
      try {
        node.stop(0);
      } catch {
        // already stopped
      }
      node.disconnect();
    }
    line.nodes = [];
  }

  private ensureTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.pump(), TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
