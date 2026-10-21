import {
  cssEasing,
  progressAt,
  sampleTrack,
  screenKeyframes,
  transformAt,
  type Animation,
  type KeyframeShadow,
  type Stop,
} from '@yapling/theme';
import type { TransformsStyle } from 'react-native';

/**
 * Keyframe tokens sampled into styles, and what they become under Reduce Motion. Plain worklets
 * with no Reanimated import, so they run in tests exactly as on the UI thread.
 */

/** How long a finite animation runs, delay included (one cycle for a loop). */
export function totalMs(animation: Animation): number {
  'worklet';
  const iterations = Number.isFinite(animation.iterations) ? animation.iterations : 1;
  return Math.max(0, animation.delayMs) + animation.durationMs * iterations;
}

type TransformList = Exclude<NonNullable<TransformsStyle['transform']>, string>;

export interface KeyframeStyle {
  opacity: number;
  transform: TransformList;
}

/**
 * The opacity and transform of `animation` at `elapsedMs`. Percent translations (the toast's
 * `translate(-50%)` centring) are left to layout unless `box` is given. Before the start or after
 * the end without fill, the element rests untransformed; `hiddenOutside` hides it instead (a
 * sparkle between its bursts).
 */
export function keyframeStyle(
  animation: Animation,
  elapsedMs: number,
  options: { box?: { width: number; height: number }; hiddenOutside?: boolean } = {},
): KeyframeStyle {
  'worklet';
  const p = progressAt(animation, elapsedMs);
  if (p === null) return { opacity: options.hiddenOutside ? 0 : 1, transform: [] };
  const all = transformAt(
    animation.keyframes,
    p,
    animation.easing,
    options.box ? { box: options.box } : {},
  );
  const transform = (
    options.box
      ? all
      : all.filter((entry) => {
          const v =
            'translateX' in entry ? entry.translateX : 'translateY' in entry ? entry.translateY : 0;
          return typeof v === 'number';
        })
  ) as TransformList;
  const track = animation.keyframes.tracks.opacity;
  const opacity = track ? sampleTrack(track, p, animation.easing) : 1;
  return { opacity, transform };
}

/** The plain fade the design uses for lock screens and the safety sheet. */
const fade = screenKeyframes.fIn;

/**
 * An animation as it plays under the reader's Reduce Motion setting: unchanged with it off. With
 * it on, nothing moves: an animation that fades as it moves keeps only its fade, an entrance that
 * only moves (a pop, a fly-in) becomes a plain fade over the same time, and a loop that only
 * moves (a sway, a bounce, a sparkle) holds still (null).
 */
export function calm(animation: Animation, reduce: boolean): Animation | null {
  'worklet';
  if (!reduce) return animation;
  const { keyframes } = animation;
  if (keyframes.transform.length === 0) return animation;
  const opacity = keyframes.tracks.opacity;
  if (opacity !== undefined) {
    return { ...animation, keyframes: { ...keyframes, transform: [], tracks: { opacity } } };
  }
  if (!Number.isFinite(animation.iterations)) return null;
  return { ...animation, keyframes: fade, easing: cssEasing.ease };
}

/** A ring of colour around a circle: a `box-shadow` layer with spread and no blur. */
export interface GlowTracks {
  readonly spread: readonly Stop<number>[];
  readonly alpha: readonly Stop<number>[];
}

const alphaOf = (colour: string): number => {
  const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(colour);
  return m?.[1] === undefined ? 1 : Number(m[1]);
};

/**
 * A `box-shadow` track's spread ring (the layer with a spread, such as the mic's glow) as two
 * numeric tracks, read once on the JS thread so the UI thread samples plain numbers.
 */
export function glowTracks(track: readonly Stop<readonly KeyframeShadow[]>[]): GlowTracks {
  const ring = (stop: Stop<readonly KeyframeShadow[]>) =>
    stop.value.find((layer) => layer.spread > 0) ?? { spread: 0, colour: 'rgba(0,0,0,0)' };
  return {
    spread: track.map((stop) => ({
      at: stop.at,
      value: ring(stop).spread,
      ...(stop.easing ? { easing: stop.easing } : {}),
    })),
    alpha: track.map((stop) => ({
      at: stop.at,
      value: alphaOf(ring(stop).colour),
      ...(stop.easing ? { easing: stop.easing } : {}),
    })),
  };
}
