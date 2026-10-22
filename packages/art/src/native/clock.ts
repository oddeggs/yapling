/*
 * The motion engine's clocks on Reanimated: a loop clock for idle life and a one-shot clock for an
 * act. Ported from rossark-motion-skill (`templates/react-native/motion.ts`, MIT, Copyright (c)
 * 2026 rossark0; the full notice is in `../rig/engine.ts`).
 */
import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * A clock looping from 0 to `period` ms on the UI thread, frozen at 0 when `live` is false
 * (Reduce Motion, off screen): frame 0 must be a good drawing.
 */
export function useLoopClock(period: number, live: boolean): SharedValue<number> {
  const clock = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(clock);
    // `withRepeat` restarts from the current value: always reset first.
    clock.value = 0;
    if (!live) return;
    clock.value = withRepeat(withTiming(period, { duration: period, easing: Easing.linear }), -1);
    return () => cancelAnimation(clock);
  }, [live, period, clock]);
  return clock;
}

/**
 * A clock that plays once from 0 to `duration` ms each time `play` changes (a number: the act's
 * turn), then holds at the end. With Reduce Motion it jumps straight to the end: the final frame
 * carries the meaning (the rig's acts end at rest).
 */
export function useOneShotClock(
  duration: number,
  play: number,
  reduced: boolean,
): SharedValue<number> {
  const clock = useSharedValue(reduced ? duration : 0);
  useEffect(() => {
    cancelAnimation(clock);
    if (reduced) {
      clock.value = duration;
      return;
    }
    clock.value = 0;
    clock.value = withTiming(duration, { duration, easing: Easing.linear });
    return () => cancelAnimation(clock);
  }, [play, reduced, duration, clock]);
  return clock;
}
