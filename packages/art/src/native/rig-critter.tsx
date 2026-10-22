import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio } from 'react-native';
import type { ComponentProps } from 'react';
import { isSharedValue, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { speciesOf, type Character, type Mood, type Mouth, type PipSpecies } from '../critter';
import { ACTS, type ActName } from '../rig/acts';
import { drawRig, REST_POSE } from '../rig/draw';
import { IDLE_PERIOD, poseAt, seedOf } from '../rig/pose';
import { useLoopClock, useOneShotClock } from './clock';
import { useArtRenderer } from './context';

type CanvasStyle = ComponentProps<typeof Canvas>['style'];

export interface RigCritterArtProps {
  character: Character;
  species?: PipSpecies;
  mood?: Mood;
  /** A mouth, or a shared value the lipsync drives on the UI thread (as `CritterArt`). */
  mouth?: Mouth | SharedValue<Mouth>;
  size?: number;
  /** What it does; it plays once per `play` and holds at rest, the idle never stopping under it. */
  act?: ActName;
  /** Changing it plays the act again. */
  play?: number;
  /** Which way the speaker is (the act turns toward it): 1 the viewer's right, −1 the left. */
  side?: 1 | -1;
  /** Reduce Motion: the critter holds still at rest, exactly as the generator draws it. */
  reduced?: boolean;
  x?: number;
  y?: number;
  /** For measuring: the UI-thread time of the last frame's pose and drawing (ms). */
  cost?: SharedValue<number>;
}

/**
 * A cast member as a rig: each part a cached picture moved about its own joint by one character's
 * clocks (an idle loop and an act), the pose computed and drawn on the UI thread each frame.
 */
export function RigCritterArt({
  character,
  species: pip,
  mood = 'happy',
  mouth = 'rest',
  size = 200,
  act = 'breathe',
  play = 0,
  side = 1,
  reduced = false,
  x = 0,
  y = 0,
  cost,
}: RigCritterArtProps) {
  const renderer = useArtRenderer();
  const species = speciesOf(character, pip);
  const pics = useMemo(
    // Outlines are cached as pixels at the screen's density.
    () => renderer.critterRig({ species, mood, size }, PixelRatio.get()),
    [renderer, species, mood, size],
  );
  const seed = seedOf(`${species}${size}`);
  const spec = ACTS[act];
  const idle = useLoopClock(IDLE_PERIOD, !reduced);
  const acting = useOneShotClock(spec.duration, play, reduced);
  const mouthShared = isSharedValue<Mouth>(mouth) ? mouth : null;
  const mouthFixed: Mouth = isSharedValue<Mouth>(mouth) ? 'rest' : mouth;
  const bounds = useMemo(() => Skia.XYWHRect(-size, -size, size * 3, size * 3.4), [size]);

  const picture = useDerivedValue(() => {
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const start = cost ? now() : 0;
    // Reduce Motion holds the generator's own drawing: every part at rest.
    const pose = reduced ? REST_POSE : poseAt(idle.value, acting.value, spec, side, seed);
    const m = pics.mouths[mouthShared ? mouthShared.value : mouthFixed];
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(bounds);
    canvas.translate(x, y);
    drawRig(canvas, pics, pose, m);
    const out = recorder.finishRecordingAsPicture();
    if (cost) cost.value = now() - start;
    return out;
  });

  return <Picture picture={picture} />;
}

export interface RigCritterProps extends Omit<RigCritterArtProps, 'x' | 'y'> {
  style?: CanvasStyle;
}

/** A rigged cast member in its own canvas, with room for its hop and its arms. */
export function RigCritter({ style, size = 200, ...props }: RigCritterProps) {
  const room = Math.max(24, Math.ceil(size * 0.3));
  const height = size * 1.2;
  return (
    <Canvas style={[{ width: size + 2 * room, height: height + 2 * room, margin: -room }, style]}>
      <RigCritterArt {...props} size={size} x={room} y={room} />
    </Canvas>
  );
}
