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
  type,
} from '@yapling/theme';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BackButton,
  CheckRow,
  GlassSheet,
  PhraseStageTile,
  Sticker,
  StickerButton,
  Tag,
  Txt,
  WeekRing,
  useKeyframes,
  useLocale,
} from '../../ui';
import { DotGrid } from './art';
import { DoneTitle } from './after-call-screen';
import { GrowingObject } from './pieces';
import type { ThenAndNow, ThenAndNowSide } from './then-now-model';
import type { WeekWrap } from './wrap-model';

/*
 * The week's wrap and the then-and-now card: built from the after-call page's pieces (the dotted
 * peach paper, "Done!" typing in, the week ring, the phrase tiles and the win rows).
 */

const wrapType = {
  ringLine: { ...type.body, size: 15, weight: 700 as const, lineHeight: 1.3 },
  next: { ...type.item, lineHeight: 1.25 },
  number: { ...type.number, size: 44, weight: 900 as const },
  side: { ...type.rowSub, size: 12.5 },
  line: { ...type.cardTitle, size: 20, lineHeight: 1.25 },
};

function rowsOf<T>(items: readonly T[], n: number): T[][] {
  const rows: T[][] = [];
  items.forEach((item, i) => {
    if (i % n === 0) rows.push([item]);
    else rows[rows.length - 1]?.push(item);
  });
  return rows;
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

/** The week's wrap: the ring, the phrases that grew, the can-dos ticked and what's next. */
export function WrapScreen({
  wrap,
  onContinue,
  onBack,
}: {
  wrap: WeekWrap;
  onContinue: () => void;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const { width, height } = useWindowDimensions();
  const ringLabel = t('payoff.afterCall.ring', { done: wrap.ring.after, total: wrap.ring.total });
  const easeIn = useKeyframes(motion.screens.postWin);
  return (
    <View style={styles.screen}>
      <DotGrid width={width} height={height} />
      <ScrollView
        contentContainerStyle={{ paddingTop: 100, paddingBottom: 190 }}
        showsVerticalScrollIndicator={false}
      >
        <Heading kicker={wrap.kicker} title={wrap.title} />
        <Animated.View style={[styles.ringRow, easeIn]}>
          <WeekRing filled={wrap.ring.after} size={78} pop accessibilityLabel={ringLabel} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant={wrapType.ringLine}>{wrap.ringLine}</Txt>
            {wrap.rings ? (
              <Txt variant="noteStrong" colour={colours.textMuted}>
                {wrap.rings}
              </Txt>
            ) : null}
          </View>
        </Animated.View>
        {wrap.phrases ? (
          <View style={[styles.side, { gap: 8 }]}>
            <Txt variant="label" accessibilityRole="header">
              {wrap.phrases.title}
            </Txt>
            {rowsOf(wrap.phrases.tiles, 4).map((row, r) => (
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
        {wrap.canDos ? (
          <View style={[styles.side, { gap: 6 }]}>
            <Txt variant="label" accessibilityRole="header">
              {wrap.canDos.title}
            </Txt>
            {wrap.canDos.items.map((c, i) => (
              <CheckRow key={c.id} kind="win" text={c.title} index={i} />
            ))}
          </View>
        ) : null}
        {wrap.quiet ? (
          <View style={styles.side}>
            <Txt variant="body" colour={colours.textMuted}>
              {wrap.quiet}
            </Txt>
          </View>
        ) : null}
      </ScrollView>
      <BackButton onPress={onBack} accessibilityLabel={t('common.a11y.back')} style={styles.back} />
      <GlassSheet kind="bar" entrance={motion.screens.postSheet}>
        {wrap.next ? (
          <View style={styles.next} accessible>
            <Tag label={wrap.next.tag} fill={colours.accentSoft} edge={outline.thin} />
            <Txt variant={wrapType.next} style={{ flex: 1 }}>
              {wrap.next.text}
            </Txt>
          </View>
        ) : null}
        <StickerButton label={wrap.cta} onPress={onContinue} haptic="success" />
      </GlassSheet>
    </View>
  );
}

function Side({ side, now }: { side: ThenAndNowSide; now: boolean }) {
  const pop = useKeyframes({ ...motion.call.sticker, delayMs: now ? 700 : 300 });
  return (
    <Animated.View style={[{ flex: 1 }, pop]}>
      <Sticker
        shadow={stickerShadows.button}
        radius={radii.bubble}
        outline={now ? outline.bold : outline.regular}
        fill={now ? colours.success : colours.surface}
        style={{ transform: [{ rotate: now ? '3deg' : '-3deg' }] }}
        contentStyle={styles.sideCard}
      >
        <Tag label={side.week} fill={now ? colours.surface : colours.secondarySoft} />
        <Txt variant={wrapType.number}>{side.value}</Txt>
        <Txt variant={wrapType.side} colour={colours.textBody} numberOfLines={1}>
          {side.title}
        </Txt>
      </Sticker>
    </Animated.View>
  );
}

/** Then and now: week 1's Pass it on next to a later pitch, Flow in seconds. */
export function ThenNowScreen({
  view,
  species,
  cta,
  onContinue,
}: {
  view: ThenAndNow;
  species: PipSpecies;
  cta: string;
  onContinue: () => void;
}) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.screen}>
      <DotGrid width={width} height={height} />
      <View style={{ paddingTop: 100 }}>
        <Heading kicker={view.kicker} title={view.title} />
        <View style={styles.pair} accessible accessibilityLabel={view.a11y}>
          <Side side={view.then} now={false} />
          <Txt variant={{ ...type.cardTitle, size: 26 }} style={{ fontFamily: 'System' }}>
            →
          </Txt>
          <Side side={view.now} now />
        </View>
        <Txt variant="noteStrong" colour={colours.textMuted} align="center">
          {view.unit}
        </Txt>
      </View>
      <View style={styles.thenPip} importantForAccessibility="no-hide-descendants">
        <Critter character="pip" species={species} mood="proud" size={150} />
      </View>
      <GlassSheet kind="bar" entrance={motion.screens.infoSheet}>
        <Txt
          variant={wrapType.line}
          style={{ paddingHorizontal: 6 }}
          accessibilityLiveRegion="polite"
        >
          {view.line}
        </Txt>
        <StickerButton label={cta} onPress={onContinue} haptic="success" />
      </GlassSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.peach, overflow: 'hidden' },
  back: { position: 'absolute', top: layout.topBar, left: layout.marginScreen },
  heading: { marginHorizontal: layout.marginTitle, gap: 2 },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 22,
    marginHorizontal: layout.marginCard,
  },
  side: { marginHorizontal: layout.marginCard, marginTop: 22 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.row,
    backgroundColor: colours.surface,
    borderWidth: outline.regular,
    borderColor: colours.outline,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 34,
    marginBottom: 10,
    marginHorizontal: layout.marginCard,
  },
  sideCard: { alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 10 },
  thenPip: { position: 'absolute', bottom: 210, alignSelf: 'center' },
});
