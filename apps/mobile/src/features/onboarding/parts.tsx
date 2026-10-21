import { LIMITS } from '@yapling/contracts';
import { colours, controls, fontFor, glass, outline, pill, radii, type } from '@yapling/theme';
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Press, Txt } from '../../ui';
import type { ViewStyleProp } from '../../ui/style';

/*
 * Small pieces the onboarding screens share: the frosted name field (the roommate picker's), the
 * age check row, and a sheet lifting over the keyboard on the UI thread.
 */

export interface NameFieldProps {
  readonly value: string;
  readonly onChange: (text: string) => void;
  readonly label: string;
  readonly placeholder?: string;
  /** The roommate picker's field is 60 tall in 24-point type; others are 56 in 20. */
  readonly large?: boolean;
  readonly onSubmit?: () => void;
  readonly style?: ViewStyleProp;
}

/** A frosted pill to type a name in, as the roommate picker draws it. */
export function NameField({
  value,
  onChange,
  label,
  placeholder,
  large = false,
  onSubmit,
  style,
}: NameFieldProps) {
  const height = large ? controls.buttonTall.height : controls.button.height;
  return (
    <View style={style}>
      <TextInput
        value={value}
        onChangeText={onChange}
        accessibilityLabel={label}
        {...(placeholder !== undefined ? { placeholder } : {})}
        placeholderTextColor={colours.textDisabled}
        maxLength={LIMITS.nameMax}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="done"
        {...(onSubmit ? { onSubmitEditing: onSubmit } : {})}
        style={[
          fontFor({ ...type.button, size: large ? 24 : 20 }),
          {
            height,
            borderRadius: pill(height),
            borderWidth: glass.panel.border.width,
            borderColor: glass.panel.border.colour,
            backgroundColor: 'rgba(255,255,255,0.8)',
            paddingHorizontal: 22,
            color: colours.text,
          },
        ]}
      />
    </View>
  );
}

/** "I'm 18 or older": a frosted row with an ink box that ticks. */
export function AgeCheckRow({
  checked,
  onToggle,
  title,
  subtitle,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <Press
      onPress={onToggle}
      haptic="selection"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${title}. ${subtitle}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: radii.bubbleSmall,
        backgroundColor: 'rgba(255,255,255,0.75)',
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          borderWidth: outline.regular,
          borderColor: colours.outline,
          backgroundColor: checked ? colours.success : colours.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Txt variant={{ ...type.buttonPair, weight: 900 }}>✓</Txt> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="buttonPair">{title}</Txt>
        <Txt variant={{ ...type.noteStrong, weight: 600 }} colour={colours.textMuted}>
          {subtitle}
        </Txt>
      </View>
    </Press>
  );
}

/** Lifts what it holds (a bottom sheet) above the keyboard, following it on the UI thread. */
export function KeyboardLift({ children }: { children: ReactNode }) {
  const keyboard = useAnimatedKeyboard();
  const { bottom } = useSafeAreaInsets();
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.value - bottom + 8) }],
  }));
  return (
    <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, lift]}>
      {children}
    </Animated.View>
  );
}
