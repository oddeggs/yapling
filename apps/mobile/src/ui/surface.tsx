import { BlurView } from 'expo-blur';
import { palette, shadowCss, type Glass, type StickerShadow } from '@yapling/theme';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { AnimatedViewStyleProp, ViewStyleObject, ViewStyleProp } from './style';

/**
 * The two house materials. Glass: a frosted white fill over a blurred backdrop, a bright edge
 * and a soft plum shadow. Sticker: an ink-outlined shape on a flat, unblurred ink copy offset
 * down (and right when tilted); the copy is a separate layer so a press can sink the face onto it.
 */

/**
 * How strongly iOS's light material blurs, for a CSS `backdrop-filter: blur(n)`. The system
 * material is tuned against the prototype's renders; the theme's fill sits over it.
 */
const blurIntensity = (blur: number) => Math.min(100, Math.round(blur * 1.6));

/** A glass material's edge and shadow as view style (the blur and its fill are a child layer). */
export function glassStyle(glass: Glass): ViewStyleObject {
  return {
    ...(glass.border ? { borderWidth: glass.border.width, borderColor: glass.border.colour } : {}),
    ...(outer(glass).length > 0 ? { boxShadow: shadowCss(outer(glass)) } : {}),
  };
}

const outer = (glass: Glass) => glass.shadow.filter((layer) => !layer.inset);
const inner = (glass: Glass) => glass.shadow.filter((layer) => layer.inset);

export interface GlassViewProps {
  readonly glass: Glass;
  readonly radius: number;
  readonly style?: AnimatedViewStyleProp;
  readonly children?: ReactNode;
  readonly pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}

/** A glass panel: the blurred backdrop clipped to its corners, the fill, the edge and the shadow. */
export function GlassView({ glass, radius, style, children, pointerEvents }: GlassViewProps) {
  // Absolute layers sit inside the edge, so their corners are the edge's inner curve.
  const innerRadius = Math.max(0, radius - (glass.border?.width ?? 0));
  return (
    <Animated.View
      pointerEvents={pointerEvents ?? 'auto'}
      style={[{ borderRadius: radius, borderCurve: 'continuous' }, glassStyle(glass), style]}
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: innerRadius, overflow: 'hidden' }]}
      >
        <BlurView
          tint="light"
          intensity={blurIntensity(glass.blur)}
          style={[StyleSheet.absoluteFill, { backgroundColor: glass.fill }]}
        />
      </View>
      {inner(glass).length > 0 ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: innerRadius, boxShadow: shadowCss(inner(glass)) },
          ]}
        />
      ) : null}
      {children}
    </Animated.View>
  );
}

export interface StickerProps {
  readonly shadow: StickerShadow;
  readonly radius: number;
  readonly outline: number;
  readonly fill: string;
  /** Moves the face down onto its shadow while pressed (a `useSink` style). */
  readonly faceStyle?: AnimatedViewStyleProp;
  /** The face's own layout (padding, row direction, gap). */
  readonly contentStyle?: ViewStyleProp;
  /** The whole sticker's place (size, margins, rotation). */
  readonly style?: ViewStyleProp;
  readonly outlineColour?: string;
  readonly children?: ReactNode;
}

/** A sticker: the ink copy offset behind, then the outlined face. Layout is the face's box. */
export function Sticker({
  shadow,
  radius,
  outline,
  fill,
  faceStyle,
  contentStyle,
  style,
  outlineColour = palette.ink,
  children,
}: StickerProps) {
  return (
    <View style={style}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            top: shadow.y,
            bottom: -shadow.y,
            left: shadow.x,
            right: -shadow.x,
            borderRadius: radius,
            borderCurve: 'continuous',
            backgroundColor: shadow.colour,
          },
        ]}
      />
      <Animated.View
        style={[
          {
            borderRadius: radius,
            borderCurve: 'continuous',
            borderWidth: outline,
            borderColor: outlineColour,
            backgroundColor: fill,
          },
          contentStyle,
          faceStyle,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}
