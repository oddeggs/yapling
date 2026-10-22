import { Canvas, Group, Path } from '@shopify/react-native-skia';
import type { SettlingChapter } from '@yapling/domain';
import {
  colours,
  glass,
  motion,
  outline,
  palette,
  pill,
  radii,
  stickerCss,
  translucent,
  type,
  withAlpha,
  type Glass,
} from '@yapling/theme';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassView, Press, Txt, useKeyframes, useLocale } from '../../ui';
import { Face } from './art';
import { useStage } from './backdrop';
import { render } from './copy';
import type { SettlingListModel, SettlingRow } from './settling-model';

/*
 * The Settling-in list, a sheet over the burrow: every chapter with Linh, the ones done to play
 * again for free, the next one, the rest still to come, and "start the story" for a learner who
 * wants the letter this evening.
 */

export interface SettlingListProps {
  readonly model: SettlingListModel;
  readonly onClose: () => void;
  readonly onPlay: (chapter: SettlingChapter) => void;
  readonly onSkip: () => void;
}

/** Where the sheet starts, in the prototype's units. */
const SHEET_TOP = 236;

/** What the sheet needs below its top for the heading, six rows and the button. */
const SHEET_ROOM = 560;

/** How far the sheet runs past the bottom of the screen. */
const SHEET_BLEED = 40;

const SHEET_GLASS: Glass = {
  ...glass.panel,
  fill: withAlpha(palette.paper, 0.94),
  blur: 30,
  border: { width: 1, colour: 'rgba(255,255,255,0.95)' },
  shadow: [
    { x: 0, y: 1.5, blur: 0, spread: 0, colour: palette.white, inset: true },
    { x: 0, y: -10, blur: 30, spread: 0, colour: 'rgba(46,20,70,0.16)' },
  ],
};

const NUMBER_FILL = { done: colours.success, next: colours.accent, later: colours.surface };

const TITLE = { ...type.cardTitle, size: 26, tracking: -0.045, lineHeight: 1.2 };
const ROW_TITLE = { ...type.slotTitle, tracking: 0, lineHeight: 1.25 };
const ROW_ABOUT = { ...type.glossSmall, size: 15, lineHeight: 1.22 };

export function SettlingList({ model, onClose, onPlay, onSkip }: SettlingListProps) {
  const { t } = useLocale();
  const { y, height } = useStage();
  const { top: safeTop } = useSafeAreaInsets();
  // The board's place, raised on a short phone so all six chapters and the button fit.
  const top = Math.max(safeTop + 8, Math.min(y(SHEET_TOP), height - SHEET_ROOM));
  const rise = useKeyframes(motion.screens.infoSheet);
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      <Press
        onPress={onClose}
        haptic={null}
        accessibilityRole="button"
        accessibilityLabel={t('burrow.settling.a11y.close')}
        style={[StyleSheet.absoluteFill, styles.scrim]}
      />
      <Animated.View accessibilityViewIsModal style={[styles.sheetPlace, { top }, rise]}>
        <GlassView glass={SHEET_GLASS} radius={radii.sheetBar} style={styles.sheet}>
          <Press
            onPress={onClose}
            haptic={null}
            accessibilityRole="button"
            accessibilityLabel={t('burrow.settling.a11y.close')}
            hitSlop={12}
            style={styles.handlePlace}
          >
            <View style={styles.handle} />
          </Press>
          <View style={styles.heading} accessible accessibilityRole="header">
            <Txt variant={TITLE}>{t('burrow.settling.list.title')}</Txt>
            <Txt variant="noteStrong" colour={colours.textMuted}>
              {t('burrow.settling.list.count', { done: model.done, total: model.total })}
            </Txt>
          </View>
          <ScrollView
            style={styles.rows}
            contentContainerStyle={styles.rowsContent}
            bounces={false}
          >
            {model.rows.map((row) => (
              <ChapterRow key={row.chapter} row={row} onPlay={onPlay} />
            ))}
          </ScrollView>
          {model.canSkip ? (
            <Press
              onPress={onSkip}
              haptic="tap"
              accessibilityRole="button"
              accessibilityLabel={t('burrow.settling.list.skip')}
              style={styles.skip}
            >
              <Txt variant="buttonGlass" align="center">
                {t('burrow.settling.list.skip')}
              </Txt>
            </Press>
          ) : null}
        </GlassView>
      </Animated.View>
    </View>
  );
}

/** The replay arrow, as the board draws it (24-unit box). */
const REPLAY_ICON = 'M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5';

function ReplayIcon() {
  return (
    <Canvas style={{ width: 14, height: 14 }}>
      <Group transform={[{ scale: 14 / 24 }]}>
        <Path
          path={REPLAY_ICON}
          style="stroke"
          strokeWidth={2.8}
          strokeCap="round"
          strokeJoin="round"
          color={colours.outline}
        />
      </Group>
    </Canvas>
  );
}

function ChapterRow({
  row,
  onPlay,
}: {
  row: SettlingRow;
  onPlay: (chapter: SettlingChapter) => void;
}) {
  const { t } = useLocale();
  const about = render(t, row.about);
  const later = row.status === 'later';
  const state =
    row.status === 'done'
      ? t('burrow.settling.a11y.done')
      : row.status === 'next'
        ? t('burrow.settling.a11y.next')
        : t('burrow.settling.a11y.later', { minutes: t('burrow.settling.list.minutes') });
  return (
    <View style={[styles.row, row.status === 'next' ? styles.rowNext : null]}>
      <View
        accessible
        accessibilityLabel={`${t('burrow.settling.a11y.chapter', {
          chapter: row.chapter,
          title: row.title,
          about,
        })}. ${state}`}
        style={styles.rowMain}
      >
        <View
          style={[
            styles.number,
            { backgroundColor: NUMBER_FILL[row.status], borderStyle: later ? 'dashed' : 'solid' },
          ]}
        >
          <Txt variant={{ ...type.tag, size: 13, weight: 900 }} align="center">
            {row.status === 'done' ? '✓' : String(row.chapter)}
          </Txt>
        </View>
        <View style={[styles.face, later ? styles.faded : null]}>
          <Face character={row.face} size={34} background={row.faceFill} />
        </View>
        <View style={[styles.rowText, later ? styles.faded : null]}>
          <Txt variant={ROW_TITLE} numberOfLines={1}>
            {row.title}
          </Txt>
          <Txt variant={ROW_ABOUT} colour={colours.textGloss} numberOfLines={1}>
            {about}
          </Txt>
        </View>
      </View>
      {row.status === 'done' ? (
        <Press
          onPress={() => onPlay(row.chapter)}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel={`${t('burrow.settling.list.replay')}: ${row.title}`}
          style={styles.replay}
        >
          <ReplayIcon />
          <Txt variant="chip">{t('burrow.settling.list.replay')}</Txt>
        </Press>
      ) : null}
      {row.status === 'next' ? (
        <Press
          onPress={() => onPlay(row.chapter)}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel={`${t('burrow.settling.list.next')}: ${row.title}`}
          style={styles.next}
        >
          <Txt variant={{ ...type.buttonSmall, size: 13 }}>{t('burrow.settling.list.next')}</Txt>
        </Press>
      ) : null}
      {later ? (
        <Txt
          variant={{ ...type.noteStrong, size: 12 }}
          colour={colours.textMuted}
          style={styles.minutes}
        >
          {t('burrow.settling.list.minutes')}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 8 },
  scrim: { backgroundColor: withAlpha(palette.ink, 0.26) },
  // The sheet runs past the bottom edge so only its top corners show.
  sheetPlace: { position: 'absolute', left: 6, right: 6, bottom: -SHEET_BLEED },
  sheet: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 20 + SHEET_BLEED,
    gap: 8,
  },
  handlePlace: { alignSelf: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colours.lineArt },
  rows: { flexGrow: 0, flexShrink: 1 },
  rowsContent: { gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: radii.row,
    borderWidth: outline.regular,
    borderColor: 'transparent',
  },
  rowNext: { backgroundColor: colours.surface, borderColor: colours.outline },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  number: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: outline.regular,
    borderColor: colours.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: outline.thin,
    borderColor: colours.outline,
  },
  faded: { opacity: 0.6 },
  rowText: { flex: 1, minWidth: 0 },
  replay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingLeft: 9,
    paddingRight: 11,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: translucent.inkBorder,
    backgroundColor: colours.surface,
  },
  next: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: pill(36),
    borderWidth: outline.regular,
    borderColor: colours.outline,
    backgroundColor: colours.accent,
    boxShadow: stickerCss({ x: 0, y: 3, colour: colours.outline }),
    justifyContent: 'center',
  },
  minutes: { paddingRight: 4 },
  skip: {
    marginTop: 'auto',
    flexShrink: 0,
    height: 52,
    borderRadius: pill(52),
    borderWidth: 1.5,
    borderColor: translucent.inkBorder,
    backgroundColor: colours.surface,
    justifyContent: 'center',
  },
});
