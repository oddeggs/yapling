import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { colours, motion, sampleTrack, type Animation } from '@yapling/theme';
import { useMemo } from 'react';
import Animated, { useDerivedValue } from 'react-native-reanimated';

import { totalMs, useClock, useKeyframes, useReduceMotion } from '../../ui';

/*
 * The weekly ring after a call, filling from the count before the call to the count after: the
 * week ring's three ink arcs pop in with the calls done before, then this call's arc draws itself
 * in lilac (the ring-fill stroke, as the keepsake's ring fills).
 */

/** The three arcs in the prototype's 56-unit drawing (as the shared week ring draws them). */
const SEGMENTS = [0, 1, 2].map((i) => ({ from: -84 + 120 * i, to: 24 + 120 * i }));

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  return Skia.PathBuilder.Make()
    .addArc({ x: cx - r, y: cy - r, width: 2 * r, height: 2 * r }, from, to - from)
    .build();
}

const pop = motion.screens.postRing;
/** This call's arc fills once the ring has popped in. */
const fill: Animation = { ...motion.screens.ringFill, delayMs: totalMs(pop) };
/** The ring-fill stroke's full dash offset, as the prototype's keyframes start it. */
const DASH = Number(fill.keyframes.tracks.strokeDashoffset?.[0]?.value ?? 1);

export interface RingDeltaProps {
  readonly before: number;
  readonly after: number;
  readonly size?: number;
  readonly accessibilityLabel: string;
}

export function RingDelta({ before, after, size = 86, accessibilityLabel }: RingDeltaProps) {
  const reduce = useReduceMotion();
  const popIn = useKeyframes(pop);
  const clock = useClock(fill, { active: !reduce && after > before });
  const scale = size / 56;
  const arcs = useMemo(
    () => SEGMENTS.map((s) => arcPath(28 * scale, 28 * scale, 22 * scale, s.from, s.to)),
    [scale],
  );
  const end = useDerivedValue(() => {
    if (reduce) return 1;
    const t = Math.min(1, Math.max(0, (clock.get() - fill.delayMs) / fill.durationMs));
    const track = fill.keyframes.tracks.strokeDashoffset;
    const offset = track ? sampleTrack(track, t, fill.easing) : 0;
    return Math.max(0, Math.min(1, 1 - offset / DASH));
  });
  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: SEGMENTS.length, now: after }}
      style={[{ width: size, height: size }, popIn]}
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
            color={i < before ? colours.accent : colours.surface}
            style="stroke"
            strokeWidth={5 * scale}
            strokeCap="round"
          />
        ))}
        {arcs.map((arc, i) =>
          i >= before && i < after ? (
            <Path
              key={`new${i}`}
              path={arc}
              color={colours.accent}
              style="stroke"
              strokeWidth={5 * scale}
              strokeCap="round"
              start={0}
              end={end}
            />
          ) : null,
        )}
      </Canvas>
    </Animated.View>
  );
}
