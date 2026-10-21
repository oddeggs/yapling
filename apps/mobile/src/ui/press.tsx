import { transitions, type Transition } from '@yapling/theme';
import { useCallback, useRef, type ReactNode } from 'react';
import type { AccessibilityActionEvent, AccessibilityProps, Insets } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics, type HapticName } from './haptics';
import { transitionTo } from './motion/play';
import { useRelay } from './motion/relay';
import type { AnimatedViewStyleProp } from './style';

/** A press's down and up: the quick ease the prototype gives the mic swelling. */
const PRESS: Transition = transitions.micPress;

export interface PressProps extends AccessibilityProps {
  readonly onPress?: (() => void) | undefined;
  /** Played as the press lands; `tap` unless set (null for none). */
  readonly haptic?: HapticName | null;
  readonly disabled?: boolean | undefined;
  /** How far past its edges the control still takes a touch, to reach 44 points. */
  readonly hitSlop?: number | Insets | undefined;
  /** Receives the held value on the UI thread (0 up, 1 down) for controls that draw their own press. */
  readonly held?: SharedValue<number> | undefined;
  readonly style?: AnimatedViewStyleProp;
  readonly children?: ReactNode;
  readonly testID?: string | undefined;
}

/**
 * Anything tappable, recognised on the UI thread by Gesture Handler. It owns the held value and
 * hands it to the control, which draws its own pressed look; VoiceOver activates it through the
 * standard action.
 */
export function Press({
  onPress,
  haptic = 'tap',
  disabled = false,
  hitSlop,
  held: heldProp,
  style,
  children,
  testID,
  ...a11y
}: PressProps) {
  const own = useSharedValue(0);
  const held = heldProp ?? own;
  const latest = useRef({ onPress, haptic });
  latest.current = { onPress, haptic };
  const fire = useCallback(() => {
    const { onPress: press, haptic: h } = latest.current;
    if (h) haptics.play(h);
    press?.();
  }, []);
  // The gesture calls back through a relay: it may be kept after the control has gone.
  const fireOnRN = useRelay(fire);
  const tap = useTapGesture({
    enabled: !disabled,
    hitSlop: hitSlop ?? 0,
    maxDuration: 60_000,
    onBegin: () => {
      'worklet';
      held.set(transitionTo(1, PRESS));
    },
    onActivate: () => {
      'worklet';
      scheduleOnRN(fireOnRN);
    },
    onFinalize: () => {
      'worklet';
      held.set(transitionTo(0, PRESS));
    },
  });
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate') fire();
  };
  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...a11y}
        {...(onPress && !disabled
          ? { accessibilityActions: [{ name: 'activate' }], onAccessibilityAction: onAction }
          : {})}
        testID={testID}
        style={style}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * A sticker pressed flat: it sinks onto its shadow by `depth` points while held, as a printed
 * sticker would. Under Reduce Motion the sinking stays (it is feedback, not motion) but is instant.
 */
export function useSink(held: SharedValue<number>, depth: number) {
  return useAnimatedStyle(() => ({ transform: [{ translateY: depth * held.get() }] }));
}
