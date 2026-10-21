import { colours, controls, motion, outline, radii } from '@yapling/theme';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { transitionTo } from './motion/play';
import { useReduceMotion } from './motion/reduce-motion';
import { Press } from './press';
import { Txt } from './text';

const { width: W, height: H, knob: K } = controls.toggle;
const EDGE = outline.thin;
/** The knob's left inside the edge, off and on, as the prototype places it. */
const KNOB_X = { off: 2, on: 18 } as const;

/** The switch itself: mint when on, line grey when off, an ink-edged white knob that slides. */
export function Toggle({ on }: { on: boolean }) {
  const reduce = useReduceMotion();
  const value = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    // The knob sliding is the state change itself; under Reduce Motion it jumps.
    value.set(reduce ? (on ? 1 : 0) : transitionTo(on ? 1 : 0, motion.transitions.toggle));
  }, [on, reduce, value]);
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(value.get(), [0, 1], [colours.disabled, colours.success]),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: KNOB_X.off + (KNOB_X.on - KNOB_X.off) * value.get() }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: W,
          height: H,
          borderRadius: H / 2,
          borderWidth: EDGE,
          borderColor: colours.outline,
        },
        track,
      ]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 2,
            left: 0,
            width: K,
            height: K,
            borderRadius: K / 2,
            borderWidth: EDGE,
            borderColor: colours.outline,
            backgroundColor: colours.surface,
          },
          knob,
        ]}
      />
    </Animated.View>
  );
}

export interface ToggleRowProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly on: boolean;
  readonly onChange: (on: boolean) => void;
}

/** A white row with a title, a quiet line under it and a switch (quiet hours). */
export function ToggleRow({ title, subtitle, on, onChange }: ToggleRowProps) {
  return (
    <Press
      onPress={() => onChange(!on)}
      haptic="selection"
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: radii.row,
        borderWidth: 1.5,
        borderColor: colours.border,
        backgroundColor: colours.surface,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="rowTitle">{title}</Txt>
        {subtitle ? (
          <Txt variant="rowSub" colour={colours.textMuted}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <Toggle on={on} />
    </Press>
  );
}
