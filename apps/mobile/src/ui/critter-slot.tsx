import { colours, outline, translucent } from '@yapling/theme';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ViewStyleProp } from './style';

/**
 * Where art goes, until `@yapling/art` draws it:
 * - `critter`: a whole critter, `size` wide and 1.2 × `size` tall (the sticker critter's box).
 * - `face`: a face in a square (a top pill's avatar, a call slot's picture), `size` square.
 * - `object`: a burrow object (seed packet, sprout), `size` wide and 4/3 × `size` tall.
 */
export type CritterSlotKind = 'critter' | 'face' | 'object';

export interface CritterSlotProps {
  readonly kind: CritterSlotKind;
  /** The art's width in points. */
  readonly size: number;
  /** For a face: who, read by VoiceOver until the art carries its own label. */
  readonly accessibilityLabel?: string;
  /** The art itself, once `@yapling/art` provides it; the outline shows until then. */
  readonly children?: ReactNode;
  readonly style?: ViewStyleProp;
}

const aspect: Record<CritterSlotKind, number> = { critter: 1.2, face: 1, object: 4 / 3 };

/** A typed, sized placeholder for a critter, face or object: `@yapling/art` fills it. */
export function CritterSlot({ kind, size, accessibilityLabel, children, style }: CritterSlotProps) {
  const empty = children === undefined;
  return (
    <View
      accessible={accessibilityLabel !== undefined}
      {...(accessibilityLabel ? { accessibilityLabel, accessibilityRole: 'image' as const } : {})}
      style={[
        { width: size, height: size * aspect[kind] },
        empty
          ? {
              borderRadius: kind === 'face' ? 0 : size * 0.18,
              borderWidth: outline.thin,
              borderStyle: 'dashed',
              borderColor: translucent.glossRule,
              backgroundColor: kind === 'face' ? colours.accentSoft : translucent.inkWash,
            }
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
