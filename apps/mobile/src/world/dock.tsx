import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../ui/haptics';
import { useLocale } from '../ui/locale';
import { Icon, type IconName } from './icons';
import { C, SNAP, SPRING } from './theme';

/*
 * The one control: a single piece of glass at the bottom that morphs. A quiet hint when idle, an
 * ember that breathes with the learner's voice while they speak, three choices when the scene is
 * tapped (say it again, pause, menu), "go on" after a kept painting, and the kind out-of-time line.
 */

export type DockMode = 'hidden' | 'hint' | 'ember' | 'controls' | 'paused' | 'go' | 'out';

const SIZE: Readonly<Record<DockMode, { w: number; h: number }>> = {
  hidden: { w: 44, h: 44 },
  hint: { w: 150, h: 40 },
  ember: { w: 56, h: 56 },
  controls: { w: 184, h: 58 },
  paused: { w: 128, h: 58 },
  go: { w: 118, h: 44 },
  out: { w: 236, h: 44 },
};

interface Props {
  readonly mode: DockMode;
  readonly hint: string;
  readonly hintIcon?: IconName | null;
  /** The learner's voice, 0–1, while hands-free hears them. */
  readonly level: SharedValue<number> | null;
  readonly onHint: () => void;
  readonly onAgain: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onMenu: () => void;
  readonly onGo: () => void;
  readonly onOut: () => void;
  /** Bumps when a kept painting flies into the dock. */
  readonly bump: number;
}

export function Dock(p: Props) {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const size =
    p.mode === 'hint'
      ? { w: Math.min(280, 40 + p.hint.length * 7.4 + (p.hintIcon ? 24 : 0)), h: 40 }
      : p.mode === 'out'
        ? { w: Math.min(320, 48 + t('world.out').length * 7.6), h: 44 }
        : SIZE[p.mode];
  const w = useSharedValue(size.w);
  const h = useSharedValue(size.h);
  const shown = useSharedValue(p.mode === 'hidden' ? 0 : 1);
  const bump = useSharedValue(1);

  useEffect(() => {
    w.value = withSpring(size.w, SPRING);
    h.value = withSpring(size.h, SPRING);
    shown.value = withSpring(p.mode === 'hidden' ? 0 : 1, SPRING);
  }, [p.mode, size.w, size.h, w, h, shown]);

  useEffect(() => {
    if (p.bump === 0) return;
    bump.value = withSequence(withSpring(1.18, SNAP), withSpring(1, SPRING));
    haptics.play('success');
  }, [p.bump, bump]);

  const box = useAnimatedStyle(() => ({
    width: w.value,
    height: h.value,
    borderRadius: h.value / 2,
    opacity: shown.value,
    transform: [{ scale: (0.86 + 0.14 * shown.value) * bump.value }],
  }));

  const press = (fn: () => void) => () => {
    haptics.play('tap');
    fn();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 14 }]}
    >
      <Animated.View
        style={[styles.piece, box]}
        pointerEvents={p.mode === 'hidden' ? 'none' : 'auto'}
      >
        <Glass />
        {p.mode === 'hint' && (
          <Content key="hint">
            <Pressable style={styles.hint} onPress={press(p.onHint)} hitSlop={10}>
              {p.hintIcon ? <Icon name={p.hintIcon} size={16} color={C.dim} /> : null}
              <Text style={styles.hintText} numberOfLines={1}>
                {p.hint}
              </Text>
            </Pressable>
          </Content>
        )}
        {p.mode === 'ember' && (
          <Content key="ember">
            <Ember level={p.level} />
          </Content>
        )}
        {p.mode === 'controls' && (
          <Content key="controls">
            <View style={styles.row}>
              <Btn icon="again" label={t('world.a11y.again')} onPress={press(p.onAgain)} />
              <Btn icon="pause" label={t('world.a11y.pause')} onPress={press(p.onPause)} />
              <Btn icon="menu" label={t('world.a11y.menu')} onPress={press(p.onMenu)} />
            </View>
          </Content>
        )}
        {p.mode === 'paused' && (
          <Content key="paused">
            <View style={styles.row}>
              <Btn icon="play" label={t('world.a11y.resume')} onPress={press(p.onResume)} />
              <Btn icon="menu" label={t('world.a11y.menu')} onPress={press(p.onMenu)} />
            </View>
          </Content>
        )}
        {p.mode === 'go' && (
          <Content key="go">
            <Pressable style={styles.fill} onPress={press(p.onGo)}>
              <Text style={styles.word}>{t('world.go')}</Text>
            </Pressable>
          </Content>
        )}
        {p.mode === 'out' && (
          <Content key="out">
            <Pressable style={styles.fill} onPress={press(p.onOut)}>
              <Text style={styles.word}>{t('world.out')}</Text>
            </Pressable>
          </Content>
        )}
      </Animated.View>
    </View>
  );
}

function Glass() {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        style={StyleSheet.absoluteFill}
        glassEffectStyle="regular"
        colorScheme="dark"
        isInteractive
      />
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
    </View>
  );
}

function Content({ children }: { children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeIn.duration(260).delay(90)}
      exiting={FadeOut.duration(140)}
      style={styles.content}
    >
      {children}
    </Animated.View>
  );
}

function Btn({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      hitSlop={6}
    >
      <Icon name={icon} size={22} />
    </Pressable>
  );
}

/** The ember: it breathes slowly when quiet and swells with the learner's voice. */
function Ember({ level }: { level: SharedValue<number> | null }) {
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
  }, [breath]);
  const style = useAnimatedStyle(() => {
    const lv = level ? level.value : 0;
    const s = 0.62 + 0.1 * breath.value + 0.5 * lv;
    return {
      transform: [{ scale: s }],
      opacity: interpolate(lv, [0, 1], [0.78, 1]),
      shadowOpacity: 0.5 + 0.4 * lv,
    };
  });
  return <Animated.View style={[styles.ember, style]} />;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  piece: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fallback: { backgroundColor: 'rgba(28,25,32,0.55)' },
  content: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  hintText: { color: C.dim, fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: 'rgba(255,255,255,0.12)', transform: [{ scale: 0.92 }] },
  fill: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  word: { color: C.bone, fontSize: 13.5, fontWeight: '600' },
  ember: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.ember,
    shadowColor: C.ember,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
});
