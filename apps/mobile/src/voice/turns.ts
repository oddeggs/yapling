import type { TurnMode } from '@yapling/contracts';

import { DEFAULT_MIC_CHUNK_MS, MIC_FRAME_MS, MicChunker } from './framing';
import type { VadEvent } from './vad';

/*
 * Turn-taking on the phone. Hands-free streams the mic all the time and the call decides when the
 * learner is done. Hold-to-talk streams only while the mic button is held, starting with a short
 * pre-roll (so the first syllable isn't lost to a late press) and, if the learner is still
 * speaking at release, a tail until they stop (never cut off mid-word); then `end_turn`.
 *
 * A press shorter than `MIN_HOLD_MS` is a tap, not a turn: its audio is held back on the phone
 * until the press is long enough, and a tap's is dropped unsent (nothing reaches the call, no try
 * counts), so the learner can be shown how to hold.
 */

/** The shortest press that is a turn. */
export const MIN_HOLD_MS = 2_000;

/** How a release ended: a turn for the call, or a tap too short to be one. */
export type Release = 'turn' | 'tap';

export interface TurnOutput {
  sendMic(pcm: Uint8Array): void;
  endTurn(): void;
}

export interface TurnOptions {
  readonly chunkMs?: number;
  /** Mic kept from before a press. */
  readonly prerollMs?: number;
  /** Longest tail after a release while the learner is still speaking. */
  readonly maxTailMs?: number;
  /** The shortest press that is a turn (`MIN_HOLD_MS`). */
  readonly minHoldMs?: number;
  /** The clock presses are timed on, in ms. */
  readonly now?: () => number;
}

export class TurnTaker {
  private readonly chunker: MicChunker;
  private readonly preroll: Int16Array[] = [];
  private readonly prerollFrames: number;
  private readonly maxTailFrames: number;
  private readonly minHoldMs: number;
  private readonly now: () => number;
  private held = false;
  private pressedAt = 0;
  /** A press's audio held back until the press is long enough to be a turn; null once live. */
  private early: Int16Array[] | null = null;
  /** Frames left in the tail after a release; -1 when not in a tail. */
  private tailLeft = -1;

  constructor(
    private modeNow: TurnMode,
    private readonly out: TurnOutput,
    options: TurnOptions = {},
  ) {
    this.chunker = new MicChunker(options.chunkMs ?? DEFAULT_MIC_CHUNK_MS);
    this.prerollFrames = Math.round((options.prerollMs ?? 200) / MIC_FRAME_MS);
    this.maxTailFrames = Math.round((options.maxTailMs ?? 600) / MIC_FRAME_MS);
    this.minHoldMs = options.minHoldMs ?? MIN_HOLD_MS;
    this.now = options.now ?? (() => performance.now());
  }

  get mode(): TurnMode {
    return this.modeNow;
  }

  /** True while the mic button is down or a release tail is still streaming. */
  get streaming(): boolean {
    return this.modeNow === 'hands_free' || this.held || this.tailLeft >= 0;
  }

  get isHeld(): boolean {
    return this.held;
  }

  /** One 20 ms mic frame, with the VAD's view of it. */
  frame(frame: Int16Array, speaking: boolean, event: VadEvent | null): void {
    if (this.modeNow === 'hands_free') {
      this.emit(frame);
      return;
    }
    if (this.held) {
      if (this.early === null) {
        this.emit(frame);
        return;
      }
      this.early.push(frame);
      if (this.now() - this.pressedAt >= this.minHoldMs) this.goLive();
      return;
    }
    if (this.tailLeft >= 0) {
      this.emit(frame);
      this.tailLeft -= 1;
      if (!speaking || event?.type === 'speech_end' || this.tailLeft < 0) this.finishTurn();
      return;
    }
    this.preroll.push(frame);
    if (this.preroll.length > this.prerollFrames) this.preroll.shift();
  }

  /** The mic button went down. */
  press(): void {
    if (this.modeNow !== 'hold_to_talk' || this.held) return;
    if (this.tailLeft >= 0) this.finishTurn();
    this.held = true;
    this.pressedAt = this.now();
    this.early = this.preroll.splice(0);
    if (this.minHoldMs <= 0) this.goLive();
  }

  /**
   * The mic button came up; `speaking` is the VAD's state at release. A tap (shorter than the
   * shortest turn) is dropped unsent; null when no press was held.
   */
  release(speaking: boolean): Release | null {
    if (this.modeNow !== 'hold_to_talk' || !this.held) return null;
    this.held = false;
    if (this.early !== null) {
      if (this.now() - this.pressedAt < this.minHoldMs) {
        this.early = null;
        return 'tap';
      }
      this.goLive();
    }
    if (speaking) {
      this.tailLeft = this.maxTailFrames;
      return 'turn';
    }
    this.finishTurn();
    return 'turn';
  }

  /** Drops held audio (the socket went away or the call was interrupted). */
  reset(): void {
    this.chunker.clear();
    this.preroll.length = 0;
    this.early = null;
    this.held = false;
    this.tailLeft = -1;
  }

  setMode(mode: TurnMode): void {
    if (mode === this.modeNow) return;
    this.reset();
    this.modeNow = mode;
  }

  /** The press is long enough to be a turn: its held-back audio goes, and the rest streams. */
  private goLive(): void {
    const early = this.early ?? [];
    this.early = null;
    for (const f of early) this.emit(f);
  }

  private emit(frame: Int16Array): void {
    const chunk = this.chunker.push(frame);
    if (chunk) this.out.sendMic(chunk);
  }

  private finishTurn(): void {
    this.tailLeft = -1;
    const rest = this.chunker.flush();
    if (rest) this.out.sendMic(rest);
    this.out.endTurn();
  }
}

/**
 * The latency budget, measured on the phone: from the end of the learner's speech to the first
 * audible sample of the first character line (often a recorded reaction) and of the first
 * generated line after it.
 */
export class LatencyMeter {
  private speechEndMs: number | null = null;
  private seen = new Set<'recorded' | 'live'>();
  private readonly lags = new Map<number, number>();

  /** The learner started speaking again: the next turn's measurement starts over. */
  speechStarted(): void {
    this.speechEndMs = null;
    this.seen.clear();
  }

  /** The learner's speech ended at `perfMs` (the end of the last voiced frame). */
  speechEnded(perfMs: number): void {
    this.speechEndMs = perfMs;
    this.seen.clear();
  }

  get lastSpeechEndMs(): number | null {
    return this.speechEndMs;
  }

  /** A line's first sample will be heard at `audibleMs`; returns its lag when it counts. */
  lineScheduled(streamId: number, kind: 'recorded' | 'live', audibleMs: number): number | null {
    // The reaction is a recorded line before the reply; once the reply has played, later lines
    // (the next recorded beat) belong to no turn.
    if (this.speechEndMs === null || this.seen.has(kind) || this.seen.has('live')) return null;
    this.seen.add(kind);
    const lag = Math.max(0, Math.round(audibleMs - this.speechEndMs));
    this.lags.set(streamId, lag);
    return lag;
  }

  /** The lag to report in `played` for a stream, once. */
  takeLag(streamId: number): number | null {
    const lag = this.lags.get(streamId) ?? null;
    this.lags.delete(streamId);
    return lag;
  }
}
