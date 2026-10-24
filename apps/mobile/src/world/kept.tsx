import type { Painting } from '@yapling/contracts';
import { PLACES, clockLabel, isPlaceId } from '@yapling/scene';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useLocale } from '../ui/locale';
import { C, F, SOFT, label } from './theme';

/*
 * A kept painting: when a conversation ends the moment condenses into a framed picture under a
 * soft gallery light, with its title, the time, one plain line on what the learner did and one on
 * what the resident learned from them. Dismissed, it flies into the control, where the wall lives.
 */

interface Props {
  readonly painting: Painting;
  /** The painting re-painted for the card (a data URL), once ready. */
  readonly image: string | null;
  readonly speakerName: string;
  readonly outAfter: boolean;
  readonly leaving: boolean;
  readonly onTap: () => void;
  readonly onPlus: () => void;
  readonly onGone: () => void;
}

export function shortDate(ms: number, language: string): string {
  return new Date(ms).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function KeptCard(p: Props) {
  const { t, language } = useLocale();
  const { width, height } = useWindowDimensions();
  const bg = useSharedValue(0);
  const frame = useSharedValue(0);
  const words = useSharedValue(0);
  const fly = useSharedValue(0);

  useEffect(() => {
    bg.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    frame.value = withSpring(1, SOFT);
    words.value = withDelay(
      650,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
  }, [bg, frame, words]);

  useEffect(() => {
    if (!p.leaving) return;
    const gone = p.onGone;
    words.value = withTiming(0, { duration: 260 });
    fly.value = withTiming(1, { duration: 620, easing: Easing.bezier(0.5, 0, 0.75, 0.2) });
    bg.value = withDelay(
      150,
      withTiming(0, { duration: 700 }, (done) => {
        if (done) scheduleOnRN(gone);
      }),
    );
  }, [p.leaving, p.onGone, bg, fly, words]);

  const frameW = width * 0.66;
  const frameH = frameW * 1.25;
  // From the frame's centre to the control's, so it lands in the dock.
  const dx = 0;
  const dy = height - 60 - height * 0.42;

  const bgStyle = useAnimatedStyle(() => ({ opacity: bg.value }));
  const frameStyle = useAnimatedStyle(() => ({
    opacity: frame.value * (1 - fly.value),
    transform: [
      { translateX: dx * fly.value },
      { translateY: -24 * (1 - frame.value) + dy * fly.value },
      { scale: (1.55 - 0.55 * frame.value) * (1 - 0.93 * fly.value) },
    ],
  }));
  const wordsStyle = useAnimatedStyle(() => ({
    opacity: words.value,
    transform: [{ translateY: 10 * (1 - words.value) }],
  }));

  const pt = p.painting;
  const place = isPlaceId(pt.place) ? PLACES[pt.place].name : pt.place;
  const did = pt.canDos[0] ?? null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.dark]} />
        <View
          style={[styles.light, { width: width * 1.4, height: height * 0.7, left: -width * 0.2 }]}
        />
      </Animated.View>
      <Pressable style={styles.center} onPress={p.onTap}>
        <Animated.View style={[styles.frame, { width: frameW, height: frameH }, frameStyle]}>
          {p.image ? (
            <Image source={{ uri: p.image }} style={styles.img} />
          ) : (
            <View style={styles.img} />
          )}
        </Animated.View>
        <Animated.View style={[styles.words, wordsStyle]}>
          <Text style={styles.title}>{`‘${pt.title}’`}</Text>
          <Text style={[label, styles.meta]}>
            {`${place} · ${clockLabel(pt.hour)} · ${t('world.kept', { date: shortDate(pt.keptAt, language) })}`}
          </Text>
          {(did || pt.learned) && (
            <View style={styles.notes}>
              {did ? (
                <View style={styles.note}>
                  <Text style={styles.noteK}>{t('world.kept.you')}</Text>
                  <Text style={styles.noteV}>
                    {did.replace(/^You (\w)/, (_, c: string) => c.toUpperCase())}
                  </Text>
                </View>
              ) : null}
              {pt.learned ? (
                <View style={styles.note}>
                  <Text style={styles.noteK}>
                    {t('world.kept.learned', { name: p.speakerName })}
                  </Text>
                  <Text style={styles.noteV}>{pt.learned}</Text>
                </View>
              ) : null}
            </View>
          )}
          {p.outAfter && (
            <View style={styles.extra}>
              <Text style={styles.extraText}>{t('world.kept.out', { name: p.speakerName })}</Text>
              <Pressable style={styles.pill} onPress={p.onPlus}>
                <Text style={styles.pillText}>{t('world.kept.seePlus')}</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dark: { backgroundColor: 'rgba(7,6,9,0.78)' },
  light: {
    position: 'absolute',
    top: -80,
    borderRadius: 999,
    backgroundColor: 'rgba(255,226,190,0.07)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 90,
  },
  frame: {
    backgroundColor: '#0b0a0d',
    padding: 5,
    shadowColor: '#000',
    shadowOpacity: 0.9,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 18 },
  },
  img: { flex: 1, backgroundColor: '#141218' },
  words: { alignItems: 'center', width: '100%' },
  title: {
    marginTop: 26,
    textAlign: 'center',
    color: C.bone,
    fontFamily: F.serif,
    fontStyle: 'italic',
    fontSize: 26,
    lineHeight: 29,
    letterSpacing: -0.26,
  },
  meta: { marginTop: 10, textAlign: 'center' },
  notes: {
    marginTop: 22,
    width: '100%',
    gap: 9,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: C.panel,
  },
  note: { flexDirection: 'row', gap: 8 },
  noteK: {
    width: 88,
    fontSize: 9.5,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: C.faint,
  },
  noteV: { flex: 1, fontSize: 14, lineHeight: 19.6, color: C.bone },
  extra: { marginTop: 22, alignItems: 'center', gap: 12 },
  extraText: { textAlign: 'center', fontSize: 13.5, lineHeight: 19.5, color: C.dim },
  pill: {
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 21,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pillText: { color: C.bone, fontSize: 14, fontWeight: '600' },
});
