import type { PipSpecies } from '@yapling/art';
import { Critter } from '@yapling/art/native';
import {
  colours,
  fontFor,
  inkOverflowTop,
  layout,
  motion,
  palette,
  sampleTrack,
  type,
} from '@yapling/theme';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import {
  BackButton,
  CheckRow,
  GlassSheet,
  PhraseStageTile,
  StickerButton,
  Tag,
  Txt,
  typeExtras,
  useClock,
  useLocale,
  useReduceMotion,
} from '../../ui';
import { DotGrid } from './art';
import type { AfterCallModel, AfterCallReady } from './model';
import { BloomCardView, FixRow, GrowingObject, OpenBox, Receipt, payoffType } from './pieces';
import { RingDelta } from './ring-delta';

export interface AfterCallScreenProps {
  readonly model: AfterCallModel;
  readonly species: PipSpecies;
  readonly onContinue: () => void;
  readonly onBack: () => void;
}

/** Where the design puts things on its 390 × 844 page. */
const PLACE = {
  heading: 100,
  ring: { top: 184, right: 20 },
  /** The wins start at 196 and the fix row at 340, whatever the wins' length. */
  winsTop: 196,
  fixTop: 340,
  phrasesGap: 18,
  /** Room under the content for the bottom bar. */
  barRoom: 170,
} as const;

/** "Xong rồi!" typing itself in, its letters closing up (the design's `ytype`). */
function DoneTitle({ text }: { text: string }) {
  const reduce = useReduceMotion();
  const anim = motion.screens.postDone;
  const clock = useClock(anim);
  const size = type.hero.size;
  const resting = fontFor('hero').letterSpacing;
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (clock.get() - anim.delayMs) / anim.durationMs));
    const opacity = anim.keyframes.tracks.opacity;
    const spacing = anim.keyframes.tracks.letterSpacingEm;
    return {
      opacity: opacity ? sampleTrack(opacity, t, anim.easing) : 1,
      letterSpacing: !reduce && spacing ? sampleTrack(spacing, t, anim.easing) * size : resting,
    };
  });
  const over = inkOverflowTop('hero');
  return (
    <Animated.Text
      accessibilityRole="header"
      style={[fontFor('hero'), { color: colours.text, paddingTop: over, marginTop: -over }, style]}
    >
      {text}
    </Animated.Text>
  );
}

function Heading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View style={styles.heading}>
      <Txt variant="noteStrong" colour={colours.textMuted}>
        {kicker}
      </Txt>
      <DoneTitle text={title} />
    </View>
  );
}

function Ready({ model }: { model: AfterCallReady }) {
  return (
    <>
      <Heading kicker={model.kicker} title={model.title} />
      {model.ring && model.ringTag ? (
        <View style={styles.ring}>
          <RingDelta
            before={model.ring.before}
            after={model.ring.after}
            accessibilityLabel={model.ringTag}
          />
        </View>
      ) : null}
      <View
        style={[
          styles.wins,
          { marginRight: model.ring ? 120 : layout.marginCard },
          model.fix ? { minHeight: PLACE.fixTop - PLACE.winsTop } : null,
        ]}
      >
        {model.wins ? (
          <>
            <Txt variant="label">{model.wins.title}</Txt>
            {model.wins.items.map((win, i) => (
              <CheckRow key={win} kind="win" text={win} index={i} />
            ))}
          </>
        ) : null}
        {model.quiet ? (
          <View style={{ gap: 4 }}>
            <Txt variant={payoffType.quiet}>{model.quiet.title}</Txt>
            <Txt variant="body" colour={colours.textMuted}>
              {model.quiet.sub}
            </Txt>
          </View>
        ) : null}
      </View>
      {model.fix ? (
        <View style={styles.side}>
          <FixRow {...model.fix} />
        </View>
      ) : null}
      {model.phrases ? (
        <View style={[styles.side, { marginTop: PLACE.phrasesGap, gap: 8 }]}>
          <Txt variant="label">{model.phrases.title}</Txt>
          {rowsOf(model.phrases.tiles, 4).map((row, r) => (
            <View key={row.map((p) => p.id).join()} style={{ flexDirection: 'row', gap: 6 }}>
              {row.map((p, i) => (
                <PhraseStageTile
                  key={p.id}
                  phrase={p.text}
                  stage={p.stage}
                  art={<GrowingObject from={p.artFrom} to={p.artTo} index={r * 4 + i} />}
                />
              ))}
              {Array.from({ length: 4 - row.length }, (_, k) => (
                <View key={`gap${k}`} style={{ flex: 1 }} />
              ))}
            </View>
          ))}
        </View>
      ) : null}
      {model.blooms.map((card) => (
        <View key={card.id} style={[styles.side, { marginTop: 22 }]}>
          <BloomCardView card={card} />
        </View>
      ))}
      {model.receipt ? (
        <View style={{ marginTop: 22 }}>
          <Receipt rows={model.receipt} />
        </View>
      ) : null}
    </>
  );
}

function rowsOf<T>(items: readonly T[], n: number): T[][] {
  const rows: T[][] = [];
  items.forEach((item, i) => {
    if (i % n === 0) rows.push([item]);
    else rows[rows.length - 1]?.push(item);
  });
  return rows;
}

function Writing({
  model,
  species,
}: {
  model: Extract<AfterCallModel, { state: 'writing' }>;
  species: PipSpecies;
}) {
  const { t } = useLocale();
  return (
    <>
      <Heading kicker="" title={t('payoff.afterCall.done')} />
      <View style={styles.writing} accessible accessibilityLiveRegion="polite">
        <Critter character="pip" species={species} mood="think" size={130} />
        <Txt variant="cardTitle" align="center">
          {model.title}
        </Txt>
        <Txt variant="body" colour={colours.textMuted} align="center">
          {model.sub}
        </Txt>
      </View>
    </>
  );
}

/**
 * After the call: "Xong rồi!", the two wins, the one fix, the phrases growing, the ring filling and
 * the box unpacked; or, for a moment, the roommate writing it all down.
 */
export function AfterCallScreen({ model, species, onContinue, onBack }: AfterCallScreenProps) {
  const { t } = useLocale();
  const { width, height } = useWindowDimensions();
  const ready = model.state === 'ready' ? model : null;
  return (
    <View style={styles.screen}>
      <DotGrid width={width} height={height} />
      <ScrollView
        contentContainerStyle={{ paddingTop: PLACE.heading, paddingBottom: PLACE.barRoom }}
        showsVerticalScrollIndicator={false}
      >
        {ready ? <Ready model={ready} /> : null}
        {model.state === 'writing' ? <Writing model={model} species={species} /> : null}
      </ScrollView>
      <BackButton onPress={onBack} accessibilityLabel={t('common.a11y.back')} style={styles.back} />
      <GlassSheet kind="bar" entrance={motion.screens.postSheet}>
        {ready && (ready.burrow || ready.ringTag) ? (
          <View style={styles.barRow}>
            {ready.burrow?.kind === 'box' ? <OpenBox /> : null}
            <Txt variant={typeExtras.boxNote} style={{ flex: 1 }}>
              {ready.burrow?.text ?? ''}
            </Txt>
            {ready.ringTag ? (
              <Tag label={ready.ringTag} fill={colours.accent} size="medium" />
            ) : null}
          </View>
        ) : null}
        <StickerButton
          label={ready ? ready.cta : t('payoff.afterCall.cta')}
          onPress={onContinue}
          haptic={ready?.next.length ? 'tap' : 'success'}
        />
      </GlassSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.peach, overflow: 'hidden' },
  back: { position: 'absolute', top: layout.topBar, left: layout.marginScreen },
  heading: { marginHorizontal: layout.marginTitle, gap: 2 },
  ring: { position: 'absolute', top: PLACE.ring.top, right: PLACE.ring.right },
  wins: {
    marginTop: PLACE.winsTop - PLACE.heading - 72,
    marginLeft: layout.marginCard,
    gap: 6,
  },
  side: { marginHorizontal: layout.marginCard },
  writing: { marginTop: 60, marginHorizontal: 40, alignItems: 'center', gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
});
