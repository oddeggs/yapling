import {
  colours,
  controls,
  fontFor,
  glass,
  layout,
  radii,
  type,
  type Animation,
} from '@yapling/theme';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { still, useKeyframes } from './motion/play';
import { Press } from './press';
import { GlassView } from './surface';
import type { ViewStyleProp } from './style';

/**
 * - `sheet`: the splash and roommate sheets (inset 10, corners 44).
 * - `info`: info sheets over a blurred scene (AI disclosure, notifications, paywall, errors; inset 8,
 *   corners 42).
 * - `card`: the residency sheet under its card (inset 10, corners 42, tighter rows).
 * - `bar`: a bottom bar holding a button or two (the week, after a call, the keepsake; corners 40).
 */
export type GlassSheetKind = 'sheet' | 'info' | 'card' | 'bar';

const kinds: Record<
  GlassSheetKind,
  { inset: number; radius: number; padding: [number, number, number]; gap: number }
> = {
  sheet: { inset: layout.sheetInset, radius: radii.sheetLarge, padding: [20, 16, 16], gap: 10 },
  info: { inset: layout.infoSheetInset, radius: radii.sheet, padding: [22, 18, 16], gap: 10 },
  card: { inset: layout.sheetInset, radius: radii.sheet, padding: [20, 16, 16], gap: 8 },
  bar: { inset: layout.sheetInset, radius: radii.sheetBar, padding: [14, 14, 14], gap: 10 },
};

export interface GlassSheetProps {
  readonly kind?: GlassSheetKind;
  /** The sheet rising into place (`motion.screens.infoSheet`, `splashSheet`…); null for none. */
  readonly entrance?: Animation | null;
  /** Pins the top edge (an info sheet that starts under its hero); otherwise it hugs its content. */
  readonly top?: number;
  /** Lays the sheet out in the flow instead of pinning it to the bottom of the screen (the kit). */
  readonly inline?: boolean;
  readonly style?: ViewStyleProp;
  readonly children?: ReactNode;
}

/** A frosted card at the bottom of the screen, over the scene: the house's sheet. */
export function GlassSheet({
  kind = 'info',
  entrance = null,
  top,
  inline = false,
  style,
  children,
}: GlassSheetProps) {
  const k = kinds[kind];
  const rise = useKeyframes(entrance ?? still, { active: entrance !== null });
  return (
    <GlassView
      glass={glass.panel}
      radius={k.radius}
      style={[
        inline
          ? null
          : {
              position: 'absolute',
              left: k.inset,
              right: k.inset,
              bottom: k.inset,
              ...(top === undefined ? {} : { top }),
            },
        {
          paddingTop: k.padding[0],
          paddingHorizontal: k.padding[1],
          paddingBottom: k.padding[2],
          gap: k.gap,
        },
        rise,
        style,
      ]}
    >
      {children}
    </GlassView>
  );
}

/** The round glass back button at the top left of a screen. */
export function BackButton({
  onPress,
  accessibilityLabel,
  style,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  style?: ViewStyleProp;
}) {
  const size = controls.back.size;
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      hitSlop={(controls.minHitTarget - size) / 2}
      style={style}
    >
      <GlassView
        glass={glass.button}
        radius={size / 2}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        {/* The prototype's chevron is Lexend's own `‹` at 20. */}
        <Text style={[fontFor({ ...type.button, size: 20 }), { color: colours.text }]}>‹</Text>
      </GlassView>
    </Press>
  );
}
