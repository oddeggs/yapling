import { DEFAULT_MIC_CHUNK_MS, MIC_FRAME_MS, MicChunker } from './framing';
import type { VadEvent } from './vad';

/*
 * Hands-free listening on the phone. The mic runs all the time, but the call hears only speech:
 * while the learner thinks, nothing is sent (Scribe bills every second it hears, so quiet would
 * cost as much as talk). A short pre-roll kept on the phone goes up with the first syllable, and
 * after the learner stops, a tail streams long enough for the call to wait out a mid-sentence
 * pause (its patient holds) before the gate closes again.
 *
 * The gate tells the call where speech starts and ends (`speech`), from the echo-cancelled VAD.
 * The call decides when the turn is over; a tap on the mic ("I'm done") ends it at once
 * (`endTurn`). While a character speaks the gate stays shut, and it opens again only after the
 * line's echo has settled: barge-in isn't offered, so the character's own voice can never start
 * a turn.
 */

export interface GateOutput {
  sendMic(pcm: Uint8Array): void;
  /**
   * The learner started or stopped speaking, `backMs` before the end of the audio sent so far (a
   * start goes before its pre-roll, at 0).
   */
  speech(state: 'start' | 'end', backMs: number): void;
  /** The learner said they're done. */
  endTurn(): void;
}

export interface GateOptions {
  readonly chunkMs?: number;
  /** Mic kept from before speech starts, sent with it. */
  readonly prerollMs?: number;
  /**
   * How long the gate keeps streaming after speech ends: longer than the call's longest hold, so
   * it can time the pause on the audio, and short enough that a turn costs a few seconds at most.
   */
  readonly tailMs?: number;
  /** Quiet kept after a character's line before listening again (the echo dies away). */
  readonly settleMs?: number;
  /** Diagnostics: what was sent of what was heard, now and then. */
  readonly log?: (message: string) => void;
}

export const HANDS_FREE_GATE = {
  prerollMs: 400,
  tailMs: 4_500,
  settleMs: 300,
} as const;

/** How often the gate logs what it sent, in ms of mic heard. */
const LOG_EVERY_MS = 15_000;

export type GateState = 'idle' | 'speech' | 'tail';

export class HandsFreeGate {
  private readonly chunker: MicChunker;
  private readonly preroll: Int16Array[] = [];
  private readonly prerollFrames: number;
  private readonly tailFrames: number;
  private readonly settleFrames: number;
  private stateNow: GateState = 'idle';
  private tailLeft = 0;
  private settleLeft = 0;
  private open = true;
  /** Mic audio sent, and mic audio heard, in ms (for the idle-cost check). */
  sentMs = 0;
  heardMs = 0;

  private readonly log: ((message: string) => void) | null;

  constructor(
    private readonly out: GateOutput,
    options: GateOptions = {},
  ) {
    this.log = options.log ?? null;
    this.chunker = new MicChunker(options.chunkMs ?? DEFAULT_MIC_CHUNK_MS);
    this.prerollFrames = Math.round(
      (options.prerollMs ?? HANDS_FREE_GATE.prerollMs) / MIC_FRAME_MS,
    );
    this.tailFrames = Math.round((options.tailMs ?? HANDS_FREE_GATE.tailMs) / MIC_FRAME_MS);
    this.settleFrames = Math.round((options.settleMs ?? HANDS_FREE_GATE.settleMs) / MIC_FRAME_MS);
  }

  get state(): GateState {
    return this.stateNow;
  }

  /** Audio is going to the call (speech, or the pause after it). */
  get streaming(): boolean {
    return this.stateNow !== 'idle';
  }

  /** The learner has spoken since the gate opened: a tap would end a turn. */
  get inTurn(): boolean {
    return this.stateNow !== 'idle';
  }

  /**
   * Whether the gate may listen: off while a character's line plays. Turning off mid-speech tells
   * the call the speech ended there and sends nothing more (the turn was already answered).
   */
  setListening(on: boolean): void {
    if (on === this.open) return;
    this.open = on;
    if (on) {
      this.settleLeft = this.settleFrames;
      this.preroll.length = 0;
      return;
    }
    if (this.stateNow === 'speech') this.out.speech('end', 0);
    this.close();
  }

  /**
   * One 20 ms mic frame, with the VAD's view of it: `speaking` and its event, and `endMs`, when the
   * frame's last sample was captured (on the VAD's clock).
   */
  frame(frame: Int16Array, endMs: number, speaking: boolean, event: VadEvent | null): void {
    this.heardMs += MIC_FRAME_MS;
    if (this.log && this.heardMs % LOG_EVERY_MS === 0)
      this.log(`hands-free mic: ${this.sentMs / 1000} s sent of ${this.heardMs / 1000} s heard`);
    if (!this.open) return;
    if (this.settleLeft > 0) {
      this.settleLeft -= 1;
      // Already speaking as the line ends (the learner, the echo long gone): listen from here.
      if (this.settleLeft > 0 || !speaking) return;
      this.start(frame);
      return;
    }
    switch (this.stateNow) {
      case 'idle':
        if (event?.type === 'speech_start') {
          this.start(frame);
          return;
        }
        this.preroll.push(frame);
        if (this.preroll.length > this.prerollFrames) this.preroll.shift();
        return;
      case 'speech':
        this.emit(frame);
        if (event?.type === 'speech_end') {
          this.flush();
          this.out.speech('end', Math.max(0, endMs - event.atMs));
          this.stateNow = 'tail';
          this.tailLeft = this.tailFrames;
        }
        return;
      case 'tail':
        if (event?.type === 'speech_start') {
          this.flush();
          this.out.speech('start', 0);
          this.stateNow = 'speech';
          this.emit(frame);
          return;
        }
        this.emit(frame);
        this.tailLeft -= 1;
        if (this.tailLeft <= 0) this.close();
        return;
    }
  }

  /**
   * The learner tapped the mic: the turn ends now. False when they haven't said anything yet (a
   * tap while thinking does nothing).
   */
  finish(): boolean {
    if (this.stateNow === 'idle') return false;
    const speaking = this.stateNow === 'speech';
    this.flush();
    if (speaking) this.out.speech('end', 0);
    this.out.endTurn();
    this.close();
    return true;
  }

  /** Drops held audio (the socket went away, or the mode changed). */
  reset(): void {
    this.chunker.clear();
    this.preroll.length = 0;
    this.stateNow = 'idle';
    this.tailLeft = 0;
    this.settleLeft = 0;
  }

  private start(current: Int16Array): void {
    this.out.speech('start', 0);
    this.stateNow = 'speech';
    for (const f of this.preroll.splice(0)) this.emit(f);
    this.emit(current);
  }

  private close(): void {
    this.flush();
    this.stateNow = 'idle';
    this.tailLeft = 0;
    this.preroll.length = 0;
  }

  private emit(frame: Int16Array): void {
    this.sentMs += MIC_FRAME_MS;
    const chunk = this.chunker.push(frame);
    if (chunk) this.out.sendMic(chunk);
  }

  private flush(): void {
    const rest = this.chunker.flush();
    if (rest) this.out.sendMic(rest);
  }
}
