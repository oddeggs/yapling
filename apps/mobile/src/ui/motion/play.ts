import type { Animation, Transition } from '@yapling/theme';
import { useEffect, useMemo } from 'react';
import {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type AnimationCallback,
  type SharedValue,
} from 'react-native-reanimated';

import { calm, keyframeStyle, totalMs } from './keyframes';
import { useReduceMotion } from './reduce-motion';

/**
 * The theme's motion tokens on Reanimated, all on the UI thread. A keyframe animation plays by
 * running a clock (elapsed ms) linearly and sampling the token's keyframes from it, so every
 * segment keeps the design's own easing. Reanimated's own Reduce Motion handling is off: the
 * caller swaps moves for fades (`calm`), which Reanimated would skip outright.
 */

const never = ReduceMotion.Never;

/** An animation that changes nothing, for things that may appear without one. */
export const still: Animation = {
  keyframes: { name: 'still', transform: [], tracks: {} },
  durationMs: 1,
  delayMs: 0,
  easing: [0, 0, 1, 1],
  iterations: 1,
  fill: 'both',
};

/** A value easing to `to` on a transition token (`transitions.toggle`, `transitions.micPress`). */
export function transitionTo(to: number, transition: Transition, done?: AnimationCallback): number {
  'worklet';
  return withTiming(
    to,
    {
      duration: transition.durationMs,
      easing: Easing.bezier(...transition.easing),
      reduceMotion: never,
    },
    done,
  );
}

/** Runs a clock from 0 to the animation's end, linearly: set it on a shared value. */
export function playClock(animation: Animation, done?: AnimationCallback): number {
  'worklet';
  const end = totalMs(animation);
  return withTiming(end, { duration: end, easing: Easing.linear, reduceMotion: never }, done);
}

/** What an animation plays: equal for copies of the same token with the same timing. */
export function signature(animation: Animation): string {
  return `${animation.keyframes.name}:${animation.durationMs}:${animation.delayMs}:${animation.iterations}`;
}

/**
 * A clock for `animation`: a one-shot runs from 0 each time `trigger` changes (and on mount) while
 * `active`; a loop counts frames for as long as `active` holds. Returns elapsed ms.
 */
export function useClock(
  animation: Animation,
  { active = true, trigger }: { active?: boolean; trigger?: unknown } = {},
): SharedValue<number> {
  const clock = useSharedValue(0);
  const loops = !Number.isFinite(animation.iterations);
  const frames = useFrameCallback((frame) => {
    'worklet';
    clock.set(frame.timeSinceFirstFrame);
  }, false);
  useEffect(() => {
    if (loops) {
      frames.setActive(active);
      if (!active) clock.set(0);
      return () => frames.setActive(false);
    }
    if (!active) {
      cancelAnimation(clock);
      clock.set(totalMs(animation));
      return undefined;
    }
    clock.set(0);
    clock.set(playClock(animation));
    return () => cancelAnimation(clock);
    // `trigger` restarts a one-shot. The animation is keyed by what it plays, not by identity, so a
    // token copied with a stagger delay on each render does not restart it.
  }, [active, trigger, loops, signature(animation), clock, frames]);
  return clock;
}

/**
 * An animated style playing `animation` (a theme motion token), calmed under Reduce Motion. A loop
 * that would only move holds still under it; a sparkle (`hiddenOutside`) stays hidden then.
 */
export function useKeyframes(
  animation: Animation,
  options: { active?: boolean; trigger?: unknown; hiddenOutside?: boolean } = {},
) {
  const reduce = useReduceMotion();
  const key = signature(animation);
  // Keyed by signature, as in useClock.
  const played = useMemo(() => calm(animation, reduce), [key, reduce]);
  const hiddenOutside = options.hiddenOutside ?? false;
  const clock = useClock(played ?? animation, {
    active: (options.active ?? true) && played !== null,
    trigger: options.trigger,
  });
  return useAnimatedStyle(() => {
    if (played === null) return { opacity: hiddenOutside ? 0 : 1, transform: [] };
    return keyframeStyle(played, clock.get(), { hiddenOutside });
  });
}
