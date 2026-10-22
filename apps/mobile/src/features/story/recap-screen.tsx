import type { PipSpecies } from '@yapling/art';
import { Critter, Scene } from '@yapling/art/native';
import {
  colours,
  glass,
  motion,
  outline,
  palette,
  radii,
  stickerShadows,
  type,
} from '@yapling/theme';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedReaction } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  GlassView,
  Press,
  Sticker,
  StickerButton,
  Txt,
  useKeyframes,
  useLocale,
  useReduceMotion,
} from '../../ui';
import { useLipsyncClock, type Lipsync } from '../../voice';
import { DotGrid } from '../payoff/art';
import { ListenPlayer } from './listen-player';
import type { GlossReveal, RecapModel, RecapPanel } from './listening';
import { drawable, sceneOfPlace } from './places';

/*
 * "Previously in Natterwick": Pip's recap for a learner coming back, as a comic page. Pip reads it
 * aloud (its recorded line), and each panel appears as Pip reaches it, at the place it happened.
 * "Đi thôi" goes on to the episode waiting for them. Nothing was missed: the story waited.
 */

export interface RecapScreenProps {
  readonly model: RecapModel;
  readonly roommateName: string;
  readonly species: PipSpecies;
  readonly glossReveal: GlossReveal;
  readonly onGo: () => void;
  readonly onBack: () => void;
}

export function RecapScreen({
  model,
  roommateName,
  species,
  glossReveal,
  onGo,
  onBack,
}: RecapScreenProps) {
  const { t } = useLocale();
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const u = (n: number) => (n * width) / 390;
  const [played, setPlayed] = useState(false);
  const [player] = useState(
    () => new ListenPlayer({ ended: () => setPlayed(true), failed: () => setPlayed(true) }),
  );
  useLipsyncClock(player.lipsync);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    let live = true;
    void player.start().then(() => {
      if (!live) return;
      setPlaying(true);
      void player.play(model.line.lineId);
    });
    return () => {
      live = false;
      void player.dispose();
    };
  }, [player, model.line.lineId]);

  const heard = useHeard(player.lipsync, model.panels, playing && !played);
  const shown = played ? model.panels.length : Math.max(1, heard);
  const [glossOpen, setGlossOpen] = useState(false);
  const gloss = model.line.gloss;
  const glossShown = gloss !== null && (glossReveal === 'shown' || glossOpen);
  const glossTappable = gloss !== null && (glossReveal === 'marked' || glossReveal === 'on_tap');

  return (
    <View style={styles.screen} accessibilityViewIsModal onAccessibilityEscape={onBack}>
      <DotGrid width={width} height={height} />
      <View
        style={[
          styles.page,
          { paddingTop: Math.max(u(62), top + 8), paddingBottom: Math.max(10, bottom - 14) },
        ]}
      >
        <View style={styles.head}>
          <Txt variant={TITLE} accessibilityRole="header" style={{ flexShrink: 1 }}>
            {t('story.recap.title')}
          </Txt>
          <View style={styles.badge}>
            <Txt variant={BADGE}>
              {t('story.recap.badge', { season: model.season, episode: model.waiting.number })}
            </Txt>
          </View>
        </View>
        <Grid panels={model.panels} shown={shown} species={species} reduce={reduce} />
        {glossShown || glossTappable ? (
          <Press
            onPress={glossTappable ? () => setGlossOpen((o) => !o) : undefined}
            haptic={glossTappable ? 'selection' : null}
            accessibilityLabel={glossShown && gloss ? gloss : t('story.tapForMeaning')}
          >
            <GlassView glass={glass.hint} radius={radii.bubbleSmall} style={styles.glossInner}>
              {glossShown && gloss ? (
                <Txt variant="glossStory" colour={colours.textGloss}>
                  {gloss}
                </Txt>
              ) : (
                <Txt variant="labelSmall" colour={colours.textMuted}>
                  {t('story.tapForMeaning')}
                </Txt>
              )}
            </GlassView>
          </Press>
        ) : null}
        <GlassView glass={glass.panel} radius={38} style={styles.bar}>
          <View style={styles.pip} pointerEvents="none">
            <Critter
              character="pip"
              species={species}
              mood={played ? 'happy' : 'excited'}
              size={62}
              mouth={playing && !played ? player.lipsync.mouth : 'rest'}
              animated={!reduce}
            />
          </View>
          <Txt variant={BAR_TEXT} style={{ flex: 1 }}>
            {t('story.recap.withVoices', { name: roommateName })}
          </Txt>
          <StickerButton label={t('story.recap.go')} size="small" onPress={onGo} />
        </GlassView>
      </View>
    </View>
  );
}

/** How many panels Pip has reached: re-renders only when a new one starts. */
function useHeard(lipsync: Lipsync, panels: readonly RecapPanel[], playing: boolean): number {
  const [heard, setHeard] = useState(0);
  const starts = useMemo(() => panels.map((p) => p.start), [panels]);
  useAnimatedReaction(
    () => {
      if (!playing) return -1;
      const at = lipsync.charIndex.get();
      let reached = 0;
      for (const s of starts) if (s <= at) reached += 1;
      return reached;
    },
    (now, before) => {
      if (now >= 0 && now !== before) scheduleOnRN(setHeard, now);
    },
  );
  return heard;
}

/** Where each panel sits: full-width rows with a pair between, as the comic page lays them. */
function rowsOf(count: number): readonly (readonly number[])[] {
  if (count <= 2) return Array.from({ length: count }, (_, i) => [i]);
  if (count === 3) return [[0], [1, 2]];
  return [[0], [1, 2], [3]];
}

const TILTS = [-1, 1, -1.5, 0.5];

function Grid({
  panels,
  shown,
  species,
  reduce,
}: {
  panels: readonly RecapPanel[];
  shown: number;
  species: PipSpecies;
  reduce: boolean;
}) {
  const rows = rowsOf(panels.length);
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { flex: r === 2 ? 0.9 : 1 }]}>
          {row.map((i) => {
            const panel = panels[i];
            if (!panel) return null;
            return (
              <View key={i} style={{ flex: row.length === 2 && i === 1 ? 1.2 : 1 }}>
                {i < shown ? (
                  <Panel
                    panel={panel}
                    index={i}
                    species={species}
                    reduce={reduce}
                    tilt={TILTS[i % TILTS.length] ?? 0}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Panel({
  panel,
  index,
  species,
  reduce,
  tilt,
}: {
  panel: RecapPanel;
  index: number;
  species: PipSpecies;
  reduce: boolean;
  tilt: number;
}) {
  const { t } = useLocale();
  const appear = useKeyframes(motion.screens.roundPop);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const sceneH = size.w * (844 / 390);
  const critter = Math.min(size.h * 0.9, size.w * 0.5);
  return (
    <Animated.View style={[{ flex: 1 }, appear]}>
      <Sticker
        shadow={stickerShadows.badge}
        radius={0}
        outline={outline.bold}
        fill={colours.surface}
        style={{ flex: 1, transform: [{ rotate: `${tilt}deg` }] }}
        contentStyle={styles.panel}
      >
        <View
          style={StyleSheet.absoluteFill}
          onLayout={onLayout}
          accessible
          accessibilityLabel={t('story.recap.a11y.panel', { n: index + 1, text: panel.text })}
        >
          {size.w > 0 ? (
            <>
              <View style={{ position: 'absolute', left: 0, top: size.h / 2 - sceneH * 0.5 }}>
                <Scene name={sceneOfPlace(panel.place)} width={size.w} />
              </View>
              <View
                style={{ position: 'absolute', left: size.w * 0.42, top: size.h - critter * 0.95 }}
              >
                <Critter
                  character={drawable(panel.character)}
                  species={species}
                  size={critter}
                  animated={!reduce}
                />
              </View>
            </>
          ) : null}
          <View style={styles.caption}>
            <Txt variant={CAPTION}>{panel.text}</Txt>
          </View>
        </View>
      </Sticker>
    </Animated.View>
  );
}

const TITLE = { ...type.screenTitle, weight: 900 as const, tracking: -0.06, lineHeight: 0.95 };
const BADGE = { ...type.labelSmall, size: 11, tracking: 0 };
const CAPTION = { ...type.noteStrong, size: 12, lineHeight: 1.15 };
const BAR_TEXT = { ...type.body, size: 14, lineHeight: 1.2 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.peach, overflow: 'hidden' },
  page: { flex: 1, paddingHorizontal: 14, gap: 12 },
  head: {
    marginHorizontal: 4,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.frame,
    borderWidth: outline.thin,
    borderColor: colours.outline,
    backgroundColor: colours.surface,
  },
  grid: { flex: 1, gap: 10, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  panel: { flex: 1, overflow: 'hidden' },
  caption: {
    position: 'absolute',
    top: 0,
    left: 0,
    maxWidth: '82%',
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: palette.honey,
    borderRightWidth: outline.regular,
    borderBottomWidth: outline.regular,
    borderColor: colours.outline,
  },
  glossInner: { paddingVertical: 10, paddingHorizontal: 14 },
  bar: {
    marginHorizontal: -4,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  pip: { width: 62, height: 74, marginTop: -30, alignItems: 'center' },
});
