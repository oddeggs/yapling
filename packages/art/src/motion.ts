import {
  critterMotion,
  progressAt,
  sampleTrack,
  type Animation,
  type Keyframes,
} from '@yapling/theme';

import type { Mood } from './critter';

/**
 * The blink of the prototype's screens: `blinkers` in `yap-dc.js` closes the eyes for 2 of every
 * 40 ticks of the screen's 90 ms step (a test holds these to the synced prototype).
 */
export const BLINK = { tickMs: 90, periodTicks: 40, closedTicks: 2 } as const;

/** The prototype's per-instance hash (`cr()` in `yap-dc.js`): picks the rest idle and its delay. */
export function idleHash(key: string): number {
  let hs = 0;
  for (let i = 0; i < key.length; i++) hs = (hs * 31 + key.charCodeAt(i)) >>> 0;
  return hs;
}

/** How a critter moves in a mood (the theme's tokens), and its start offset as the prototype picks it. */
export function critterIdle(
  mood: Mood,
  hash: number,
): { idle: Animation; talking: Animation; r: number } {
  const idle =
    (critterMotion.idle as Partial<Record<Mood, Animation>>)[mood] ??
    critterMotion.rest[hash % critterMotion.rest.length] ??
    critterMotion.talking;
  // The prototype delays each instance by -(hash % 17) / 10 s; the tokens jitter by up to 1.6 s.
  return { idle, talking: critterMotion.talking, r: (hash % 17) / 16 };
}

/** One entry of a React Native Skia transform. */
export type SkiaTransform =
  | { translateX: number }
  | { translateY: number }
  | { scaleX: number }
  | { scaleY: number }
  | { rotate: number };

/** The keyframes' transform at `progress`, for a Skia `Group` (angles in radians). */
export function skiaTransformAt(
  keyframes: Keyframes,
  progress: number,
  anim: Animation,
): SkiaTransform[] {
  'worklet';
  const out: SkiaTransform[] = [];
  for (const channel of keyframes.transform) {
    const track = keyframes.tracks[channel];
    if (track === undefined) continue;
    const v = sampleTrack(track, progress, anim.easing);
    if (channel === 'translateX') out.push({ translateX: v });
    else if (channel === 'translateY') out.push({ translateY: v });
    else if (channel === 'scaleX') out.push({ scaleX: v });
    else if (channel === 'scaleY') out.push({ scaleY: v });
    else if (channel === 'rotate') out.push({ rotate: (v * Math.PI) / 180 });
  }
  return out;
}

/** The idle transform at `elapsedMs` (a worklet). */
export function idleTransformAt(anim: Animation, elapsedMs: number, r: number): SkiaTransform[] {
  'worklet';
  const p = progressAt(anim, elapsedMs, r);
  return p === null ? [] : skiaTransformAt(anim.keyframes, p, anim);
}

/** Whether the eyes are shut at `elapsedMs`, offset by `phaseTicks` (a worklet). */
export function blinkingAt(elapsedMs: number, phaseTicks = 0): boolean {
  'worklet';
  const tick = Math.floor(elapsedMs / BLINK.tickMs) + phaseTicks;
  return tick % BLINK.periodTicks < BLINK.closedTicks;
}
