import {
  colours,
  controls,
  motion,
  palette,
  radii,
  sampleTrack,
  stickerCss,
  stickerShadows,
} from '@yapling/theme';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, useLongPressGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from './haptics';
import { glowTracks, keyframeStyle } from './motion/keyframes';
import { transitionTo, useClock } from './motion/play';
import { useReduceMotion } from './motion/reduce-motion';
import { useRelay } from './motion/relay';

/**
 * Where the turn is:
 * - `idle`: nothing to say yet (between beats, the scene over).
 * - `speaking`: a character is talking; the mic waits, white and grey.
 * - `yourTurn`: the learner's turn; the mic is lilac and glows. Hold to talk.
 * - `listening`: the learner is holding it and talking; it swells and its bars move.
 * - `paused`: "Chờ chút" is on; the mic waits until "Tiếp tục".
 */
export type MicState = 'idle' | 'speaking' | 'yourTurn' | 'listening' | 'paused';

const SIZE = controls.mic.size;
const BAR = { width: 5, height: 26, gap: 4 } as const;
/** The mic's swell while it records. */
const LISTEN_SCALE = 1.08;
/** The hold ring around the mic: its gap from the mic's edge and its stroke. */
const RING = { gap: 3, stroke: 4 } as const;
const RING_BOX = SIZE + 2 * (RING.gap + RING.stroke);
const RING_PATH = Skia.PathBuilder.Make()
  .addArc(
    {
      x: RING.stroke / 2,
      y: RING.stroke / 2,
      width: RING_BOX - RING.stroke,
      height: RING_BOX - RING.stroke,
    },
    -90,
    359.999,
  )
  .build();

const glow = glowTracks(motion.call.micGlow.keyframes.tracks.boxShadow ?? []);

export interface MicButtonProps {
  readonly state: MicState;
  /** The learner put a finger down to talk (only on their turn). */
  readonly onTalkStart?: () => void;
  /** The finger came up (or slid away): the turn is theirs to end. */
  readonly onTalkEnd?: () => void;
  readonly accessibilityLabel: string;
  /**
   * Hold-to-talk: the shortest hold that is a turn. While held, a ring fills around the mic over
   * this long, so the learner learns to hold (under Reduce Motion it appears whole once reached).
   */
  readonly holdMs?: number;
}

/** The round mic in the call bar: hold to talk on your turn. */
export function MicButton({
  state,
  onTalkStart,
  onTalkEnd,
  accessibilityLabel,
  holdMs,
}: MicButtonProps) {
  const reduce = useReduceMotion();
  const ringFill = useSharedValue(0);
  const ring = useSharedValue({ ms: holdMs ?? 0, reduce });
  useEffect(() => {
    ring.set({ ms: holdMs ?? 0, reduce });
  }, [holdMs, reduce, ring]);
  const live = state === 'yourTurn' || state === 'listening';
  const listening = state === 'listening';

  const swell = useSharedValue(listening ? 1 : 0);
  useEffect(() => {
    swell.set(transitionTo(listening ? 1 : 0, motion.transitions.micPress));
  }, [listening, swell]);

  const latest = useRef({ onTalkStart, onTalkEnd });
  latest.current = { onTalkStart, onTalkEnd };
  const holding = useRef(false);
  const start = useRelay(() => {
    if (holding.current) return;
    holding.current = true;
    haptics.play('tap');
    latest.current.onTalkStart?.();
  });
  const end = useRelay(() => {
    if (!holding.current) return;
    holding.current = false;
    latest.current.onTalkEnd?.();
  });
  const hold = useLongPressGesture({
    enabled: live,
    minDuration: 0,
    maxDistance: 2000,
    onActivate: () => {
      'worklet';
      const { ms, reduce: still } = ring.get();
      if (ms > 0) {
        ringFill.set(0);
        // The fill is a change of state, not a move: under Reduce Motion the whole ring appears.
        ringFill.set(
          still
            ? withDelay(ms, withTiming(1, { duration: 0, reduceMotion: ReduceMotion.Never }))
            : withTiming(1, {
                duration: ms,
                easing: Easing.linear,
                reduceMotion: ReduceMotion.Never,
              }),
        );
      }
      scheduleOnRN(start);
    },
    onFinalize: () => {
      'worklet';
      cancelAnimation(ringFill);
      ringFill.set(0);
      scheduleOnRN(end);
    },
  });
  // VoiceOver can't hold: a double-tap starts talking and the next one stops.
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName !== 'activate' || !live) return;
    if (holding.current) end();
    else start();
  };
  const ringStyle = useAnimatedStyle(() => ({ opacity: ringFill.get() > 0 ? 1 : 0 }));

  const glowClock = useClock(motion.call.micGlow, { active: state === 'yourTurn' && !reduce });
  const glowStyle = useAnimatedStyle(() => {
    const p = (glowClock.get() % motion.call.micGlow.durationMs) / motion.call.micGlow.durationMs;
    const spread = sampleTrack(glow.spread, p, motion.call.micGlow.easing);
    const alpha = sampleTrack(glow.alpha, p, motion.call.micGlow.easing);
    return { opacity: alpha, transform: [{ scale: (SIZE + 2 * spread) / SIZE }] };
  });
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (LISTEN_SCALE - 1) * swell.get() }],
  }));

  return (
    <GestureDetector gesture={hold}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !live, busy: listening }}
        accessibilityActions={live ? [{ name: 'activate' }] : []}
        onAccessibilityAction={onAction}
        style={[{ width: SIZE, height: SIZE }, faceStyle]}
      >
        {holdMs ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: -(RING.gap + RING.stroke),
                top: -(RING.gap + RING.stroke),
                width: RING_BOX,
                height: RING_BOX,
              },
              ringStyle,
            ]}
          >
            <Canvas style={{ width: RING_BOX, height: RING_BOX }}>
              <Path
                path={RING_PATH}
                color={colours.outline}
                style="stroke"
                strokeWidth={RING.stroke}
                strokeCap="round"
                start={0}
                end={ringFill}
              />
            </Canvas>
          </Animated.View>
        ) : null}
        {state === 'yourTurn' ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                inset: 0,
                borderRadius: SIZE / 2,
                backgroundColor: colours.accent,
              },
              glowStyle,
            ]}
          />
        ) : null}
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: controls.mic.outline,
            borderColor: live ? colours.outline : colours.lineArt,
            backgroundColor: live ? colours.accent : colours.surface,
            // The ink lip shows only while the mic glows for the learner's turn, as in the design.
            ...(state === 'yourTurn' ? { boxShadow: stickerCss(stickerShadows.button) } : {}),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: BAR.gap,
          }}
        >
          {[0, 1, 2].map((i) => (
            <MicBar key={i} index={i} moving={listening && !reduce} live={live} />
          ))}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/** One of the mic's three bars: still, or bobbing while the learner talks, each a beat behind. */
function MicBar({ index, moving, live }: { index: number; moving: boolean; live: boolean }) {
  const bars = motion.call.micBars;
  const staggered = useMemo(
    () => ({ ...bars, delayMs: bars.delayMs + index * (bars.staggerMs ?? 0) }),
    [bars, index],
  );
  const clock = useClock(staggered, { active: moving });
  const style = useAnimatedStyle(() => {
    if (!moving) return { transform: [{ scaleY: 1 }] };
    // The loop holds its first frame through its stagger delay, as CSS does with fill-mode none
    // (bars at rest), then bobs.
    const t = clock.get() - staggered.delayMs;
    if (t < 0) return { transform: [{ scaleY: 1 }] };
    return keyframeStyle({ ...staggered, delayMs: 0 }, t);
  });
  return (
    <Animated.View
      style={[
        {
          width: BAR.width,
          height: BAR.height,
          borderRadius: radii.bar,
          backgroundColor: live ? palette.ink : colours.lineArt,
        },
        style,
      ]}
    />
  );
}
