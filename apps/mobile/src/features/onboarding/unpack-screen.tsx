import type { PipSpecies } from '@yapling/art';
import { colours, glass, motion, outline, radii, stickerShadows, type } from '@yapling/theme';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassView, StickerButton, Sticker, Txt, useKeyframes, useLocale } from '../../ui';
import { BurrowBackdrop } from '../burrow';

/*
 * The day-one burrow before the unpacking chat: boxes everywhere and Pip waving. When iOS hasn't
 * asked for the microphone yet, the app asks first in its own voice ("So Pip can hear you"), then
 * the system's sheet follows; the chat itself is the placement call.
 */

export interface MicPrePromptProps {
  readonly roommateName: string;
  readonly onAllow: () => void;
  readonly busy?: boolean;
}

/** The card before the system's microphone sheet. */
export function MicPrePrompt({ roommateName, onAllow, busy = false }: MicPrePromptProps) {
  const { t } = useLocale();
  const pop = useKeyframes(motion.screens.infoHero);
  return (
    <View
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(23,19,28,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityViewIsModal
    >
      <Animated.View style={pop}>
        <Sticker
          shadow={{ ...stickerShadows.button, y: 6 }}
          radius={radii.panel}
          outline={outline.bold}
          fill={colours.surface}
          style={{ width: 300 }}
          contentStyle={{ padding: 22, gap: 12 }}
        >
          <Txt
            variant={{ ...type.sheetTitle, tracking: -0.05, lineHeight: 1 }}
            accessibilityRole="header"
          >
            {t('onboarding.mic.title', { name: roommateName })}
          </Txt>
          <Txt variant={{ ...type.body, size: 14, lineHeight: 1.35 }} colour={colours.textMuted}>
            {t('onboarding.mic.body')}
          </Txt>
          <StickerButton
            label={t('onboarding.mic.allow')}
            size="pair"
            onPress={onAllow}
            disabled={busy}
            style={{ marginTop: 0 }}
          />
        </Sticker>
      </Animated.View>
    </View>
  );
}

export interface UnpackScreenProps {
  readonly species: PipSpecies;
  readonly roommateName: string;
  /** The chip at the top: the first chat's length, or Linh at the door. */
  readonly chip?: string;
  /** Show the microphone pre-prompt. */
  readonly askMic: boolean;
  readonly asking: boolean;
  readonly onAllowMic: () => void;
}

/** The day-one burrow with Pip waving, the "first chat" chip, and the pre-prompt when needed. */
export function UnpackScreen({
  species,
  roommateName,
  chip,
  askMic,
  asking,
  onAllowMic,
}: UnpackScreenProps) {
  const { t } = useLocale();
  return (
    <>
      <BurrowBackdrop
        scene="burrow-day1"
        timeOfDay="afternoon"
        species={species}
        cast={[{ character: 'pip', mood: 'wave', size: 240, left: 75, top: 300 }]}
      >
        <GlassView
          glass={glass.panel}
          radius={20}
          style={{
            position: 'absolute',
            top: 60,
            left: 14,
            height: 40,
            paddingHorizontal: 14,
            justifyContent: 'center',
          }}
        >
          <Txt variant={{ ...type.buttonSmall, size: 13 }}>
            {chip ?? t('onboarding.unpack.chip')}
          </Txt>
        </GlassView>
        {askMic ? (
          <MicPrePrompt roommateName={roommateName} onAllow={onAllowMic} busy={asking} />
        ) : null}
      </BurrowBackdrop>
    </>
  );
}
