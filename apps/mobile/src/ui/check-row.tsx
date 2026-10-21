import { colours, motion, outline, radii, translucent, type, type TypeStyle } from '@yapling/theme';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useKeyframes } from './motion/play';
import { Txt } from './text';
import { typeExtras } from './type-extras';

/**
 * - `strength`: something the learner already does well, on glass (the residency card).
 * - `aim`: a first aim, an ink-edged box to tick later (the residency card).
 * - `win`: one of the two wins after a call, smaller and ink-edged.
 */
export type CheckRowKind = 'strength' | 'aim' | 'win';

export interface CheckRowProps {
  readonly kind: CheckRowKind;
  readonly text: string;
  /** An aim that has been met shows its tick; strengths and wins always do. */
  readonly checked?: boolean;
  /** Its place in the list: strengths ease in one after another. */
  readonly index?: number;
}

const sizes: Record<
  CheckRowKind,
  { mark: number; text: TypeStyle; gap: number; py: number; px: number }
> = {
  strength: { mark: 22, text: type.item, gap: 10, py: 9, px: 12 },
  aim: { mark: 22, text: type.item, gap: 10, py: 9, px: 12 },
  win: { mark: 20, text: typeExtras.win, gap: 8, py: 8, px: 10 },
};

/** A row with a tick or a box: strengths, aims and wins. */
export function CheckRow({ kind, text, checked = kind !== 'aim', index = 0 }: CheckRowProps) {
  const s = sizes[kind];
  const entrance =
    kind === 'strength'
      ? motion.screens.residencyStrength
      : kind === 'win'
        ? motion.screens.postWin
        : null;
  const delayed = entrance
    ? { ...entrance, delayMs: entrance.delayMs + index * (entrance.staggerMs ?? 0) }
    : null;
  const easeIn = useKeyframes(delayed ?? motion.screens.listIn, { active: delayed !== null });
  return (
    <Animated.View
      style={easeIn}
      accessible
      accessibilityRole={kind === 'aim' ? 'checkbox' : 'text'}
      {...(kind === 'aim' ? { accessibilityState: { checked } } : {})}
      accessibilityLabel={text}
    >
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: s.gap,
            paddingVertical: s.py,
            paddingHorizontal: s.px,
            borderRadius: radii.tile,
          },
          kind === 'strength'
            ? { backgroundColor: translucent.frostStrong }
            : {
                backgroundColor: colours.surface,
                borderWidth: kind === 'aim' ? outline.regular : outline.thin,
                borderColor: colours.outline,
              },
        ]}
      >
        <Mark size={s.mark} box={kind === 'aim'} checked={checked} />
        <Txt variant={s.text} style={{ flex: 1 }}>
          {text}
        </Txt>
      </View>
    </Animated.View>
  );
}

/** A mint tick in a circle, or the aim's square box (ticked once met). */
function Mark({ size, box, checked }: { size: number; box: boolean; checked: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: box ? radii.tag : size / 2,
        borderWidth: box ? outline.regular : outline.thin,
        borderColor: colours.outline,
        backgroundColor: checked ? colours.success : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? (
        // The prototype's tick is the `✓` glyph at 12 (11 on a win), Black.
        <Text style={{ fontSize: size === 20 ? 11 : 12, fontWeight: '900', color: colours.text }}>
          ✓
        </Text>
      ) : null}
    </View>
  );
}
