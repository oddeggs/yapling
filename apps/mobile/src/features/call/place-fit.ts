import type { CastSpot } from './scene-layout';

/*
 * Keeping a critter's face clear of the cards over the call bar. A spot marked `clear` (Pip on the
 * rug for Pip's minute, Pip at the meeting) rises when the stack of cards grows up to its face,
 * never higher than the line above it (the bubble, or the pill when no line shows), and settles
 * back when the cards go. Frame points times the screen's scale, as the cast is placed.
 */

/** What the lift depends on, in points on this phone. */
export interface FitFrame {
  /** Points per frame point. */
  readonly k: number;
  /** The bottom of whatever sits above the stage's faces (the bubble, else the pill). */
  readonly topBound: number;
  /** The top of the cards stacked over the call bar (the bar itself when nothing else shows). */
  readonly bottomBound: number;
}

/**
 * The face's band in a critter's box (`size` × `1.2 size`), brows to chin, as shares of its height
 * (the generator's bean: brows at about 0.42, the mouth at about 0.74).
 */
export const FACE_BAND = { top: 0.4, bottom: 0.78 } as const;
/** Clearance between the face and the cards. */
const GAP = 10;

/** The face's top and bottom on this phone, in points. */
export function faceOf(spot: CastSpot, k: number): { top: number; bottom: number } {
  const h = spot.size * 1.2 * k;
  const top = spot.top * k;
  return { top: top + FACE_BAND.top * h, bottom: top + FACE_BAND.bottom * h };
}

/** How far up (points, ≥ 0) a spot moves to keep its face clear; 0 for spots not marked `clear`. */
export function liftFor(spot: CastSpot, f: FitFrame): number {
  if (!spot.clear) return 0;
  const face = faceOf(spot, f.k);
  const need = face.bottom + GAP - f.bottomBound;
  if (need <= 0) return 0;
  const room = face.top - f.topBound;
  return Math.max(0, Math.min(need, room));
}
