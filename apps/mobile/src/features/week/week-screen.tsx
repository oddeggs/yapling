import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { Critter } from '@yapling/art/native';
import { colours, layout, outline, radii, stickerShadows, translucent } from '@yapling/theme';
import type { Href } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

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
import { formatWeekDates, type WeekModel } from './model';

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
 * when it opens, whether it's done), and the week's phrases as seed packets with their glosses.
 */
export function WeekScreen({ model, onBack, onNavigate }: WeekScreenProps) {
  const { t, language } = useLocale();
  const { width, height } = useWindowDimensions();
  const pip = model.roommate;
  return (
    <View style={styles.screen}>
      <DotGrid width={width} height={height} />
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
        {model.rows.map((row) => {
          const tag = render(t, row.tag);
          const title = render(t, row.title);
          const when = render(t, row.when);
          const status = t(
            row.status === 'done'
              ? 'week.slot.a11y.done'
              : row.status === 'open'
                ? 'week.slot.a11y.open'
                : 'week.slot.a11y.upcoming',
          );
          const target = row.target;
          return (
            <CallSlotRow
              key={row.kind}
              tag={tag}
              title={title}
              when={when}
              pictureFill={row.pictureFill}
              accent={row.accent}
              done={row.status === 'done'}
              face={
                <Face
                  character={row.face.character}
                  species={pip.species}
                  mood={row.face.mood}
                  size={64}
                  background={row.pictureFill}
                />
              }
              accessibilityLabel={`${tag}. ${title}. ${when}. ${status}`}
              {...(target ? { onPress: () => onNavigate?.(target) } : {})}
            />
          );
        })}
      </View>
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
        {model.cta ? (
          <StickerButton
            label={render(t, model.cta.label)}
            onPress={() => model.cta && onNavigate?.(model.cta.target)}
          />
        ) : null}
      </Sticker>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background, overflow: 'hidden' },
  back: { position: 'absolute', top: layout.topBar, left: layout.marginScreen },
  heading: { position: 'absolute', top: 104, left: layout.marginTitle, gap: 2 },
  pip: { position: 'absolute', top: 66, right: 16 },
  rows: {
    position: 'absolute',
    top: 196,
    left: layout.marginScreen,
    right: layout.marginScreen,
    gap: 8,
  },
  sheet: {
    position: 'absolute',
    left: layout.sheetInset,
    right: layout.sheetInset,
    bottom: layout.sheetInset,
  },
  sheetContent: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
});
