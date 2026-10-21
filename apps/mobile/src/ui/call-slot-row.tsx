import { colours, glass, motion, outline, radii } from '@yapling/theme';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { CritterSlot } from './critter-slot';
import { useKeyframes } from './motion/play';
import { Press } from './press';
import { GlassView } from './surface';
import { Txt } from './text';

export interface CallSlotRowProps {
  /** The kind of call, set in capitals ("Tập truyện", "Tuần thật", "Luyện tập"). */
  readonly tag: string;
  readonly title: string;
  /** When it's on ("Hôm nay", "Thứ Năm"). */
  readonly when: string;
  /** Behind the face in the picture (the episode's apricot, Pip's lilac, Bea's sky). */
  readonly pictureFill: string;
  /** The call kind's colour; the status ring fills with it once the call is done. */
  readonly accent: string;
  readonly done: boolean;
  /** The face, drawn by `@yapling/art`; a placeholder until then. */
  readonly face?: ReactNode;
  readonly onPress?: () => void;
  readonly accessibilityLabel?: string;
}

const PICTURE = { width: 84, height: 64 } as const;
const RING = 26;

/** One call of the week: a picture with the character's face, what and when, and its status ring. */
export function CallSlotRow({
  tag,
  title,
  when,
  pictureFill,
  accent,
  done,
  face,
  onPress,
  accessibilityLabel,
}: CallSlotRowProps) {
  const listIn = useKeyframes(motion.screens.listIn);
  return (
    <Press
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityLabel={accessibilityLabel ?? `${tag}. ${title}. ${when}`}
      accessibilityState={{ checked: done }}
      style={listIn}
    >
      <GlassView
        glass={glass.panel}
        radius={radii.bubble}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 8,
          paddingLeft: 8,
          paddingRight: 12,
        }}
      >
        <View
          style={{
            ...PICTURE,
            borderRadius: radii.tile,
            borderWidth: outline.regular,
            borderColor: colours.outline,
            backgroundColor: pictureFill,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          {face ?? (
            <CritterSlot
              kind="face"
              size={PICTURE.height}
              style={{ backgroundColor: pictureFill }}
            />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Txt variant="label" colour={colours.textMuted}>
            {tag}
          </Txt>
          <Txt variant="slotTitle">{title}</Txt>
          <Txt variant="note" colour={colours.textMuted}>
            {when}
          </Txt>
        </View>
        <View
          style={{
            width: RING,
            height: RING,
            borderRadius: RING / 2,
            borderWidth: outline.regular,
            borderStyle: 'dashed',
            borderColor: colours.outline,
            backgroundColor: done ? accent : colours.surface,
          }}
        />
      </GlassView>
    </Press>
  );
}
