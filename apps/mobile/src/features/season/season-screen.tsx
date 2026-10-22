import { Canvas, DashPathEffect, Group, Path } from '@shopify/react-native-skia';
import { Scene } from '@yapling/art/native';
import type { Place } from '@yapling/story';
import type { StringKey } from '@yapling/i18n';
import {
  colours,
  glass,
  layout,
  motion,
  outline,
  palette,
  radii,
  sampleTrack,
  stickerShadows,
  translucent,
  type,
} from '@yapling/theme';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  GlassView,
  Press,
  StickerButton,
  Sticker,
  Txt,
  useLocale,
  useReduceMotion,
  useClock,
} from '../../ui';
import { glowTracks } from '../../ui/motion/keyframes';
import { Face } from '../burrow/art';
import type { CharacterId } from '@yapling/contracts';
import type { SeasonMapModel, SeasonPin } from './season-model';

/*
 * The season map: the town with the season's route walked so far, a pin per episode, the next
 * season's boat on the horizon, the season's title at the top and the next episode at the bottom.
 */

const PLACE_KEY: Readonly<Record<Place, string>> = {
  burrow: 'burrow',
  'lantern-cafe': 'lanternCafe',
  'hollowbrook-office': 'hollowbrookOffice',
  'lantern-inn': 'lanternInn',
  'bus-45': 'bus45',
  'town-square': 'townSquare',
};

export const placeKey = (prefix: 'season.place' | 'season.pin', place: Place) =>
  `${prefix}.${PLACE_KEY[place]}` as StringKey;

export interface SeasonScreenProps {
  readonly model: SeasonMapModel;
  /** The finished episode picked to play again, if any. */
  readonly picked: SeasonPin | null;
  /** The face on a picked episode's card. */
  readonly pickedFace: CharacterId | null;
  readonly onBack: () => void;
  readonly onContinue: () => void;
  /** A pin with something to play was tapped. */
  readonly onPin: (pin: SeasonPin) => void;
  readonly onReplay: (pin: SeasonPin) => void;
}

const PIN = 36;
const PIN_BORDER = 2.5;

export function SeasonScreen({
  model,
  picked,
  pickedFace,
  onBack,
  onContinue,
  onPin,
  onReplay,
}: SeasonScreenProps) {
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const k = width / layout.screen.width;
  const u = (n: number) => n * k;
  const barTop = Math.max(u(layout.topBar), top + 4);
  const next = model.next;
  const tr = t as (key: StringKey, params?: Record<string, string | number>) => string;
  return (
    <View style={styles.screen}>
      <Scene name="town" width={width} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: translucent.paperWash }]} />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group transform={[{ scale: k }]}>
          <Path
            path={model.path.done}
            style="stroke"
            strokeWidth={7}
            strokeCap="round"
            color={palette.ink}
          >
            <DashPathEffect intervals={[0.1, 12]} />
          </Path>
          <Path
            path={model.path.done}
            style="stroke"
            strokeWidth={4.5}
            strokeCap="round"
            color={palette.lilac}
          >
            <DashPathEffect intervals={[0.1, 12]} />
          </Path>
          <Path
            path={model.path.rest}
            style="stroke"
            strokeWidth={4}
            strokeCap="round"
            color={palette.ink}
            opacity={0.55}
          >
            <DashPathEffect intervals={[0.1, 11]} />
          </Path>
          <Path
            path={model.path.tail}
            style="stroke"
            strokeWidth={4}
            strokeCap="round"
            color={palette.cyan}
          >
            <DashPathEffect intervals={[0.1, 9]} />
          </Path>
        </Group>
      </Canvas>
      {model.pins.map((pin) => (
        <Pin
          key={pin.id}
          pin={pin}
          k={k}
          picked={picked?.episode === pin.episode}
          label={tr(placeKey('season.pin', pin.place))}
          a11y={t('season.a11y.pin', {
            episode: pin.episode,
            title: pin.title,
            state: t(`season.a11y.${pin.state}`),
          })}
          onPress={pin.action ? () => onPin(pin) : undefined}
        />
      ))}
      <View style={{ position: 'absolute', left: u(232), top: u(676) }} pointerEvents="none">
        <Scene name="festival-boat" width={u(120)} />
      </View>
      <View style={[styles.comingSoon, { left: u(96), top: u(714) }]}>
        <Txt variant={TAG} colour={colours.textOnInk}>
          {t('season.comingSoon', { season: model.season + 1 })}
        </Txt>
      </View>
      <BackButton
        onPress={onBack}
        accessibilityLabel={t('common.a11y.back')}
        style={[styles.back, { top: barTop }]}
      />
      <GlassView glass={glass.panel} radius={radii.bubble} style={[styles.title, { top: barTop }]}>
        <Txt variant="label" colour={colours.textMuted}>
          {t('season.top', {
            season: model.season,
            episode: model.onEpisode,
            episodes: model.episodes,
          })}
        </Txt>
        <Txt variant="episodeTitle" accessibilityRole="header">
          {model.title}
        </Txt>
      </GlassView>
      {picked ? (
        <GlassView glass={glass.panel} radius={radii.bar32} style={styles.next}>
          <View style={styles.nextFace}>
            <Face
              character={faceOf(pickedFace ?? 'pip')}
              size={44 - outline.regular * 2}
              background={palette.mintTint}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="labelSmall" colour={colours.textMuted}>
              {t('season.replayKicker', { episode: picked.episode })}
            </Txt>
            <Txt variant={NEXT_TITLE}>{picked.title}</Txt>
          </View>
          <StickerButton label={t('season.replay')} size="small" onPress={() => onReplay(picked)} />
        </GlassView>
      ) : next ? (
        <GlassView glass={glass.panel} radius={radii.bar32} style={styles.next}>
          <View style={styles.nextFace}>
            <Face
              character={faceOf(next.face)}
              size={44 - outline.regular * 2}
              background={palette.cyanTint}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="labelSmall" colour={colours.textMuted}>
              {t('season.next', {
                episode: next.episode,
                place: tr(placeKey('season.place', next.place)),
              })}
            </Txt>
            <Txt variant={NEXT_TITLE}>
              {next.opensOn
                ? t('season.nextWhen', {
                    title: next.title,
                    day: tr(`common.weekday.${next.opensOn}`),
                  })
                : next.title}
            </Txt>
          </View>
          <StickerButton label={t('common.continue')} size="small" onPress={onContinue} />
        </GlassView>
      ) : model.festival ? (
        <GlassView glass={glass.panel} radius={radii.bar32} style={styles.next}>
          <View style={{ flex: 1 }}>
            <Txt variant="labelSmall" colour={colours.textMuted}>
              {t('season.festivalKicker', { season: model.season })}
            </Txt>
            <Txt variant={NEXT_TITLE}>{model.festival.title}</Txt>
            <Txt variant="note" colour={colours.textMuted}>
              {t('season.festivalHint')}
            </Txt>
          </View>
          <StickerButton label={t('common.continue')} size="small" onPress={onContinue} />
        </GlassView>
      ) : null}
    </View>
  );
}

const TAG = { ...type.label, uppercase: false, tracking: 0 };
const NEXT_TITLE = { ...type.episodeTitle, size: 18, tracking: -0.03 };
const PIN_NUMBER = { ...type.buttonSmall, size: 15 };
const PIN_LABEL = { ...type.labelSmall, tracking: 0 };

/** Faces the art can draw; the office's voices have none, so Pip stands in. */
function faceOf(id: string) {
  return (id === 'office' || id === 'mags' ? 'pip' : id) as Parameters<typeof Face>[0]['character'];
}

const FILL: Readonly<Record<SeasonPin['state'], string>> = {
  done: colours.success,
  current: colours.accent,
  upcoming: colours.surface,
};

const glow = glowTracks(motion.call.micGlow.keyframes.tracks.boxShadow ?? []);

function Pin({
  pin,
  k,
  picked,
  label,
  a11y,
  onPress,
}: {
  pin: SeasonPin;
  k: number;
  picked: boolean;
  label: string;
  a11y: string;
  onPress: (() => void) | undefined;
}) {
  const { t } = useLocale();
  const reduce = useReduceMotion();
  const current = pin.state === 'current';
  const clock = useClock(motion.call.micGlow, { active: current && !reduce });
  const halo = useAnimatedStyle(() => {
    const p = (clock.get() % motion.call.micGlow.durationMs) / motion.call.micGlow.durationMs;
    const spread = sampleTrack(glow.spread, p, motion.call.micGlow.easing);
    const alpha = sampleTrack(glow.alpha, p, motion.call.micGlow.easing);
    return { opacity: alpha, transform: [{ scale: (PIN + 2 * spread) / PIN }] };
  });
  return (
    <Press
      onPress={onPress}
      haptic={onPress ? 'selection' : null}
      accessibilityLabel={a11y}
      {...(onPress
        ? {
            accessibilityHint:
              pin.action === 'replay' ? t('season.a11y.replayHint') : t('season.a11y.playHint'),
          }
        : {})}
      hitSlop={8}
      style={{
        position: 'absolute',
        left: pin.x * k - PIN / 2,
        top: pin.y * k - PIN / 2,
      }}
    >
      {current ? <Animated.View pointerEvents="none" style={[styles.halo, halo]} /> : null}
      {picked ? <View pointerEvents="none" style={styles.picked} /> : null}
      <Sticker
        shadow={stickerShadows.chip}
        radius={PIN / 2}
        outline={PIN_BORDER}
        fill={FILL[pin.state]}
        contentStyle={[styles.pin, pin.state === 'upcoming' ? { borderStyle: 'dashed' } : null]}
      >
        <Txt variant={PIN_NUMBER}>{pin.episode}</Txt>
      </Sticker>
      {pin.state === 'done' ? <View style={styles.keepsake} /> : null}
      <View style={styles.pinLabelRow} pointerEvents="none">
        <View style={styles.pinLabel}>
          <Txt variant={PIN_LABEL} colour={colours.textOnInk} numberOfLines={1}>
            {label}
          </Txt>
        </View>
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.mapSky, overflow: 'hidden' },
  back: { position: 'absolute', left: layout.marginScreen },
  title: {
    position: 'absolute',
    left: 62,
    right: layout.marginScreen,
    paddingVertical: 8,
    paddingHorizontal: 14,
    zIndex: 4,
  },
  next: {
    position: 'absolute',
    left: layout.sheetInset,
    right: layout.sheetInset,
    bottom: layout.sheetInset,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 14,
  },
  nextFace: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: outline.regular,
    borderColor: colours.outline,
  },
  comingSoon: {
    position: 'absolute',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.tagLarge,
    backgroundColor: palette.ink,
    transform: [{ rotate: '-4deg' }],
  },
  pin: { width: PIN, height: PIN, alignItems: 'center', justifyContent: 'center' },
  picked: {
    position: 'absolute',
    left: -5,
    top: -5,
    width: PIN + 10,
    height: PIN + 10,
    borderRadius: (PIN + 10) / 2,
    borderWidth: outline.regular,
    borderColor: palette.lilac,
  },
  halo: {
    position: 'absolute',
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    backgroundColor: palette.lilac,
  },
  keepsake: {
    position: 'absolute',
    top: -12,
    right: -14,
    width: 20,
    height: 16,
    borderRadius: 3,
    backgroundColor: colours.surface,
    borderWidth: outline.thin,
    borderColor: colours.outline,
    transform: [{ rotate: '8deg' }],
  },
  // Centred under the pin, wider than it.
  pinLabelRow: {
    position: 'absolute',
    top: 38,
    left: PIN / 2 - 60,
    width: 120,
    alignItems: 'center',
  },
  pinLabel: {
    paddingVertical: 1,
    paddingHorizontal: 7,
    borderRadius: radii.tag,
    backgroundColor: palette.ink,
  },
});
