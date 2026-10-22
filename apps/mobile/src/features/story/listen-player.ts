import {
  AudioContext,
  AudioManager,
  type AudioBuffer,
  type AudioBufferSourceNode,
} from 'react-native-audio-api';

import { VoiceSession } from '../../../modules/voice-session';
import { storyRecordedLines, trackFromTiming, localVisemeTrack } from '../../voice';
import { createLipsync, type Lipsync, type LipsyncSource } from '../../voice/lipsync';
import type { Segment } from '../../voice/playout';

/*
 * Plays a story's recorded lines on the phone, with no call: the voice engine's bundled lines and
 * its caption clock (the lipsync shared values, read on the UI thread), plus a pause for "Chờ
 * chút". A playback-only audio session, so the story plays alongside nothing else and never
 * opens the mic.
 */

export interface ListenPlayerEvents {
  /** A line's last sample has been heard. */
  readonly ended: (lineId: string) => void;
  readonly failed: (lineId: string, reason: string) => void;
}

/** Start a line this far ahead of the clock. */
const LEAD_S = 0.05;
const TICK_MS = 50;

interface Playing {
  readonly lineId: string;
  readonly streamId: number;
  readonly node: AudioBufferSourceNode;
  readonly source: LipsyncSource;
  readonly endCtx: number;
}

export class ListenPlayer {
  readonly lipsync: Lipsync = createLipsync();
  private context: AudioContext | null = null;
  private readonly decoded = new Map<string, Promise<AudioBuffer>>();
  private playing: Playing | null = null;
  private paused = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stream = 0;
  private disposed = false;

  constructor(private readonly events: ListenPlayerEvents) {}

  /** The playback session and the audio graph. */
  async start(): Promise<void> {
    if (this.context) return;
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playback',
      iosMode: 'spokenAudio',
      iosOptions: [],
    });
    await AudioManager.setAudioSessionActivity(true);
    const context = new AudioContext();
    await context.resume();
    if (this.disposed) {
      await context.close().catch(() => undefined);
      return;
    }
    this.context = context;
  }

  /** Decodes lines ahead of need. */
  preload(lineIds: readonly string[]): void {
    for (const id of lineIds) void this.decode(id).catch(() => undefined);
  }

  /** Plays a recorded line from its start; the caption clock follows it. */
  async play(lineId: string): Promise<void> {
    const context = this.context;
    const asset = storyRecordedLines(lineId);
    if (!context || !asset) {
      this.events.failed(lineId, 'not playable');
      return;
    }
    this.stopCurrent();
    let buffer: AudioBuffer;
    try {
      buffer = await this.decode(lineId);
    } catch (e) {
      this.events.failed(lineId, String(e));
      return;
    }
    if (this.disposed) return;
    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(context.destination);
    const start = context.currentTime + LEAD_S;
    node.start(start);
    const durationMs = buffer.duration * 1000;
    const segment: Segment = { seq: 1, ctxStart: start, streamMs: 0, durationMs };
    const track = asset.timing ? trackFromTiming(asset.timing) : null;
    this.stream += 1;
    const source: LipsyncSource = {
      streamId: this.stream,
      track: track ?? { text: '', startMs: [], endMs: [] },
      visemes: localVisemeTrack(track ?? { text: '', startMs: [], endMs: [] }),
      segments: [segment],
      anchor: { ctx: context.currentTime, perfMs: performance.now() },
      outputLatencyS: this.outputLatency(),
    };
    const playing: Playing = {
      lineId,
      streamId: this.stream,
      node,
      source,
      endCtx: start + buffer.duration,
    };
    this.playing = playing;
    // The node's own end, in case the graph's clock and the timer disagree.
    node.onEnded = () => setTimeout(() => this.finish(playing), this.outputLatency() * 1000);
    this.lipsync.source.value = source;
    if (this.paused) await this.holdClock(context);
    this.ensureTimer();
  }

  /** "Chờ chút": the line stops where it is and the caption holds. */
  async pause(): Promise<void> {
    const context = this.context;
    if (this.paused || !context) return;
    this.paused = true;
    await this.holdClock(context);
  }

  /** Carries on from where the line paused. */
  async resume(): Promise<void> {
    const context = this.context;
    if (!this.paused || !context) return;
    this.paused = false;
    await context.resume();
    const p = this.playing;
    if (p) {
      // The graph's clock stood still while suspended; pair it with the host clock again.
      this.lipsync.source.value = {
        ...p.source,
        anchor: { ctx: context.currentTime, perfMs: performance.now() },
      };
    }
  }

  get isPaused(): boolean {
    return this.paused;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.stopCurrent();
    this.stopTimer();
    this.decoded.clear();
    const ctx = this.context;
    this.context = null;
    if (ctx) await ctx.close().catch(() => undefined);
    try {
      await AudioManager.setAudioSessionActivity(false);
    } catch {
      // Another player still holds the session.
    }
  }

  /** Freezes the caption at what has been heard, then suspends the graph. */
  private async holdClock(context: AudioContext): Promise<void> {
    const seg = this.playing?.source.segments[0];
    if (this.playing && seg) {
      const heardS = Math.max(0, context.currentTime - this.outputLatency() - seg.ctxStart);
      // A segment cut at the pause: the clock holds at its end until the line resumes.
      this.lipsync.source.value = {
        ...this.playing.source,
        segments: [{ ...seg, durationMs: Math.min(seg.durationMs, heardS * 1000) }],
      };
    }
    await context.suspend();
  }

  private decode(lineId: string): Promise<AudioBuffer> {
    const cached = this.decoded.get(lineId);
    if (cached) return cached;
    const asset = storyRecordedLines(lineId);
    const context = this.context;
    if (!asset || !context) return Promise.reject(new Error(`no recorded line ${lineId}`));
    const p = context.decodeAudioData(asset.audio);
    this.decoded.set(lineId, p);
    p.catch(() => this.decoded.delete(lineId));
    return p;
  }

  private tick(): void {
    const context = this.context;
    const p = this.playing;
    if (!context || !p) {
      this.stopTimer();
      return;
    }
    if (context.state !== 'running' && !this.paused) {
      // The graph stopped under us (the session changed, an engine rebuild): start it again.
      this.restart(context);
      return;
    }
    if (context.currentTime < p.endCtx + this.outputLatency()) return;
    this.finish(p);
  }

  private restarting = false;

  private restart(context: AudioContext): void {
    if (this.restarting) return;
    this.restarting = true;
    void context
      .resume()
      .then(() => {
        const p = this.playing;
        if (p && !this.paused) {
          this.lipsync.source.value = {
            ...p.source,
            anchor: { ctx: context.currentTime, perfMs: performance.now() },
          };
        }
      })
      .catch(() => undefined)
      .finally(() => {
        this.restarting = false;
      });
  }

  /** The line's last sample was heard (by the clock, or the node saying it ended). */
  private finish(p: Playing): void {
    if (this.playing !== p) return;
    this.playing = null;
    this.stopTimer();
    this.events.ended(p.lineId);
  }

  private stopCurrent(): void {
    const p = this.playing;
    this.playing = null;
    if (!p) return;
    p.node.onEnded = null;
    try {
      p.node.stop(0);
    } catch {
      // already stopped
    }
    p.node.disconnect();
    this.lipsync.source.value = null;
  }

  private outputLatency(): number {
    const s = VoiceSession?.status();
    return s ? s.outputLatency + s.ioBufferDuration : 0.02;
  }

  private ensureTimer(): void {
    this.timer ??= setInterval(() => this.tick(), TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
