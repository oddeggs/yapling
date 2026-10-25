import type { MomentBridge } from '@yapling/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../ui/haptics';
import { useLocale } from '../ui/locale';
import { Glass } from './dock';
import { C, F, label } from './theme';

/*
 * Between scenes, on black: where the story is and what happens next, in two or three plain
 * sentences the learner reads at their own pace (their own language beneath), then "Go on". The
 * scene behind is already painted, so it fades in as the card goes.
 */

interface Props {
  readonly bridge: MomentBridge;
  readonly gloss: boolean;
  readonly onGo: () => void;
}

export function ChapterCard({ bridge, gloss, onGo }: Props) {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeIn.duration(320)}
      exiting={FadeOut.duration(700)}
      style={[styles.root, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 28 }]}
    >
      <View style={styles.body}>
        {bridge.chapter ? (
          <Animated.Text entering={FadeIn.duration(500)} style={label}>
            {bridge.chapter}
          </Animated.Text>
        ) : null}
        <View style={styles.lines}>
          {bridge.lines.map((line, i) => (
            <Animated.Text
              key={i}
              entering={FadeInDown.duration(700).delay(350 + i * 650)}
              style={styles.line}
            >
              {line}
            </Animated.Text>
          ))}
        </View>
        {gloss && bridge.gloss ? (
          <Animated.Text
            entering={FadeIn.duration(600).delay(350 + bridge.lines.length * 650)}
            style={styles.gloss}
          >
            {bridge.gloss}
          </Animated.Text>
        ) : null}
        <Animated.Text
          entering={FadeIn.duration(600).delay(500 + bridge.lines.length * 650)}
          style={[label, styles.where]}
        >
          {bridge.card}
        </Animated.Text>
      </View>
      <Animated.View entering={FadeIn.duration(500).delay(700 + bridge.lines.length * 650)}>
        <Pressable
          onPress={() => {
            haptics.play('tap');
            onGo();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('world.go')}
          style={styles.go}
        >
          <Glass />
          <Text style={styles.goText}>{t('world.go')}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: C.bg,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: { flex: 1, justifyContent: 'center', gap: 22, alignSelf: 'stretch' },
  lines: { gap: 14 },
  line: { fontFamily: F.serif, fontSize: 25, lineHeight: 33, color: C.bone },
  gloss: { fontSize: 15, lineHeight: 22, color: C.dim },
  where: { color: C.faint, marginTop: 6 },
  go: {
    height: 48,
    minWidth: 132,
    paddingHorizontal: 24,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goText: { fontSize: 15.5, fontWeight: '600', color: C.bone },
});
