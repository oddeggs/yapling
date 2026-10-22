import type { PipSpecies } from '@yapling/art';
import { Critter } from '@yapling/art/native';
import {
  colours,
  layout,
  motion,
  outline,
  palette,
  radii,
  stickerShadows,
  translucent,
  type,
} from '@yapling/theme';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BackButton,
  GlassSheet,
  Sticker,
  StickerButton,
  Txt,
  useKeyframes,
  useLocale,
} from '../../ui';
import { BlurredScene } from '../call/call-art';
import { DotGrid } from './art';
import { DoneTitle } from './after-call-screen';
import type { MinuteCard, MinuteRow } from './minute-model';
import type { BloomCard } from './model';
import { BloomCardView, GrowingObject, payoffType } from './pieces';

/*
 * Two small payoff moments: the card after Pip's minute (each phrase and its new state), and a
 * phrase in bloom (the learner used it on their own, weeks after they met it).
 */

const minuteType = {
  phrase: { ...type.rowTitle, size: 17, weight: 800 as const },
  gloss: { ...type.glossSmall, size: 14, lineHeight: 1.2 },
  line: { ...type.rowSub, size: 13 },
};

function MinuteRowView({ row, index }: { row: MinuteRow; index: number }) {
  const easeIn = useKeyframes({
    ...motion.screens.listIn,
    delayMs: 300 + index * (motion.screens.residencyStrength.staggerMs ?? 150),
  });
  return (
    <Animated.View style={easeIn} accessible accessibilityLabel={row.a11y}>
      <Sticker
        shadow={stickerShadows.button}
        radius={radii.bubble}
        outline={outline.regular}
        fill={row.role === 'reuse' ? colours.successSoft : colours.surface}
        contentStyle={styles.row}
      >
        <GrowingObject from={row.artFrom} to={row.artTo} index={index} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant={minuteType.phrase}>{row.phrase}</Txt>
          {row.gloss ? (
            <Txt variant={minuteType.gloss} colour={colours.textGloss}>
              {row.gloss}
            </Txt>
          ) : null}
          <Txt variant={minuteType.line} colour={colours.textMuted}>
            {row.line}
          </Txt>
        </View>
      </Sticker>
    </Animated.View>
  );
}

/** After Pip's minute: "Xong rồi!", Pip with its notebook, and the minute's phrases. */
export function MinuteScreen({
  card,
  species,
  onDone,
}: {
  card: MinuteCard;
  species: PipSpecies;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const { width, height } = useWindowDimensions();
  return (
    <View style={[styles.screen, { backgroundColor: palette.peach }]}>
      <DotGrid width={width} height={height} />
      <ScrollView
        contentContainerStyle={{ paddingTop: 100, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Txt variant="noteStrong" colour={colours.textMuted}>
            {card.kicker}
          </Txt>
          <DoneTitle text={card.title} />
        </View>
        <View style={styles.pip} importantForAccessibility="no-hide-descendants">
          <Critter character="pip" species={species} mood="proud" size={120} />
        </View>
        <View style={styles.side}>
          {card.quiet ? (
            <View style={{ gap: 4, marginBottom: 6 }}>
              <Txt variant={payoffType.quiet}>{card.quiet.title}</Txt>
              <Txt variant="body" colour={colours.textMuted}>
                {card.quiet.sub}
              </Txt>
            </View>
          ) : null}
          {card.rows.length > 0 ? (
            <Txt variant="label" accessibilityRole="header">
              {card.notebook}
            </Txt>
          ) : null}
          {card.rows.map((row, i) => (
            <MinuteRowView key={row.id} row={row} index={i} />
          ))}
        </View>
      </ScrollView>
      <BackButton onPress={onDone} accessibilityLabel={t('common.a11y.back')} style={styles.back} />
      <GlassSheet kind="bar" entrance={motion.screens.postSheet}>
        <StickerButton label={card.cta} onPress={onDone} haptic="success" />
      </GlassSheet>
    </View>
  );
}

/**
 * A phrase in bloom, as the design's reuse moment closes: the burrow softly blurred, the roommate
 * proud, the learner's own words and the bloom card with its sparkles.
 */
export function BloomScreen({
  blooms,
  species,
  onDone,
}: {
  blooms: readonly BloomCard[];
  species: PipSpecies;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const { width, height } = useWindowDimensions();
  const pop = useKeyframes(motion.screens.infoHero);
  return (
    <View style={[styles.screen, { backgroundColor: colours.background }]}>
      <BlurredScene name="burrow" width={width} height={height} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: translucent.paperWashCall }]} />
      <Animated.View style={[styles.bloomPip, pop]} importantForAccessibility="no-hide-descendants">
        <Critter character="pip" species={species} mood="excited" size={190} />
      </Animated.View>
      <View style={styles.bloomBottom}>
        {blooms.map((card) => (
          <View key={card.id} style={styles.youSaid} accessible>
            <Txt variant="label" colour={colours.textMuted}>
              {t('payoff.bloomMoment.you')}
            </Txt>
            <View style={styles.youPhrase}>
              <Txt variant={{ ...type.rowTitle, size: 17 }}>{card.phrase}</Txt>
            </View>
          </View>
        ))}
        {blooms.map((card) => (
          <BloomCardView key={`card-${card.id}`} card={card} />
        ))}
        <StickerButton
          label={t('payoff.bloomMoment.cta')}
          size="pair"
          onPress={onDone}
          haptic="success"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  back: { position: 'absolute', top: layout.topBar, left: layout.marginScreen },
  heading: { marginHorizontal: layout.marginTitle, gap: 2 },
  pip: { position: 'absolute', top: 70, right: 20 },
  side: { marginHorizontal: layout.marginCard, marginTop: 36, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
  },
  bloomPip: { position: 'absolute', top: 150, alignSelf: 'center' },
  bloomBottom: { position: 'absolute', left: 14, right: 14, bottom: 34, gap: 12 },
  youSaid: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: translucent.frostStrong,
    borderWidth: 1,
    borderColor: translucent.glassEdge,
    gap: 2,
  },
  youPhrase: {
    alignSelf: 'flex-start',
    backgroundColor: colours.success,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
});
