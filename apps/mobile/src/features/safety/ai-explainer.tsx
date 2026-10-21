import type { Roommate } from '@yapling/contracts';
import {
  colours,
  glass,
  layout,
  motion,
  palette,
  translucent,
  type,
  type Glass,
} from '@yapling/theme';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BackButton,
  CritterSlot,
  GlassSheet,
  GlassView,
  StickerButton,
  Txt,
  useKeyframes,
  useLocale,
} from '../../ui';

/** The neighbours whose faces line up under the title, in the cast's order. */
const NEIGHBOURS = ['linh', 'mei', 'sol', 'hank', 'nell', 'bea', 'dex'] as const;

/** The explainer sheet's glass: paper at 90 %, as the Me sheet's. */
const sheetGlass: Glass = { ...glass.panel, fill: 'rgba(251,250,253,0.9)', blur: 30 };

/** Where the sheet's top sits, under the roommate. */
const SHEET_TOP = 300;

export interface AiExplainerProps {
  /** The learner's roommate: named in the title, drawn above the sheet once `@yapling/art` lands. */
  readonly roommate: Roommate;
  readonly onDone: () => void;
  /**
   * - `onboarding`: before the first call, with its kicker and a back button (an info sheet).
   * - `sheet`: from an AI tag or the Me sheet, the neighbours' faces under the title.
   */
  readonly look: 'onboarding' | 'sheet';
  /** The back button, during onboarding. */
  readonly onBack?: () => void;
}

/** "Pip and the neighbours are AI": what they are, what the voice is for, and what they aren't. */
export function AiExplainer({ roommate, onDone, look, onBack }: AiExplainerProps) {
  const roommateName = roommate.name;
  const { t } = useLocale();
  const hero = useKeyframes(motion.screens.infoHero);
  const rise = useKeyframes(motion.screens.infoSheet);
  const title = t('onboarding.ai.title', { name: roommateName });
  const lines = [
    t('onboarding.ai.characters'),
    t('onboarding.ai.voice'),
    t('onboarding.ai.notProfessionals'),
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colours.surfaceSunken }}>
      {/* The burrow goes here, blurred, once `@yapling/art` draws it. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: look === 'sheet' ? 'rgba(23,19,28,0.14)' : translucent.paperWash,
        }}
      />
      {look === 'onboarding' && onBack ? (
        <BackButton
          onPress={onBack}
          accessibilityLabel={t('common.a11y.back')}
          style={{ position: 'absolute', top: layout.topBar, left: layout.marginScreen }}
        />
      ) : null}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: look === 'sheet' ? 110 : 96,
            left: 0,
            right: 0,
            alignItems: 'center',
          },
          hero,
        ]}
      >
        <CritterSlot kind="critter" size={150} accessibilityLabel={roommateName} />
      </Animated.View>
      {look === 'onboarding' ? (
        <GlassSheet kind="info" top={SHEET_TOP} entrance={motion.screens.infoSheet}>
          <Txt variant="kicker" colour={colours.textMuted}>
            {t('onboarding.ai.kicker')}
          </Txt>
          <Txt variant="sheetTitle" accessibilityRole="header">
            {title}
          </Txt>
          {lines.map((line) => (
            <Txt key={line} variant="body" colour={colours.textBody}>
              {line}
            </Txt>
          ))}
          <View style={{ marginTop: 'auto' }}>
            <StickerButton label={t('onboarding.ai.cta')} onPress={onDone} />
          </View>
        </GlassSheet>
      ) : (
        <GlassView
          glass={sheetGlass}
          radius={40}
          style={[
            {
              position: 'absolute',
              left: 6,
              right: 6,
              top: SHEET_TOP,
              bottom: -40,
              paddingTop: 12,
              paddingHorizontal: 20,
              paddingBottom: 40,
              gap: 14,
            },
            rise,
          ]}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: palette.line,
            }}
          />
          <Txt variant={{ ...type.headline, size: 30 }} accessibilityRole="header">
            {title}
          </Txt>
          <View style={{ flexDirection: 'row' }} accessible={false}>
            {NEIGHBOURS.map((who) => (
              <View
                key={who}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  marginRight: -8,
                  borderWidth: 2,
                  borderColor: colours.outline,
                  overflow: 'hidden',
                  boxShadow: `0 0 0 2px ${palette.paper}`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CritterSlot kind="face" size={28} />
              </View>
            ))}
          </View>
          <View style={{ gap: 8 }}>
            {lines.map((line) => (
              <Txt key={line} variant={{ ...type.body, lineHeight: 1.4 }}>
                {line}
              </Txt>
            ))}
          </View>
          <StickerButton label={t('onboarding.ai.cta')} size="pair" onPress={onDone} />
        </GlassView>
      )}
    </View>
  );
}
