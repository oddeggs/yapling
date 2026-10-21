/**
 * The prototype's `@keyframes` as plain data, and worklets that sample them.
 *
 * Each CSS property becomes one or more channels (a transform splits into translate, scale,
 * rotate and skew channels), and each channel keeps only the keyframes that set it, as CSS does.
 * A stop's `easing` is the keyframe's own `animation-timing-function`; without one the segment
 * runs on the animation's easing (CSS applies the timing function per segment, between each pair
 * of keyframes, not across the whole animation). Channels interpolate independently.
 */
import { easeAt, type Easing } from './easing';

/** A value the prototype leaves to a CSS custom property (`var(--r,0deg)`), set per instance. */
export interface VarRef {
  readonly var: string;
  /** The value when the instance sets none. */
  readonly fallback: number;
}

/** A number, or a custom property the caller may supply. */
export type Num = number | VarRef;

/** CSS filter functions the prototype animates; a missing one is its identity. */
export interface FilterValue {
  readonly brightness?: number;
}

/** One `box-shadow` layer, in points. */
export interface KeyframeShadow {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly colour: string;
}

/**
 * Every channel and the value it holds. Translations are in points, or in percent of the
 * element's own box for the `Percent` channels (`translateX(100%)`); angles in degrees;
 * `letterSpacingEm` in em of the font size; `borderRadius` and `strokeDashoffset` in points.
 */
export interface ChannelValues {
  translateX: Num;
  translateY: Num;
  translateXPercent: Num;
  translateYPercent: Num;
  scaleX: Num;
  scaleY: Num;
  rotate: Num;
  rotateY: Num;
  skewY: Num;
  /** CSS `perspective()` before a 3D turn: apply it as the view's perspective, then the transform. */
  perspective: Num;
  opacity: Num;
  borderRadius: Num;
  strokeDashoffset: Num;
  letterSpacingEm: Num;
  filter: FilterValue;
  /** Every layer of a `box-shadow`, outermost last as CSS lists them. */
  boxShadow: readonly KeyframeShadow[];
  /** A CSS `clip-path` as written (`circle(0% at 50% 62%)`); the hub's iris and wipe. */
  clipPath: string;
}

export type Channel = keyof ChannelValues;

export type TransformChannel =
  | 'translateX'
  | 'translateY'
  | 'translateXPercent'
  | 'translateYPercent'
  | 'scaleX'
  | 'scaleY'
  | 'rotate'
  | 'rotateY'
  | 'skewY';

export type NumericChannel =
  | TransformChannel
  | 'perspective'
  | 'opacity'
  | 'borderRadius'
  | 'strokeDashoffset'
  | 'letterSpacingEm';

/**
 * The value of a channel where a keyframe leaves it unset (CSS uses the element's own value: the
 * identity for transforms and opacity, square corners for the screens the zoom animates).
 */
export const identity: Readonly<Partial<Record<NumericChannel, number>>> = {
  translateX: 0,
  translateY: 0,
  translateXPercent: 0,
  translateYPercent: 0,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  rotateY: 0,
  skewY: 0,
  perspective: 0,
  opacity: 1,
  borderRadius: 0,
};

/** One keyframe of one channel: `at` is the offset 0–1. */
export interface Stop<V> {
  readonly at: number;
  readonly value: V;
  readonly easing?: Easing;
}

export type Track<C extends Channel> = readonly Stop<ChannelValues[C]>[];

export type Tracks = { readonly [C in Channel]?: Track<C> };

export interface Keyframes {
  /** The prototype's `@keyframes` name, for tracing a token back to the design. */
  readonly name: string;
  /** The transform channels in the order the prototype composes them (outermost first). */
  readonly transform: readonly TransformChannel[];
  readonly tracks: Tracks;
}

/** An animation the prototype plays: keyframes and the timing of its `animation` shorthand. */
export interface Animation {
  readonly keyframes: Keyframes;
  readonly durationMs: number;
  /** A negative delay starts part-way through, as in CSS. */
  readonly delayMs: number;
  /** The animation's timing function: segments without their own easing run on it. */
  readonly easing: Easing;
  /** `Infinity` for a loop. */
  readonly iterations: number;
  /** What shows outside the active time: `both` holds the first frame before and the last after. */
  readonly fill: 'none' | 'both';
  /** Siblings that play it one after another: the n-th (from 0) starts `delayMs + n * staggerMs` in. */
  readonly staggerMs?: number;
  /**
   * A per-instance start offset so a crowd never moves in step: the delay becomes
   * `delayMs - r * jitterMs` for one `r` in [0, 1) per instance.
   */
  readonly jitterMs?: number;
}

/** Custom property values for keyframes that use `var(--name)`. */
export type Vars = Readonly<Record<string, number>>;

function num(value: Num, vars: Vars | undefined): number {
  'worklet';
  if (typeof value === 'number') return value;
  return vars?.[value.var] ?? value.fallback;
}

/**
 * A numeric track at `progress` (0–1 through one iteration). `easing` is the animation's own,
 * used where a stop has none.
 */
export function sampleTrack(
  track: readonly Stop<Num>[],
  progress: number,
  easing: Easing,
  vars?: Vars,
): number {
  'worklet';
  const first = track[0];
  if (first === undefined) throw new Error('empty track');
  if (progress <= first.at) return num(first.value, vars);
  for (let i = 1; i < track.length; i++) {
    const to = track[i];
    const from = track[i - 1];
    if (to === undefined || from === undefined) break;
    if (progress <= to.at) {
      const span = to.at - from.at;
      const local = span <= 0 ? 1 : (progress - from.at) / span;
      const eased = easeAt(from.easing ?? easing, local);
      const a = num(from.value, vars);
      return a + (num(to.value, vars) - a) * eased;
    }
  }
  const last = track[track.length - 1] ?? first;
  return num(last.value, vars);
}

const numericChannels: readonly NumericChannel[] = [
  'translateX',
  'translateY',
  'translateXPercent',
  'translateYPercent',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateY',
  'skewY',
  'perspective',
  'opacity',
  'borderRadius',
  'strokeDashoffset',
  'letterSpacingEm',
];

/** Every numeric channel of `keyframes` at `progress`; channels the keyframes never set are absent. */
export function sampleKeyframes(
  keyframes: Keyframes,
  progress: number,
  easing: Easing,
  vars?: Vars,
): Partial<Record<NumericChannel, number>> {
  'worklet';
  const out: Partial<Record<NumericChannel, number>> = {};
  for (const channel of numericChannels) {
    const track = keyframes.tracks[channel];
    if (track !== undefined) out[channel] = sampleTrack(track, progress, easing, vars);
  }
  return out;
}

/** A React Native transform entry. */
export type TransformEntry =
  | { translateX: number | `${number}%` }
  | { translateY: number | `${number}%` }
  | { scaleX: number }
  | { scaleY: number }
  | { rotate: `${number}deg` }
  | { rotateY: `${number}deg` }
  | { skewY: `${number}deg` };

export interface TransformOptions {
  vars?: Vars;
  /** The element's size: percent translations become points. Without it they stay percent strings. */
  box?: { readonly width: number; readonly height: number };
}

/** The keyframes' transform at `progress`, as a React Native `transform` array in the prototype's order. */
export function transformAt(
  keyframes: Keyframes,
  progress: number,
  easing: Easing,
  options: TransformOptions = {},
): TransformEntry[] {
  'worklet';
  const out: TransformEntry[] = [];
  for (const channel of keyframes.transform) {
    const track = keyframes.tracks[channel];
    const v =
      track === undefined
        ? (identity[channel] ?? 0)
        : sampleTrack(track, progress, easing, options.vars);
    switch (channel) {
      case 'translateX':
        out.push({ translateX: v });
        break;
      case 'translateY':
        out.push({ translateY: v });
        break;
      case 'translateXPercent':
        out.push({ translateX: options.box ? (v / 100) * options.box.width : `${v}%` });
        break;
      case 'translateYPercent':
        out.push({ translateY: options.box ? (v / 100) * options.box.height : `${v}%` });
        break;
      case 'scaleX':
        out.push({ scaleX: v });
        break;
      case 'scaleY':
        out.push({ scaleY: v });
        break;
      case 'rotate':
        out.push({ rotate: `${v}deg` });
        break;
      case 'rotateY':
        out.push({ rotateY: `${v}deg` });
        break;
      case 'skewY':
        out.push({ skewY: `${v}deg` });
        break;
    }
  }
  return out;
}

/**
 * Where `animation` is at `elapsedMs` after it was started: the progress through the current
 * iteration (0–1), or null when nothing shows (before the start or after the end without fill).
 * `r` is the instance's random number for `jitterMs`; `index` its place in a stagger.
 */
export function progressAt(
  animation: Animation,
  elapsedMs: number,
  r = 0,
  index = 0,
): number | null {
  'worklet';
  const delay =
    animation.delayMs + index * (animation.staggerMs ?? 0) - r * (animation.jitterMs ?? 0);
  const t = elapsedMs - delay;
  const fills = animation.fill === 'both';
  if (t < 0) return fills ? 0 : null;
  const total = animation.durationMs * animation.iterations;
  if (t >= total) return fills ? 1 : null;
  const iteration = Math.floor(t / animation.durationMs);
  return (t - iteration * animation.durationMs) / animation.durationMs;
}
