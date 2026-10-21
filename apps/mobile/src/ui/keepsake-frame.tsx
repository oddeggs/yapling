import { colours, motion, outline, palette, radii, stickerShadows } from '@yapling/theme';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CritterSlot } from './critter-slot';
import { useKeyframes } from './motion/play';
import { Sticker } from './surface';
import { Txt } from './text';

export interface KeepsakeFrameProps {
  /** "Lan can now…", with the learner's name. */
  readonly heading: string;
  /** What they can now do, in the hand font. */
  readonly canDo: string;
  /** "witnessed by Linh · Sep 25", with the day it was earned. */
  readonly witnessed: string;
  /** The witness's face from `@yapling/art`; a placeholder until then. */
  readonly witnessFace?: ReactNode;
  /** Plays the frame flying onto its string, then swaying. */
  readonly hang?: boolean;
}

/**
 * The keepsake Pip draws: a cardboard frame around a cream card, the can-do written by hand and
 * the witness's face. A placeholder for the drawn keepsake until the drawn one replaces it.
 */
export function KeepsakeFrame({
  heading,
  canDo,
  witnessed,
  witnessFace,
  hang = false,
}: KeepsakeFrameProps) {
  const fly = useKeyframes(motion.screens.keepsakeFrame, { active: hang });
  const sway = useKeyframes(motion.screens.keepsakeSway, { active: hang });
  return (
    <Animated.View
      style={[{ transformOrigin: '50% 0%' }, hang ? sway : null]}
      accessible
      accessibilityLabel={`${heading} ${canDo}. ${witnessed}`}
    >
      {hang ? <KeepsakeString /> : null}
      <Animated.View style={hang ? fly : null}>
        <Sticker
          shadow={stickerShadows.card}
          radius={radii.frame}
          outline={outline.heavy}
          fill={palette.cardboard}
          contentStyle={{ padding: 10 }}
        >
          <View
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: radii.paper,
              borderWidth: outline.thin,
              borderColor: colours.outline,
              backgroundColor: colours.surfacePaper,
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Txt variant="handNote" colour={colours.textHand} align="center">
              {heading}
            </Txt>
            <Txt variant="keepsake" align="center">
              {canDo}
            </Txt>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  overflow: 'hidden',
                  borderWidth: outline.thin,
                  borderColor: colours.outline,
                }}
              >
                {witnessFace ?? <CritterSlot kind="face" size={36} />}
              </View>
              <Txt variant="handNote" align="center" style={{ flexShrink: 1 }}>
                {witnessed}
              </Txt>
            </View>
          </View>
        </Sticker>
      </Animated.View>
    </Animated.View>
  );
}

/** The string the keepsake hangs from: two lines up to a nail, as the prototype draws it. */
const STRING = { width: 208, height: 34, nail: 5 } as const;

function KeepsakeString() {
  const { width: w, height: h, nail } = STRING;
  const path = useMemo(() => {
    return Skia.PathBuilder.Make()
      .moveTo(nail, h)
      .lineTo(w / 2, 6)
      .lineTo(w - nail, h)
      .build();
  }, [w, h, nail]);
  return (
    <Canvas style={{ width: w, height: h, alignSelf: 'center' }}>
      <Path path={path} color={colours.outline} style="stroke" strokeWidth={outline.regular} />
      <Circle cx={w / 2} cy={6} r={nail} color={colours.outline} />
    </Canvas>
  );
}
