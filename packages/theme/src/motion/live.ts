import { curves, type Bezier } from './easing';

/**
 * Curves for living art: a critter's idle and acting, which the prototype's CSS never needed. Where
 * the theme already has a curve that matches, it is reused (`arrive` is `curves.rise`, within 0.03
 * of the method's `0.23, 1, 0.32, 1` at every point); `travel` has no equivalent here (the nearest,
 * `curves.wipe`, is 0.08 away), so it is added.
 */
export const liveCurves = {
  /** Things that travel: a gaze, a sway, a head turning, a lid closing (`.77,0,.175,1`). */
  travel: [0.77, 0, 0.175, 1],
  /** Things that open or arrive: a lid reopening, a pose landing (the rise curve). */
  arrive: curves.rise,
} as const satisfies Record<string, Bezier>;
