import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import {
  isSharedValue,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { speciesOf, type Character, type Mood, type Mouth, type PipSpecies } from '../critter';
import { blinkingAt, critterIdle, idleHash, idleTransformAt } from '../motion';
import { useArtRenderer } from './context';

/** The canvas's own style type (React Native's `ViewStyle` can widen past what Skia accepts). */
type CanvasStyle = ComponentProps<typeof Canvas>['style'];

export interface CritterArtProps {
  character: Character;
  /** Pip's species, the learner's pick (others ignore it). */
  species?: PipSpecies;
  mood?: Mood;
  /** A mouth, or a shared value the lipsync drives on the UI thread (`mouthAt` on the audio clock). */
  mouth?: Mouth | SharedValue<Mouth>;
  /** Width in points; the critter is 1.2 × as tall. */
  size?: number;
  /** Idle motion and blinking, as the prototype's screens play them. */
  animated?: boolean;
  /** Where the critter's box sits inside the parent canvas. */
  x?: number;
  y?: number;
}

/**
 * A cast member inside a Skia canvas. The parts are pictures recorded once (per species, mood and
 * size) and only moved and swapped on the UI thread: the idle moves the whole critter, a blink
 * swaps the eyes, lipsync swaps the mouth.
 */
export function CritterArt({
  character,
  species: pip,
  mood = 'happy',
  mouth = 'rest',
  size = 200,
  animated = true,
  x = 0,
  y = 0,
}: CritterArtProps) {
  const renderer = useArtRenderer();
  const species = speciesOf(character, pip);
  const pics = useMemo(
    () => renderer.critter({ species, mood, size }),
    [renderer, species, mood, size],
  );
  const hash = idleHash(`${species}${size}`);
  const { idle, talking, r } = critterIdle(mood, hash);
  const height = size * 1.2;

  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    clock.value = frame.timeSinceFirstFrame;
  }, animated);

  const mouthShared = isSharedValue<Mouth>(mouth) ? mouth : null;
  const mouthFixed: Mouth = isSharedValue<Mouth>(mouth) ? 'rest' : mouth;
  const { mouths, eyes } = pics;
  const mouthPicture = useDerivedValue(() => mouths[mouthShared ? mouthShared.value : mouthFixed]);
  const eyePicture = useDerivedValue(() =>
    eyes
      ? animated && blinkingAt(clock.value, hash % 40)
        ? eyes.closed
        : eyes.open
      : pics.body[1],
  );
  const transform = useDerivedValue(() => {
    if (!animated) return [];
    const speaking = (mouthShared ? mouthShared.value : mouthFixed) !== 'rest';
    return idleTransformAt(speaking ? talking : idle, clock.value, r);
  });

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      <Group origin={{ x: size / 2, y: height }} transform={transform}>
        <Picture picture={pics.outline} />
        <Picture picture={pics.body[0]} />
        {eyes ? <Picture picture={eyePicture} /> : null}
        <Picture picture={pics.body[1]} />
        <Picture picture={mouthPicture} />
        <Picture picture={pics.body[2]} />
      </Group>
    </Group>
  );
}

export interface CritterProps extends Omit<CritterArtProps, 'x' | 'y'> {
  style?: CanvasStyle;
}

/** A cast member in its own canvas, `size` wide and `1.2 × size` tall, with room to move. */
export function Critter({ style, size = 200, ...props }: CritterProps) {
  // Room for the outline's shadow and the idle's hop (16 points up).
  const room = Math.max(20, Math.ceil(size * 0.15));
  const height = size * 1.2;
  return (
    <Canvas style={[{ width: size + 2 * room, height: height + 2 * room, margin: -room }, style]}>
      <CritterArt {...props} size={size} x={room} y={room} />
    </Canvas>
  );
}
