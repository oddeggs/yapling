import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { Critter } from '@yapling/art/native';
import { colours, layout, outline, radii, stickerShadows, translucent } from '@yapling/theme';
import type { Href } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import {
  BackButton,
  CallSlotRow,
  SeedPacketGrid,
  StickerButton,
  Sticker,
  Txt,
  useLocale,
} from '../../ui';
import { Face, WordObject } from '../burrow/art';
import { render } from '../burrow/copy';
import { formatWeekDates, type WeekModel, type WeekRow } from './model';

export interface WeekScreenProps {
  readonly model: WeekModel;
  readonly onBack?: () => void;
  readonly onNavigate?: (to: Href) => void;
}

/** The prototype's dotted paper: a 1.1-point dot every 18 points. */
function DotGrid({ width, height }: { width: number; height: number }) {
  const path = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let y = 9; y < height; y += 18) {
      for (let x = 9; x < width; x += 18) b.addCircle(x, y, 1.25);
    }
    return b.build();
  }, [width, height]);
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Path path={path} color={translucent.dotGrid} />
    </Canvas>
  );
}

/**
 * This week: the dates and the title, Pip, the three calls that fill the ring (who is in each,
 * when it opens, whether it's done), a call still waiting from an earlier week, and the week's
 * phrases as seed packets with their glosses. When it all doesn't fit, the page scrolls.
 */
export function WeekScreen({ model, onBack, onNavigate }: WeekScreenProps) {
  const { t, language } = useLocale();
  const { width, height } = useWindowDimensions();
  const pip = model.roommate;
  return (
    <View style={styles.screen}>
      <DotGrid width={width} height={height} />
      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ minHeight: height }}
        showsVerticalScrollIndicator={false}
      >
        <BackButton
          onPress={() => onBack?.()}
          accessibilityLabel={t('common.a11y.back')}
          style={styles.back}
        />
        <View style={styles.heading}>
          <Txt variant="noteStrong" colour={colours.textMuted}>
            {formatWeekDates(t, language, model.dates)}
          </Txt>
          <Txt variant="screenTitle" accessibilityRole="header">
            {t('week.title')}
          </Txt>
        </View>
        <Critter character="pip" species={pip.species} mood="happy" size={110} style={styles.pip} />
        <View style={styles.rows}>
          {model.rows.map((row) => (
            <Row key={row.key} row={row} species={pip.species} onNavigate={onNavigate} />
          ))}
          {model.waiting ? (
            <Row row={model.waiting} species={pip.species} onNavigate={onNavigate} />
          ) : null}
        </View>
        <View style={{ flex: 1 }} />
        <Sticker
          shadow={stickerShadows.sheet}
          radius={radii.sheetBar}
          outline={outline.bold}
          fill={colours.surface}
          style={styles.sheet}
          contentStyle={styles.sheetContent}
        >
          <Txt variant="section">{t('week.phrasesTitle')}</Txt>
          <SeedPacketGrid
            packets={model.phrases.map((p) => ({
              id: p.id,
              phrase: p.phrase,
              gloss: p.gloss,
              art: <WordObject id={p.art} size={36} />,
            }))}
          />
          <Txt variant="note" colour={colours.textMuted}>
            {t('week.seedNote')}
          </Txt>
          {model.next ? (
            <Txt variant="body">
              {t('week.next', {
                when: render(t, model.next.when),
                title: render(t, model.next.title),
              })}
            </Txt>
          ) : null}
          {model.cta ? (
            <StickerButton
              label={render(t, model.cta.label)}
              onPress={() => model.cta && onNavigate?.(model.cta.target)}
            />
          ) : null}
        </Sticker>
      </ScrollView>
    </View>
  );
}

/** One call of the week; a done call from week 2 on plays again, a waiting one says so. */
function Row({
  row,
  species,
  onNavigate,
}: {
  row: WeekRow;
  species: WeekModel['roommate']['species'];
  onNavigate: ((to: Href) => void) | undefined;
}) {
  const { t } = useLocale();
  const tag = render(t, row.tag);
  const title = render(t, row.title);
  const when = render(t, row.when);
  const target = row.target;
  const status = t(
    row.status === 'done'
      ? target
        ? 'week.slot.a11y.again'
        : 'week.slot.a11y.done'
      : row.status === 'open'
        ? 'week.slot.a11y.open'
        : 'week.slot.a11y.upcoming',
  );
  return (
    <CallSlotRow
      tag={tag}
      title={title}
      when={when}
      pictureFill={row.pictureFill}
      accent={row.accent}
      done={row.status === 'done'}
      face={
        <Face
          character={row.face.character}
          species={species}
          mood={row.face.mood}
          size={64}
          background={row.pictureFill}
        />
      }
      accessibilityLabel={
        row.fromWeek !== null
          ? t('week.waiting.a11y', { week: row.fromWeek, title })
          : `${tag}. ${title}. ${when}. ${status}`
      }
      {...(target ? { onPress: () => onNavigate?.(target) } : {})}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background, overflow: 'hidden' },
  back: { position: 'absolute', top: layout.topBar, left: layout.marginScreen },
  heading: { position: 'absolute', top: 104, left: layout.marginTitle, gap: 2 },
  pip: { position: 'absolute', top: 66, right: 16 },
  rows: {
    marginTop: 196,
    marginHorizontal: layout.marginScreen,
    gap: 8,
  },
  sheet: {
    marginTop: 12,
    marginHorizontal: layout.sheetInset,
    marginBottom: layout.sheetInset,
  },
  sheetContent: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
});
