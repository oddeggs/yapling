import type { PipSpecies } from '@yapling/art';
import { Critter } from '@yapling/art/native';
import { colours, layout, motion } from '@yapling/theme';
import { View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { BackButton, GlassSheet } from '../../ui/glass-sheet';
import { useLocale } from '../../ui/locale';
import { useKeyframes } from '../../ui/motion/play';
import { useReduceMotion } from '../../ui/motion/reduce-motion';
import { StickerButton } from '../../ui/sticker-button';
import { BlurredScene } from './call-art';
import { CallTxt } from './call-text';

/*
 * When the call can't happen: no connection ("Pip's line is crackly") with a try-again, or the
 * microphone off for Yapling with the way to Settings. The roommate stays in view over the
 * blurred burrow; nothing is lost.
 */

export type CallErrorKind = 'net' | 'mic';

export interface CallErrorSheetProps {
  readonly kind: CallErrorKind;
  readonly name: string;
  readonly species: PipSpecies;
  readonly onBack: () => void;
  /** Try the call again (no connection), or open Settings (microphone). */
  readonly onPrimary: () => void;
}

/** The hero's place on the prototype's info screens. */
const HERO = { top: 96, size: 150 } as const;
const SHEET_TOP = 300;

export function CallErrorSheet({ kind, name, species, onBack, onPrimary }: CallErrorSheetProps) {
  const { t } = useLocale();
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const k = width / layout.screen.width;
  const pop = useKeyframes(motion.screens.infoHero);
  const copy =
    kind === 'net'
      ? {
          kicker: t('errors.offline.kicker'),
          title: t('errors.offline.title', { name }),
          body: null,
          primary: t('errors.offline.retry'),
        }
      : {
          kicker: t('errors.mic.kicker'),
          title: t('errors.mic.title', { name }),
          body: t('errors.mic.body', { name }),
          primary: t('errors.mic.openSettings'),
        };
  return (
    <View style={{ flex: 1, backgroundColor: colours.surfaceSunken }}>
      <BlurredScene name="burrow" width={width} height={height} />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: HERO.top * k,
            left: (width - HERO.size) / 2,
            width: HERO.size,
            alignItems: 'center',
          },
          pop,
        ]}
      >
        <Critter
          character="pip"
          species={species}
          mood={kind === 'net' ? 'worried' : 'listen'}
          size={HERO.size}
          animated={!reduce}
        />
      </Animated.View>
      <BackButton
        onPress={onBack}
        accessibilityLabel={t('common.a11y.back')}
        style={{ position: 'absolute', top: layout.topBar, left: layout.marginScreen }}
      />
      <GlassSheet kind="info" entrance={motion.screens.infoSheet} top={SHEET_TOP * k}>
        <CallTxt variant="kicker" colour={colours.textMuted} accessibilityRole="header">
          {copy.kicker}
        </CallTxt>
        <CallTxt variant="sheetTitle">{copy.title}</CallTxt>
        {copy.body ? (
          <CallTxt variant="body" colour={colours.textBody}>
            {copy.body}
          </CallTxt>
        ) : null}
        <View style={{ flex: 1 }} />
        <StickerButton label={copy.primary} onPress={onPrimary} />
      </GlassSheet>
    </View>
  );
}
