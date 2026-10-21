import { makeMutable, useFrameCallback, type SharedValue } from 'react-native-reanimated';

import { lipsyncAt, type LipsyncSource } from './lipsync-clock';
import type { Mouth } from './visemes';

export { lipsyncAt, type LipsyncFrame, type LipsyncSource } from './lipsync-clock';

/*
 * The lipsync clock: which caption character and which mouth shape are audible now, computed on
 * the UI thread every frame from the playing line's timing and the audio clock. The player writes
 * `source` when a line starts and as a live line's audio and alignment arrive; the call screen and
 * the critter's mouth read `charIndex` and `mouth` in worklets.
 */

export interface Lipsync {
  readonly source: SharedValue<LipsyncSource | null>;
  /** How many caption characters are audible so far (the progressive caption's length). */
  readonly charIndex: SharedValue<number>;
  readonly mouth: SharedValue<Mouth>;
  /** The playing line's audible position in ms, -1 when nothing plays. */
  readonly streamMs: SharedValue<number>;
  /** The stream the values belong to, 0 when nothing plays. */
  readonly streamId: SharedValue<number>;
}

export function createLipsync(): Lipsync {
  return {
    source: makeMutable<LipsyncSource | null>(null),
    charIndex: makeMutable(0),
    mouth: makeMutable<Mouth>('rest'),
    streamMs: makeMutable(-1),
    streamId: makeMutable(0),
  };
}

/** Runs the lipsync clock on the UI thread while the screen that calls it is mounted. */
export function useLipsyncClock(lipsync: Lipsync): void {
  useFrameCallback(() => {
    'worklet';
    const f = lipsyncAt(lipsync.source.value, performance.now());
    if (lipsync.streamId.value !== f.streamId) lipsync.streamId.value = f.streamId;
    if (lipsync.charIndex.value !== f.charIndex) lipsync.charIndex.value = f.charIndex;
    if (lipsync.mouth.value !== f.mouth) lipsync.mouth.value = f.mouth;
    lipsync.streamMs.value = f.streamMs;
  });
}
