import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { colours, controls, motion, outline, sampleTrack } from '@yapling/theme';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useClock, useKeyframes } from './motion/play';
import { useRelay } from './motion/relay';
import { useReduceMotion } from './motion/reduce-motion';
import { Txt } from './text';
import { typeExtras } from './type-extras';

/** A circle as a path starting at 12 o'clock and running clockwise, so `end` is the share drawn. */
function ringPath(cx: number, cy: number, r: number) {
  return Skia.PathBuilder.Make()
    .addArc({ x: cx - r, y: cy - r, width: 2 * r, height: 2 * r }, -90, 359.999)
    .build();
}

/** An arc from `from` to `to` degrees (0 at 3 o'clock, clockwise). */
function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  return Skia.PathBuilder.Make()
    .addArc({ x: cx - r, y: cy - r, width: 2 * r, height: 2 * r }, from, to - from)
    .build();
}

/** Below this many seconds left, a running timer turns from mint to lilac. */
const URGENT_SECONDS = 10;
const TIMER = controls.timer.size;

export interface TimerRingProps {
  /** The round's length in seconds (90, 60, 45, 30). */
  readonly total: number;
  /** Seconds left, counted down on the UI thread (`useCountdown`). */
  readonly remaining: SharedValue<number>;
  /** True while the learner is recording: only then does it turn lilac near the end. */
  readonly running: boolean;
  readonly accessibilityLabel?: string;
}

/**
 * The countdown ring for a timed turn: a white dial, a mint arc running down to empty, and the
 * whole seconds left in the middle. It pops in when it appears.
 */
export function TimerRing({ total, remaining, running, accessibilityLabel }: TimerRingProps) {
  const pop = useKeyframes(motion.call.timer);
  const track = useMemo(() => ringPath(TIMER / 2, TIMER / 2, 38), []);
  const share = useDerivedValue(() => Math.max(0, Math.min(1, remaining.get() / total)));
  const colour = useDerivedValue(() =>
    running && remaining.get() < URGENT_SECONDS ? colours.accent : colours.success,
  );
  const [seconds, setSeconds] = useState(Math.ceil(total));
  useAnimatedReaction(
    () => Math.max(0, Math.ceil(remaining.get())),
    (now, before) => {
      if (now !== before) scheduleOnRN(setSeconds, now);
    },
  );
  return (
    <Animated.View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={accessibilityLabel ?? `${seconds}`}
      style={[{ width: TIMER, height: TIMER }, pop]}
    >
      <Canvas style={{ width: TIMER, height: TIMER }}>
        <Circle cx={TIMER / 2} cy={TIMER / 2} r={44} color={colours.surface} />
        <Circle
          cx={TIMER / 2}
          cy={TIMER / 2}
          r={44}
          color={colours.outline}
          style="stroke"
          strokeWidth={outline.bold}
        />
        <Path path={track} color={colours.divider} style="stroke" strokeWidth={9} />
        <Path
          path={track}
          color={colour}
          style="stroke"
          strokeWidth={9}
          strokeCap="round"
          start={0}
          end={share}
        />
      </Canvas>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
      >
        <Txt variant="timer">{`${seconds}s`}</Txt>
      </View>
    </Animated.View>
  );
}

/**
 * Seconds left in a timed turn, counting down on the UI thread while `running`, from `total`.
 * Stopping holds it; a new `total` (the next round) resets it. `onDone` fires at zero.
 */
export function useCountdown(total: number, running: boolean, onDone?: () => void) {
  const remaining = useSharedValue(total);
  const done = useRelay(() => onDone?.());
  useEffect(() => {
    remaining.set(total);
  }, [total, remaining]);
  useEffect(() => {
    if (!running) {
      cancelAnimation(remaining);
      return undefined;
    }
    const left = remaining.get();
    remaining.set(
      withTiming(0, { duration: left * 1000, easing: Easing.linear }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(done);
      }),
    );
    return () => cancelAnimation(remaining);
  }, [running, remaining, done]);
  return remaining;
}

/** The weekly ring's three calls as arcs around a circle, in the prototype's 56-unit drawing. */
const SEGMENTS = [0, 1, 2].map((i) => ({ from: -84 + 120 * i, to: 24 + 120 * i }));

export interface WeekRingProps {
  /** Calls done this week, 0 to 3. */
  readonly filled: number;
  /** The ring's width in points (86 after a call). */
  readonly size?: number;
  /** Pops the ring in, as after a call. */
  readonly pop?: boolean;
  readonly accessibilityLabel?: string;
}

/** The week ring: three ink arcs, each lilac once its call is done (1/3, 2/3, 3/3). */
export function WeekRing({ filled, size = 86, pop = false, accessibilityLabel }: WeekRingProps) {
  const popIn = useKeyframes(motion.screens.postRing, { active: pop });
  const scale = size / 56;
  const arcs = useMemo(
    () => SEGMENTS.map((s) => arcPath(28 * scale, 28 * scale, 22 * scale, s.from, s.to)),
    [scale],
  );
  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 3, now: filled }}
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
      style={[{ width: size, height: size }, pop ? popIn : null]}
    >
      <Canvas style={{ width: size, height: size }}>
        {arcs.map((arc, i) => (
          <Path
            key={`ink${i}`}
            path={arc}
            color={colours.outline}
            style="stroke"
            strokeWidth={10 * scale}
            strokeCap="round"
          />
        ))}
        {arcs.map((arc, i) => (
          <Path
            key={`fill${i}`}
            path={arc}
            color={i < filled ? colours.accent : colours.surface}
            style="stroke"
            strokeWidth={5 * scale}
            strokeCap="round"
          />
        ))}
      </Canvas>
    </Animated.View>
  );
}

const FULL = controls.timer.size;
/** The full ring's dash length, as the prototype draws it (its circumference, 2π × 36). */
const FULL_DASH = 226;

/** The full week ring on the keepsake: a white dial, a thick ink ring filling with mint, "3/3". */
export function FullRing({ label, fill = true }: { label: string; fill?: boolean }) {
  const reduce = useReduceMotion();
  const pop = useKeyframes(motion.screens.roundPop);
  const ringFill = motion.screens.ringFill;
  // The fill is a stroke being drawn, a change of state rather than a move: under Reduce Motion it
  // runs as a fade of the finished ring instead.
  const fade = useKeyframes(ringFill, { active: fill && reduce });
  const clock = useClock(ringFill, { active: fill && !reduce });
  const track = useMemo(() => ringPath(FULL / 2, FULL / 2, 36), []);
  const end = useDerivedValue(() => {
    if (!fill) return 0;
    if (reduce) return 1;
    const t = Math.min(1, Math.max(0, (clock.get() - ringFill.delayMs) / ringFill.durationMs));
    const offsetTrack = ringFill.keyframes.tracks.strokeDashoffset;
    const offset = offsetTrack ? sampleTrack(offsetTrack, t, ringFill.easing) : 0;
    return Math.max(0, Math.min(1, 1 - offset / FULL_DASH));
  });
  return (
    <Animated.View style={[{ width: FULL, height: FULL }, pop]}>
      <Canvas style={{ width: FULL, height: FULL }}>
        <Circle cx={FULL / 2} cy={FULL / 2} r={44} color={colours.surface} />
        <Circle
          cx={FULL / 2}
          cy={FULL / 2}
          r={44}
          color={colours.outline}
          style="stroke"
          strokeWidth={outline.bold}
        />
        <Path path={track} color={colours.outline} style="stroke" strokeWidth={14} />
      </Canvas>
      <Animated.View style={[{ position: 'absolute', inset: 0 }, reduce ? fade : null]}>
        <Canvas style={{ width: FULL, height: FULL }}>
          <Path
            path={track}
            color={colours.success}
            style="stroke"
            strokeWidth={8}
            start={0}
            end={end}
          />
        </Canvas>
      </Animated.View>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
      >
        <Txt variant={typeExtras.ringCount}>{label}</Txt>
      </View>
    </Animated.View>
  );
}
