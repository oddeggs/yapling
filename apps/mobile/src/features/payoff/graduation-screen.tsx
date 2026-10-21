import { Canvas, Circle, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import type { PipSpecies } from '@yapling/art';
import { Critter } from '@yapling/art/native';
import {
  colours,
  motion,
  outline,
  palette,
  radii,
  type,
  withAlpha,
  type StickerShadow,
} from '@yapling/theme';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassSheet, Sticker, StickerButton, Tag, Txt, useKeyframes } from '../../ui';
import { DotGrid } from './art';
import type { Graduation } from './model';

/** The badge's tilted shadow, as the design offsets it (4 across, 6 down). */
const BADGE_SHADOW: StickerShadow = { x: 4, y: 6, colour: colours.outline };
const BADGE = 112;

/** A mint glow behind the roommate and a lilac one in the corner, on dotted paper. */
function Glow({ width, height }: { width: number; height: number }) {
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} color={colours.background} />
      <Circle cx={width * 0.9} cy={height * 0.9} r={Math.hypot(width, height) * 0.4}>
        <RadialGradient
          c={vec(width * 0.9, height * 0.9)}
          r={Math.hypot(width, height) * 0.4}
          colors={[withAlpha(palette.lilac, 0.4), withAlpha(palette.lilac, 0)]}
        />
      </Circle>
      <Circle cx={width / 2} cy={height * 0.3} r={Math.hypot(width, height) * 0.45}>
        <RadialGradient
          c={vec(width / 2, height * 0.3)}
          r={Math.hypot(width, height) * 0.45}
          colors={[withAlpha(palette.mint, 0.55), withAlpha(palette.mint, 0)]}
        />
      </Circle>
    </Canvas>
  );
}

/**
 * An error target the learner now owns: the badge pops in beside the roommate, "Pip stopped asking
 * about your -ed. It's yours now.", what they did, and the next target, gently.
 */
export function GraduationScreen({
  graduation,
  species,
  onDone,
}: {
  graduation: Graduation;
  species: PipSpecies;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const pop = useKeyframes(motion.screens.roundPop);
  return (
    <View style={styles.screen}>
      <Glow width={width} height={height} />
      <DotGrid width={width} height={height} />
      <Animated.View style={[styles.badge, pop]} importantForAccessibility="no-hide-descendants">
        <Sticker
          shadow={BADGE_SHADOW}
          radius={BADGE / 2}
          outline={4}
          fill={colours.success}
          style={{ transform: [{ rotate: '8deg' }] }}
          contentStyle={styles.badgeFace}
        >
          <Txt variant={{ ...type.number, size: 44, weight: 900 }}>{graduation.badge}</Txt>
        </Sticker>
      </Animated.View>
      <View style={styles.pip}>
        <Critter character="pip" species={species} mood="proud" size={180} />
      </View>
      <GlassSheet kind="info" entrance={motion.screens.infoSheet} style={{ gap: 12 }}>
        <Txt variant="headline" accessibilityRole="header">
          {graduation.title}
        </Txt>
        <Txt variant={{ ...type.body, size: 14, lineHeight: null }} colour={colours.textMuted}>
          {graduation.sub}
        </Txt>
        {graduation.next ? (
          <View style={styles.next}>
            <Tag label={graduation.next.tag} fill={colours.accentSoft} edge={outline.thin} />
            <Txt variant={{ ...type.item, lineHeight: 1.25 }} style={{ flex: 1 }}>
              {graduation.next.text}
            </Txt>
          </View>
        ) : null}
        <StickerButton label={graduation.cta} size="pair" onPress={onDone} haptic="success" />
      </GlassSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background, overflow: 'hidden' },
  badge: { position: 'absolute', top: 80, right: 42 },
  badgeFace: {
    width: BADGE - 8,
    height: BADGE - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: { position: 'absolute', top: 120, left: 30 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.row,
    backgroundColor: colours.surface,
    borderWidth: outline.regular,
    borderColor: colours.outline,
  },
});
