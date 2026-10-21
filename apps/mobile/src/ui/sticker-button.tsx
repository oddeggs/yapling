import {
  colours,
  controls,
  glass,
  palette,
  pill,
  stickerShadows,
  translucent,
  type StickerShadow,
  type TypeStyleKey,
} from '@yapling/theme';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { HapticName } from './haptics';
import { Press, useSink } from './press';
import { Sticker } from './surface';
import { Txt } from './text';
import type { ViewStyleObject, ViewStyleProp } from './style';

/**
 * - `primary`: lilac, the one thing to do on a screen.
 * - `secondary`: white, its equal partner (the paywall's "Không phải bây giờ").
 * - `answer`: mint, a reply or a yes.
 * - `dark`: ink on a lilac lip (purchase).
 * - `glass`: the quiet way out under a primary ("Để sau"), no outline or shadow.
 */
export type ButtonTone = 'primary' | 'secondary' | 'answer' | 'dark' | 'glass';

/**
 * - `regular`: 56 tall, full width.
 * - `pair`: 54 tall, one of two side by side.
 * - `tall`: 60 tall (the roommate picker).
 * - `small`: a 48-tall pill that hugs its label (the season map's "Gọi").
 */
export type ButtonSize = 'regular' | 'pair' | 'tall' | 'small';

const sizes: Record<ButtonSize, { height: number; font: TypeStyleKey }> = {
  regular: { height: controls.button.height, font: 'button' },
  pair: { height: controls.buttonPair.height, font: 'buttonPair' },
  tall: { height: controls.buttonTall.height, font: 'button' },
  small: { height: controls.buttonGlass.height, font: 'buttonSmall' },
};

const tones: Record<
  Exclude<ButtonTone, 'glass'>,
  { fill: string; text: string; shadow: StickerShadow }
> = {
  primary: { fill: colours.accent, text: colours.text, shadow: stickerShadows.button },
  secondary: { fill: colours.surface, text: colours.text, shadow: stickerShadows.button },
  answer: { fill: colours.success, text: colours.text, shadow: stickerShadows.button },
  dark: { fill: palette.ink, text: colours.textOnInk, shadow: stickerShadows.purchase },
};

export interface StickerButtonProps {
  readonly label: string;
  readonly onPress?: () => void;
  readonly tone?: ButtonTone;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly haptic?: HapticName | null;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly style?: ViewStyleProp;
  readonly testID?: string;
}

/** The house button: an ink-outlined pill on its flat ink shadow, pressed flat as it's tapped. */
export function StickerButton({
  label,
  onPress,
  tone = 'primary',
  size = 'regular',
  disabled = false,
  haptic = 'tap',
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: StickerButtonProps) {
  const held = useSharedValue(0);
  // A full-width glass button is the shorter, quieter one under a primary.
  const { height, font } =
    tone === 'glass' && size === 'regular'
      ? { height: controls.buttonGlass.height, font: 'buttonGlass' as const }
      : sizes[size];
  const radius = pill(height);
  const hug = size === 'small';
  const squeeze = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.03 * held.get() }] }));
  const look = tone === 'glass' || disabled ? null : tones[tone];
  const sink = useSink(held, look?.shadow.y ?? 0);
  const text = (
    <Txt
      variant={font}
      colour={disabled ? colours.textDisabled : (look?.text ?? colours.text)}
      align="center"
      numberOfLines={2}
    >
      {label}
    </Txt>
  );
  const content: ViewStyleObject = {
    height,
    paddingHorizontal: hug ? 16 : 6,
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <Press
      onPress={onPress}
      haptic={haptic}
      disabled={disabled}
      held={held}
      accessibilityLabel={accessibilityLabel ?? label}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      {...(testID ? { testID } : {})}
      style={[hug ? { alignSelf: 'flex-start' } : null, style]}
    >
      {look ? (
        <Sticker
          shadow={look.shadow}
          radius={radius}
          outline={controls.button.outline}
          fill={look.fill}
          faceStyle={sink}
          contentStyle={content}
        >
          {text}
        </Sticker>
      ) : (
        // Glass, and any button while disabled: frost with a bright edge, no ink.
        <Sticker
          shadow={{ x: 0, y: 0, colour: 'transparent' }}
          radius={radius}
          outline={glass.panel.border.width}
          outlineColour={glass.panel.border.colour}
          fill={translucent.frost}
          faceStyle={tone === 'glass' && !disabled ? squeeze : null}
          contentStyle={content}
        >
          {text}
        </Sticker>
      )}
    </Press>
  );
}
