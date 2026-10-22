import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { PixelRatio } from 'react-native';
import {
  isSharedValue,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { speciesOf, type Character, type Mood, type Mouth, type PipSpecies } from '../critter';
import { blinkingAt, critterIdle, idleHash, idleTransformAt } from '../motion';
import type { ActName } from '../rig/acts';
import { seedOf } from '../rig/pose';
import { raisedPaws, usesRig } from '../rig/support';
import { tuneOf } from '../rig/tuning';
import { useArtRenderer } from './context';
import { useCritterPictures, useRigPictures } from './pictures';
import { RigArt } from './rig-art';

/** The canvas's own style type (React Native's `ViewStyle` can widen past what Skia accepts). */
type CanvasStyle = ComponentProps<typeof Canvas>['style'];

/**
 * What a rigged critter does. `idle` (the default) is its life at rest: breathing, weight, tail and
 * ears, blinks and glances. `listen` leans in toward `lookAt` and nods, `think` glances up and
 * aside; both hold for as long as they are asked for. `hop` and `wave` play once (again on each
 * `play`) and settle back into the idle.
 */
export type CritterAct = ActName;

export interface CritterArtProps {
  character: Character;
  /** Pip's species, the learner's pick (others ignore it). */
  species?: PipSpecies;
  mood?: Mood;
  /** A mouth, or a shared value the lipsync drives on the UI thread (`mouthAt` on the audio clock). */
  mouth?: Mouth | SharedValue<Mouth>;
  /** Width in points; the critter is 1.2 × as tall. */
  size?: number;
  /** Motion (idle life, blinks, acts). False, or Reduce Motion, holds the critter still at rest. */
  animated?: boolean;
  /**
   * What it does (see `CritterAct`). Changing it melts what is on screen into the new act at any
   * moment; moods the rig cannot move (`laugh`, `warm`, `shy`, `think`) keep today's idle instead.
   */
  act?: CritterAct;
  /** Changing it plays the act again (another hop, another wave). */
  play?: number;
  /** Which side of the screen the one it attends to is on (it leans and looks that way). */
  lookAt?: 'left' | 'right';
  /** False draws today's critter (moved as one, blinking by swapping pictures), as for a measure. */
  rig?: boolean;
  /** Where the critter's box sits inside the parent canvas. */
  x?: number;
  y?: number;
  /** For measuring: the UI-thread time of the rig's last frame (ms). */
  cost?: SharedValue<number>;
}

/**
 * A cast member inside a Skia canvas. In a mood the rig can move, it is the rig: every part a
 * picture recorded once and moved about its own joint on the UI thread, its eyes looking and its
 * lids blinking, lipsync swapping the mouth. Until the rig is recorded (after the first frame) and
 * in the other moods, it is today's critter: its parts moved as one by the mood's idle, a blink
 * swapping the eyes.
 */
export function CritterArt({
  character,
  species: pip,
  mood = 'happy',
  mouth = 'rest',
  size = 200,
  animated = true,
  act = 'idle',
  play = 0,
  lookAt = 'right',
  rig = true,
  x = 0,
  y = 0,
  cost,
}: CritterArtProps) {
  const renderer = useArtRenderer();
  const species = speciesOf(character, pip);
  const reduced = useReducedMotion();
  const live = animated && !reduced;
  const wantsRig = rig && usesRig(mood);
  const ratio = PixelRatio.get();
  const spec = useMemo(() => ({ species, mood, size }), [species, mood, size]);
  const { pics, failed } = useRigPictures(renderer, wantsRig ? spec : null, ratio);
  const tune = useMemo(() => tuneOf(species), [species]);

  if (wantsRig && pics) {
    return (
      <RigArt
        pics={pics}
        mouth={mouth}
        act={act}
        play={play}
        side={lookAt === 'left' ? -1 : 1}
        live={live}
        seed={seedOf(`${species}${size}`)}
        tune={tune}
        raised={raisedPaws(pics.pivots.ground, pics.pivots.paws, pics.unit)}
        size={size}
        x={x}
        y={y}
        cost={cost}
      />
    );
  }
  // Waiting for the rig: today's drawing at rest, which is the rig's rest pose, so the rig takes
  // over without a jump.
  const waiting = wantsRig && !failed;
  return (
    <TodayArt
      species={species}
      mood={mood}
      mouth={mouth}
      size={size}
      animated={live && !waiting}
      x={x}
      y={y}
    />
  );
}

/**
 * Today's critter: the parts are pictures recorded once (per species, mood and size) and only
 * moved and swapped on the UI thread: the idle moves the whole critter, a blink swaps the eyes,
 * lipsync swaps the mouth. Moving, its outline is cached as pixels.
 */
function TodayArt({
  species,
  mood,
  mouth,
  size,
  animated,
  x,
  y,
}: {
  species: ReturnType<typeof speciesOf>;
  mood: Mood;
  mouth: Mouth | SharedValue<Mouth>;
  size: number;
  animated: boolean;
  x: number;
  y: number;
}) {
  const renderer = useArtRenderer();
  // A moving critter's outline is cached as pixels at the screen's density.
  const pics = useCritterPictures(
    renderer,
    { species, mood, size },
    animated ? PixelRatio.get() : 0,
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

/**
 * A cast member in its own canvas, `size` wide and `1.2 × size` tall, with room around it for its
 * shadow, a hop and a raised arm. The room overflows the box and never takes touches.
 */
export function Critter({ style, size = 200, ...props }: CritterProps) {
  const room = Math.max(24, Math.ceil(size * 0.3));
  const height = size * 1.2;
  return (
    <Canvas
      pointerEvents="none"
      style={[{ width: size + 2 * room, height: height + 2 * room, margin: -room }, style]}
    >
      <CritterArt {...props} size={size} x={room} y={room} />
    </Canvas>
  );
}
