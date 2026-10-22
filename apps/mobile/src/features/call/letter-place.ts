import { layout as space } from '@yapling/theme';

import type { BubbleSpot, LetterSpots } from './scene-layout';

/*
 * Where the letter lies on the call's frame. It never covers a face or the bubble on screen: it
 * opens in whichever home the bubble isn't using (on the counter left of the roommate while the
 * host or the office speaks up top, under the pill while the roommate's bubble is low), gives way
 * by tucking into the counter's corner when a bubble comes to its home, and scrolls when the phone
 * is too short for all of it.
 */

export type LetterHome = 'low' | 'high';

/** The bubble's half of the frame: up top (the host, the office) or low (the roommate). */
export type BubbleBand = LetterHome;

/** What the letter's place depends on, in points on this phone. */
export interface LetterFrame {
  /** Points per frame point. */
  readonly k: number;
  readonly width: number;
  /** The speaker pill's bottom edge, or the phone pill's under it. */
  readonly topBound: number;
  /** The top of the cards stacked over the call bar (the bar itself when nothing else shows). */
  readonly bottomBound: number;
}

/** The open letter's box: its top-left, its width and how tall it may grow before it scrolls. */
export interface LetterBox {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly maxHeight: number;
}

/** Clearance between the letter and the pill above it or the cards below it. */
const GAP = 12;
/** The least the letter shows when the phone is short: a line, then it scrolls. */
const MIN_HEIGHT = 56;

export const bandOf = (spots: LetterSpots, bubble: BubbleSpot): BubbleBand =>
  bubble.top >= spots.lowBand ? 'low' : 'high';

/** The home that leaves the bubble on screen alone (the counter when there is none). */
export const homeFor = (band: BubbleBand | null): LetterHome => (band === 'low' ? 'high' : 'low');

/** A bubble arriving in the letter's home sends it to its corner. */
export const collides = (home: LetterHome, band: BubbleBand | null): boolean => band === home;

export function letterBox(spots: LetterSpots, home: LetterHome, f: LetterFrame): LetterBox {
  const left = space.marginCard;
  if (home === 'high') {
    const top = f.topBound + GAP;
    return {
      top,
      left,
      width: f.width - 2 * left,
      maxHeight: Math.max(MIN_HEIGHT, spots.high.bottom * f.k - top),
    };
  }
  const top = spots.low.top * f.k;
  return {
    top,
    left,
    width: spots.low.right * f.k - left,
    maxHeight: Math.max(MIN_HEIGHT, f.bottomBound - GAP - top),
  };
}

/** The tucked letter's place: the low home's corner. */
export const peekSpot = (spots: LetterSpots, k: number) => ({
  top: spots.low.top * k,
  left: space.marginCard,
});

/** The scale that shrinks a letter of `width` into the peek. */
export const peekScale = (spots: LetterSpots, width: number): number =>
  width > 0 ? Math.min(1, spots.peekWidth / width) : 1;
