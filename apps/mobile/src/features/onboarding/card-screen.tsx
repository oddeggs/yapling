import type { PipSpecies } from '@yapling/art';
import { Critter } from '@yapling/art/native';
import { colours, motion, outline, radii, stickerShadows, translucent, type } from '@yapling/theme';
import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  CheckRow,
  Chip,
  GlassSheet,
  Sticker,
  StickerButton,
  Tag,
  Txt,
  useKeyframes,
  useLocale,
} from '../../ui';
import { Face } from '../burrow';
import { BlurredScene, useScale, useTopShift } from './art';
import { SheetScroll } from './sheets';
import type { ResidencyView } from './residency';

/*
 * The residency card: the tilted lilac card flies in (the stage, the day's stamp) with Pip
 * beside it, and the glass sheet rises under it with three strengths, the first two can-dos,
 * "Not quite right? Too easy / Too hard" ("Too hard" opens the sheet that offers slower voices or
 * Settling in with Linh first) and "Continue". No back button: the placement call can't be taken
 * back.
 */

const CARD_WIDTH = 236;
const SHEET_TOP = 330;

export interface CardScreenProps {
  readonly view: ResidencyView;
  readonly species: PipSpecies;
  readonly roommateName: string;
  readonly onTooEasy: () => void;
  readonly onTooHard: () => void;
  readonly onContinue: () => void;
}

export function CardScreen({
  view,
  species,
  roommateName,
  onTooEasy,
  onTooHard,
  onContinue,
}: CardScreenProps) {
  const { t } = useLocale();
  const { u } = useScale();
  const shift = useTopShift();
  const fly = useKeyframes(motion.screens.residencyCard);
  return (
    <>
      <View style={{ flex: 1, backgroundColor: colours.accentSoft }}>
        <BlurredScene fn="s_burrow2" blur={12} wash={translucent.paperWash} />
        <Critter
          character="pip"
          species={species}
          mood="excited"
          size={140}
          style={{ position: 'absolute', top: 166 + shift, left: u(252) }}
        />
        <Animated.View
          style={[
            { position: 'absolute', top: 112 + shift, left: 16, width: CARD_WIDTH, zIndex: 2 },
            fly,
          ]}
          accessible
          accessibilityLabel={[
            t('onboarding.card.top'),
            view.stageName,
            view.stageLocal,
            view.stageLine,
            t('onboarding.card.welcome'),
          ].join('. ')}
        >
          <Sticker
            shadow={stickerShadows.tiltedCard}
            radius={radii.bubble}
            outline={outline.heavy}
            fill={colours.accent}
            contentStyle={{ paddingVertical: 16, paddingHorizontal: 18, gap: 9 }}
          >
            <Txt variant={{ ...type.label, size: 10, tracking: 0.04 }} numberOfLines={1}>
              {t('onboarding.card.top')}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 13,
                  overflow: 'hidden',
                  borderWidth: outline.regular,
                  borderColor: colours.outline,
                  backgroundColor: colours.surface,
                }}
              >
                {/* The prototype draws the face 52 wide inside the 47-point frame and clips it. */}
                <Face character="pip" species={species} size={52} background={colours.surface} />
              </View>
              {/* As the prototype's nowrap: a long stage name runs on rather than wrapping. */}
              <View style={{ flexShrink: 0 }}>
                <Txt variant="cardName">{view.stageName}</Txt>
                <Txt variant={{ ...type.noteStrong, size: 13 }}>{view.stageLocal}</Txt>
                <Tag label={view.stageLine} style={{ marginTop: 4 }} />
              </View>
            </View>
            <Txt variant="handWelcome">{t('onboarding.card.welcome')}</Txt>
          </Sticker>
          <Stamp town={view.stampTown} date={view.stampDate} />
        </Animated.View>
        <GlassSheet kind="card" top={SHEET_TOP + shift} entrance={motion.screens.residencySheet}>
          {/* On a short screen the rows scroll above the adjust chips and "Continue". */}
          <SheetScroll gap={8} fill={false}>
            <Txt variant="section" style={{ paddingHorizontal: 4 }}>
              {t('onboarding.card.strengthsTitle')}
            </Txt>
            {view.strengths === null ? (
              <Writing text={t('onboarding.card.writing', { name: roommateName })} />
            ) : (
              view.strengths.map((s, i) => (
                <CheckRow key={s.key} kind="strength" index={i} text={s.text} />
              ))
            )}
            <Txt variant="section" style={{ paddingTop: 6, paddingHorizontal: 4 }}>
              {t('onboarding.card.aimsTitle')}
            </Txt>
            {view.aims.map((a) => (
              <CheckRow key={a.id} kind="aim" text={a.text} />
            ))}
          </SheetScroll>
          {/* Kept out of the scroll, so "Dễ quá / Khó quá" are in reach on a short screen too. */}
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}
          >
            <Txt variant="noteStrong" colour={colours.textMuted} style={{ flex: 1 }}>
              {t('onboarding.card.adjust')}
            </Txt>
            <Chip label={t('onboarding.card.tooEasy')} onPress={onTooEasy} />
            <Chip label={t('onboarding.card.tooHard')} onPress={onTooHard} />
          </View>
          <View style={{ flex: 1 }} />
          <StickerButton label={t('common.continue')} onPress={onContinue} />
        </GlassSheet>
      </View>
    </>
  );
}

/** The round "NW / SEP 21" stamp on the card's corner. */
function Stamp({ town, date }: { town: string; date: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        right: 14,
        bottom: -22,
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: outline.bold,
        borderColor: colours.outline,
        backgroundColor: colours.surface,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '-10deg' }],
      }}
    >
      <Txt variant={{ ...type.aiTag, size: 9, weight: 900, lineHeight: 1 }} align="center">
        {`${town}\n${date}`}
      </Txt>
    </View>
  );
}

/** Where the strengths go while the summary is being written. */
function Writing({ text }: { text: string }) {
  return (
    <View
      accessible
      accessibilityLabel={text}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: radii.tile,
        backgroundColor: translucent.frostStrong,
      }}
    >
      <ActivityIndicator color={colours.textMuted} />
      <Txt variant="item" colour={colours.textMuted}>
        {text}
      </Txt>
    </View>
  );
}
