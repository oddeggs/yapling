import { levelDb } from './pcm';

/*
 * A small on-device voice activity detector over 20 ms frames: frame energy against an adaptive
 * noise floor, with hysteresis and hangover. It runs on the echo-cancelled mic, and raises its
 * threshold while a character is speaking (residual echo must not count as the learner).
 *
 * It drives the call screen's listening state and stamps where the learner's speech ended, which
 * is the start of the latency measurement. The call itself decides turns.
 */

export interface VadConfig {
  readonly frameMs: number;
  /** Voiced frames in a row before speech starts. */
  readonly startFrames: number;
  /** Unvoiced time after the last voiced frame before speech ends. */
  readonly hangoverMs: number;
  /** dB above the noise floor to start speech, and to keep it going (hysteresis). */
  readonly startSnrDb: number;
  readonly continueSnrDb: number;
  /** A frame quieter than this is never speech, whatever the floor. */
  readonly minSpeechDb: number;
  /** The floor's starting value and its limits. */
  readonly initialFloorDb: number;
  readonly floorMinDb: number;
  readonly floorMaxDb: number;
  /** How fast the floor falls to a quieter frame (0–1 per frame) and rises (dB per second). */
  readonly floorFallRate: number;
  readonly floorRiseDbPerSec: number;
  /**
   * The floor rises toward the quietest frame of this window. Speech always has quiet gaps between
   * words, so the floor stays put while someone talks, but climbs to a steady noise (a fan, a café).
   */
  readonly floorWindowMs: number;
  /** Extra threshold while a character is speaking. */
  readonly echoGuardDb: number;
}

export const DEFAULT_VAD: VadConfig = {
  frameMs: 20,
  startFrames: 3,
  hangoverMs: 240,
  startSnrDb: 12,
  continueSnrDb: 7,
  minSpeechDb: -52,
  initialFloorDb: -60,
  floorMinDb: -85,
  floorMaxDb: -35,
  floorFallRate: 0.25,
  floorRiseDbPerSec: 6,
  floorWindowMs: 1500,
  echoGuardDb: 8,
};

export type VadEvent =
  | { readonly type: 'speech_start'; /** Start of the first voiced frame. */ readonly atMs: number }
  | { readonly type: 'speech_end'; /** End of the last voiced frame. */ readonly atMs: number };

export interface VadFrameResult {
  readonly db: number;
  readonly voiced: boolean;
  readonly speaking: boolean;
  readonly event: VadEvent | null;
}

export class Vad {
  private floor: number;
  private run = 0;
  private runStartMs = 0;
  private speakingNow = false;
  private lastVoicedEndMs = 0;
  private echoGuard = false;
  private readonly recent: number[] = [];

  constructor(private readonly config: VadConfig = DEFAULT_VAD) {
    this.floor = config.initialFloorDb;
  }

  get speaking(): boolean {
    return this.speakingNow;
  }

  get noiseFloorDb(): number {
    return this.floor;
  }

  /** While a character speaks, require more energy. */
  setEchoGuard(on: boolean): void {
    this.echoGuard = on;
  }

  /** Feeds one frame that starts at `startMs` (any monotonic ms clock). */
  push(frame: Float32Array | Int16Array, startMs: number): VadFrameResult {
    const c = this.config;
    const db = levelDb(frame);
    const guard = this.echoGuard ? c.echoGuardDb : 0;
    const snr = db - this.floor;
    const need = (this.speakingNow ? c.continueSnrDb : c.startSnrDb) + guard;
    const voiced = db >= c.minSpeechDb + guard && snr >= need;
    const endMs = startMs + c.frameMs;
    let event: VadEvent | null = null;

    if (voiced) {
      if (this.run === 0) this.runStartMs = startMs;
      this.run += 1;
      this.lastVoicedEndMs = endMs;
      if (!this.speakingNow && this.run >= c.startFrames) {
        this.speakingNow = true;
        event = { type: 'speech_start', atMs: this.runStartMs };
      }
    } else {
      this.run = 0;
      if (this.speakingNow && endMs - this.lastVoicedEndMs >= c.hangoverMs) {
        this.speakingNow = false;
        event = { type: 'speech_end', atMs: this.lastVoicedEndMs };
      }
    }

    this.adaptFloor(db);
    return { db, voiced, speaking: this.speakingNow, event };
  }

  /** Forces the end of speech now (the learner let go of the mic). */
  forceEnd(): VadEvent | null {
    if (!this.speakingNow) return null;
    this.speakingNow = false;
    this.run = 0;
    return { type: 'speech_end', atMs: this.lastVoicedEndMs };
  }

  /** The end of the last voiced frame, or null before any speech. */
  get lastVoicedMs(): number | null {
    return this.lastVoicedEndMs > 0 ? this.lastVoicedEndMs : null;
  }

  private adaptFloor(db: number): void {
    const c = this.config;
    this.recent.push(db);
    if (this.recent.length > c.floorWindowMs / c.frameMs) this.recent.shift();
    if (db < this.floor) {
      this.floor += (db - this.floor) * c.floorFallRate;
    } else {
      const quietest = Math.min(...this.recent);
      if (quietest > this.floor) {
        this.floor += Math.min(quietest - this.floor, (c.floorRiseDbPerSec * c.frameMs) / 1000);
      }
    }
    this.floor = Math.max(c.floorMinDb, Math.min(c.floorMaxDb, this.floor));
  }
}
