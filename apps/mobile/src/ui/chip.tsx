import {
  colours,
  controls,
  outline,
  palette,
  pill,
  radii,
  translucent,
  type TypeStyle,
  type TypeStyleKey,
} from '@yapling/theme';
import { View } from 'react-native';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Press } from './press';
import { Txt } from './text';
import { typeExtras } from './type-extras';
import type { ViewStyleProp } from './style';

export interface ChoiceChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress?: () => void;
  readonly accessibilityLabel?: string;
}

/** A choice among several (the first-language chips): lilac with an ink edge when chosen. */
export function ChoiceChip({ label, selected, onPress, accessibilityLabel }: ChoiceChipProps) {
  const held = useSharedValue(0);
  const squeeze = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.04 * held.get() }] }));
  return (
    <Press
      onPress={onPress}
      haptic="selection"
      held={held}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          height: controls.choice.height,
          paddingHorizontal: 13,
          borderRadius: pill(controls.choice.height),
          borderWidth: controls.choice.outline,
          borderColor: selected ? colours.outline : translucent.inkBorder,
          backgroundColor: selected ? colours.accent : translucent.frostStrong,
          justifyContent: 'center',
        },
        squeeze,
      ]}
    >
      <Txt variant="choice">{label}</Txt>
    </Press>
  );
}

export interface ChipProps {
  readonly label: string;
  readonly onPress?: () => void;
  readonly accessibilityLabel?: string;
}

/** A small answer on glass ("Dễ quá", "Khó quá"): frost with a faint ink edge. */
export function Chip({ label, onPress, accessibilityLabel }: ChipProps) {
  const held = useSharedValue(0);
  const squeeze = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.04 * held.get() }] }));
  return (
    <Press
      onPress={onPress}
      held={held}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={(controls.minHitTarget - controls.chip.height) / 2}
      style={[
        {
          height: controls.chip.height,
          paddingHorizontal: 12,
          borderRadius: pill(controls.chip.height),
          borderWidth: 1.5,
          borderColor: translucent.inkBorderSoft,
          backgroundColor: translucent.frostStrong,
          justifyContent: 'center',
        },
        squeeze,
      ]}
    >
      <Txt variant="chip">{label}</Txt>
    </Press>
  );
}

/** The meaning chip under a line ("What does that mean?"): an ink pill. */
export function MeaningChip({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Press
      onPress={onPress}
      hitSlop={6}
      style={{
        alignSelf: 'flex-start',
        paddingVertical: 7,
        paddingHorizontal: 13,
        borderRadius: radii.chip,
        backgroundColor: palette.ink,
      }}
    >
      <Txt variant={typeExtras.meaningChip} colour={colours.textOnInk}>
        {label}
      </Txt>
    </Press>
  );
}

/** The AI tag beside every character's name. Never hidden. */
export function AiTag({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <View
      style={{
        paddingVertical: 1,
        paddingHorizontal: 5,
        borderRadius: radii.aiTag,
        backgroundColor: palette.ink,
      }}
    >
      <Txt
        variant={small ? typeExtras.aiTagSmall : 'aiTag'}
        colour={colours.textOnInk}
        numberOfLines={1}
      >
        {label}
      </Txt>
    </View>
  );
}

export type TagSize = 'small' | 'medium' | 'note';

const tagSizes: Record<
  TagSize,
  { radius: number; py: number; px: number; font: TypeStyleKey | TypeStyle }
> = {
  /** HINT, the residency card's "Chặng 1/5", the plan badge. */
  small: { radius: radii.tag, py: 2, px: 7, font: typeExtras.tagSmall },
  /** "TUẦN 1", "Vòng tuần · 1/3". */
  medium: { radius: radii.tagLarge, py: 3, px: 9, font: 'tag' },
  /** A note on a tag ("Không tính phút gọi"). */
  note: { radius: radii.note, py: 4, px: 10, font: 'bubbleName' },
};

export interface TagProps {
  readonly label: string;
  readonly fill?: string;
  readonly size?: TagSize;
  /** The edge: 2 for most tags, 2.5 for the tilted ones. */
  readonly edge?: number;
  /** Degrees; tags stuck on at an angle ("TUẦN 1" at −4). */
  readonly tilt?: number;
  readonly style?: ViewStyleProp;
}

/** A small ink-edged tag stuck on a card or scene. */
export function Tag({
  label,
  fill = colours.surface,
  size = 'small',
  edge = outline.thin,
  tilt,
  style,
}: TagProps) {
  const s = tagSizes[size];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
          borderWidth: edge,
          borderColor: colours.outline,
          backgroundColor: fill,
        },
        tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
        style,
      ]}
    >
      <Txt variant={s.font} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}
