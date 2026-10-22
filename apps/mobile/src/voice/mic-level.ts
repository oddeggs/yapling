import { makeMutable, type SharedValue } from 'react-native-reanimated';

/*
 * How loud the learner is, 0–1, for the mic's bars while hands-free hears them: the frame's level
 * above the noise floor, rising at once and falling gently. Written on the JS thread per 20 ms
 * frame, read by the mic on the UI thread. Zero while nothing is being heard.
 */

/** dB above the floor that reads as no voice, and the span up to a full bar. */
const QUIET_DB = 6;
const SPAN_DB = 30;
/** Each frame keeps this much of the last level when the voice drops (about 150 ms to fade). */
const FALL = 0.85;

/** The level for a frame `db` loud over a noise floor of `floorDb`. */
export function levelOf(db: number, floorDb: number): number {
  return Math.max(0, Math.min(1, (db - floorDb - QUIET_DB) / SPAN_DB));
}

export class MicLevel {
  readonly value: SharedValue<number> = makeMutable(0);
  private last = 0;

  /** One frame; `heard` is false when the call isn't hearing the learner (the bars rest). */
  push(db: number, floorDb: number, heard: boolean): void {
    const target = heard ? levelOf(db, floorDb) : 0;
    const next = target >= this.last ? target : Math.max(target, this.last * FALL);
    const rounded = Math.round(next * 50) / 50;
    if (rounded === Math.round(this.last * 50) / 50) {
      this.last = next;
      return;
    }
    this.last = next;
    this.value.value = rounded;
  }
}
