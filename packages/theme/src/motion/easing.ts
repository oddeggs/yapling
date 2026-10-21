/**
 * Timing curves. Plain data so a Reanimated worklet can read them: a cubic Bézier is the tuple
 * `[x1, y1, x2, y2]` exactly as the prototype's `cubic-bezier(...)` writes it (pass it to
 * `Easing.bezier(...curve)` for `withTiming`). The evaluators here are worklets, for sampling
 * keyframes inside one progress value.
 */

export type Bezier = readonly [x1: number, y1: number, x2: number, y2: number];

export type Easing = Bezier;

/** The CSS keyword curves, as the CSS Easing spec defines them. */
export const cssEasing = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
} as const satisfies Record<string, Bezier>;

/** Every `cubic-bezier()` the prototype uses, named by what it does. */
export const curves = {
  /** A screen pushed in from the right, or the one before it sliding back in (`.2,.8,.2,1`). */
  glide: [0.2, 0.8, 0.2, 1],
  /** The screen leaving to the right when going back (`.4,0,.6,1`). */
  glideOut: [0.4, 0, 0.6, 1],
  /** Sheets and panels rising into place: the rise transition, glass sheets, hints (`.2,.9,.25,1`). */
  rise: [0.2, 0.9, 0.25, 1],
  /** A sheet sinking away, accelerating (`.4,0,.8,.6`). */
  sink: [0.4, 0, 0.8, 0.6],
  /** A screen zooming in, landing with a hint of overshoot (`.2,.9,.25,1.1`). */
  zoom: [0.2, 0.9, 0.25, 1.1],
  /** The house overshoot: sprouts and word objects popping, the roommate lifting (`.34,1.56,.64,1`). */
  pop: [0.34, 1.56, 0.64, 1],
  /** Paper flying in and landing: the letter, postcard, voicemail, residency card, keepsake (`.2,.8,.3,1`). */
  fly: [0.2, 0.8, 0.3, 1],
  /** The picked roommate jumping for joy (`.3,.7,.4,1`). */
  jump: [0.3, 0.7, 0.4, 1],
  /** The hub's moving van crossing the town (`.45,0,.35,1`). */
  van: [0.45, 0, 0.35, 1],
  /** The hub's iris opening onto a scene (`.5,0,.2,1`). */
  iris: [0.5, 0, 0.2, 1],
  /** The hub's wipe revealing a scene (`.6,0,.35,1`). */
  wipe: [0.6, 0, 0.35, 1],
} as const satisfies Record<string, Bezier>;

/**
 * The value of the Bézier `[x1, y1, x2, y2]` at time `t` (0–1): solves x(s) = t (Newton steps,
 * then bisection), returns y(s). Like CSS, `t` outside 0–1 extends the end tangents.
 */
export function bezierAt(curve: Bezier, t: number): number {
  'worklet';
  const [x1, y1, x2, y2] = curve;
  if (t <= 0) {
    if (x1 > 0) return (y1 / x1) * t;
    if (y1 === 0 && x2 > 0) return (y2 / x2) * t;
    return 0;
  }
  if (t >= 1) {
    if (x2 < 1) return 1 + ((y2 - 1) / (x2 - 1)) * (t - 1);
    if (y2 === 1 && x1 < 1) return 1 + ((y1 - 1) / (x1 - 1)) * (t - 1);
    return 1;
  }
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const xAt = (s: number) => ((ax * s + bx) * s + cx) * s;
  let s = t;
  for (let i = 0; i < 8; i++) {
    const err = xAt(s) - t;
    if (Math.abs(err) < 1e-7) return ((ay * s + by) * s + cy) * s;
    const slope = (3 * ax * s + 2 * bx) * s + cx;
    if (Math.abs(slope) < 1e-6) break;
    s -= err / slope;
  }
  let lo = 0;
  let hi = 1;
  s = t;
  for (let i = 0; i < 40; i++) {
    const x = xAt(s);
    if (Math.abs(x - t) < 1e-7) break;
    if (x < t) lo = s;
    else hi = s;
    s = (lo + hi) / 2;
  }
  return ((ay * s + by) * s + cy) * s;
}

/** Any easing at time `t` (0–1). */
export function easeAt(easing: Easing, t: number): number {
  'worklet';
  return bezierAt(easing, t);
}
