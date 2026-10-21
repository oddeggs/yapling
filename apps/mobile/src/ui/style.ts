import type { ComponentProps } from 'react';
import type { TextProps, ViewProps } from 'react-native';
import type Animated from 'react-native-reanimated';

/*
 * Style prop types taken from the components themselves. React Native's `ViewStyle` is widened by
 * Expo's web types once Metro has generated `expo-env.d.ts` (`position: 'fixed'`), which native
 * views then refuse; the views' own prop types hold either way.
 */

/** A `View`'s style. */
export type ViewStyleProp = ViewProps['style'];
/** A `Text`'s style. */
export type TextStyleProp = TextProps['style'];
/** An `Animated.View`'s style: plain styles and animated ones. */
export type AnimatedViewStyleProp = ComponentProps<typeof Animated.View>['style'];
/** One plain view style object. */
export type ViewStyleObject = Exclude<
  NonNullable<ViewStyleProp>,
  readonly unknown[] | false | '' | number
>;
