import type { PipSpecies } from '@yapling/art';
import { Critter, Scene } from '@yapling/art/native';
import { colours, motion, outline, palette, translucent, type } from '@yapling/theme';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Press, StickerButton, Txt, useKeyframes, useLocale, useReduceMotion } from '../../ui';
import type { EpisodeEndModel } from './listening';
import { drawable, sceneOfPlace, Silhouette } from './places';

/*
 * The end of an episode's week, as a title card: the episode's place behind its cast, its title
 * large, and next week's teaser (who's coming as a silhouette, when it opens; missed weeks wait).
 * "Về thị trấn" goes home, the season map shows the way ahead.
 */

export interface EpisodeEndScreenProps {
  readonly model: EpisodeEndModel;
  readonly species: PipSpecies;
  /** When the next episode opens, as the teaser says it ("Out Monday · …"). */
  readonly when: string | null;
  readonly onHome: () => void;
  readonly onSeasonMap: () => void;
}

export function EpisodeEndScreen({
  model,
  species,
  when,
  onHome,
  onSeasonMap,
}: EpisodeEndScreenProps) {
  const { t } = useLocale();
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const k = width / 390;
  const u = (n: number) => n * k;
  const titleIn = useKeyframes(motion.screens.postDone);
  const teaserIn = useKeyframes(motion.screens.postSheet);
  const guest = model.cast.find((c) => c !== 'pip') ?? 'pip';
  const titleLines = model.title.toUpperCase().split(/\s+/).filter(Boolean);
  const next = model.next;
  const nextKicker =
    next?.kind === 'episode'
      ? t('story.end.nextEpisode', { episode: next.episode })
      : t('story.end.nextWeek');
  const nextTitle = next ? t('story.end.nextTitle', { title: next.title }) : null;
  return (
    <View style={styles.screen}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Scene name={sceneOfPlace(model.place)} width={width} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: translucent.scrim }]} />
      </View>
      <View style={[styles.band, { top: 0, height: Math.max(u(96), top + 40) }]} />
      <View style={[styles.band, { bottom: 0, height: u(300) + bottom }]} />
      <View style={{ position: 'absolute', top: u(286), left: u(60) }} pointerEvents="none">
        <Critter character={drawable(guest)} mood="worried" size={u(130)} animated={!reduce} />
      </View>
      <View style={{ position: 'absolute', top: u(310), left: u(200) }} pointerEvents="none">
        <Critter
          character="pip"
          species={species}
          mood="surprised"
          size={u(130)}
          animated={!reduce}
        />
      </View>
      <View style={[styles.head, { top: Math.max(u(118), top + 62) }]}>
        <Txt variant={KICKER} colour={colours.accent}>
          {t('story.end.kicker', { season: model.season, episode: model.episode })}
        </Txt>
        <Animated.View style={[{ transformOrigin: '0% 50%' }, titleIn]}>
          {/* A word to a line, as the title card sets it; a long word shrinks to fit. */}
          <Txt
            variant={TITLE}
            colour={colours.textOnInk}
            accessibilityRole="header"
            accessibilityLabel={model.title}
            numberOfLines={titleLines.length}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            style={styles.title}
          >
            {titleLines.join('\n')}
          </Txt>
        </Animated.View>
      </View>
      <View style={[styles.foot, { bottom: 24 + bottom }]}>
        {next ? (
          <Animated.View
            style={[styles.teaser, teaserIn]}
            accessible
            accessibilityLabel={t('story.end.a11y.next', {
              title: next.title,
              when: when ?? '',
            })}
          >
            <View style={styles.guest}>
              {next.kind === 'episode' ? (
                <Silhouette character={next.face} size={78} colour={palette.plum} />
              ) : null}
              <Txt variant={QUESTION} colour={colours.accent} style={styles.question}>
                ?
              </Txt>
            </View>
            <View style={styles.teaserText}>
              <Txt variant={NEXT_KICKER} colour={colours.accent}>
                {nextKicker}
              </Txt>
              <Txt variant={NEXT_TITLE} colour={colours.textOnInk}>
                {nextTitle}
              </Txt>
              {when ? (
                <Txt variant={WHEN} colour={palette.line}>
                  {when}
                </Txt>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
        <View style={styles.buttons}>
          <Press onPress={onHome} haptic="tap" style={styles.home}>
            <Txt variant="buttonGlass" colour={colours.textOnInk}>
              {t('story.end.backToTown')}
            </Txt>
          </Press>
          <StickerButton
            label={t('call.done.seasonMap')}
            size="pair"
            onPress={onSeasonMap}
            style={{ flex: 1.3 }}
          />
        </View>
      </View>
    </View>
  );
}

const KICKER = { ...type.kicker, size: 12, tracking: 0.12 };
const TITLE = { ...type.hero, size: 76, tracking: -0.07, lineHeight: 0.8 };
const NEXT_KICKER = { ...type.kicker, size: 11, tracking: 0.1 };
const NEXT_TITLE = { ...type.cardTitle, size: 24, lineHeight: 1 };
const WHEN = { ...type.note, size: 12.5 };
const QUESTION = { ...type.sticker, size: 22 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ink, overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, backgroundColor: palette.ink },
  head: { position: 'absolute', left: 20, right: 20, gap: 4 },
  title: {
    marginTop: 12,
    textShadowColor: palette.lilac,
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 0,
  },
  foot: { position: 'absolute', left: 16, right: 16, gap: 14 },
  teaser: { flexDirection: 'row', gap: 6, height: 96 },
  guest: {
    flex: 1,
    borderWidth: outline.regular - 0.5,
    borderColor: palette.muted,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: palette.night,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  question: { position: 'absolute', top: 4, right: 8 },
  teaserText: { flex: 2.2, justifyContent: 'center', gap: 4, paddingLeft: 8 },
  buttons: { flexDirection: 'row', gap: 10 },
  home: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: translucent.lockGlass,
    backgroundColor: translucent.lockGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
