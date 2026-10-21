import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import type { BurrowObjectId, SceneName, SceneOptions, TimeOfDay } from '../art';
import { useArtRenderer } from './context';

/** The canvas's own style type (React Native's `ViewStyle` can widen past what Skia accepts). */
type CanvasStyle = ComponentProps<typeof Canvas>['style'];

export interface SceneProps {
  name: SceneName;
  timeOfDay?: TimeOfDay;
  /** `front` draws the layer that goes over the characters (the café counter, the bus dashboard). */
  layer?: 'back' | 'front';
  /** Passed to the generator (the harbour's `pierY`, the town's `vanX`). */
  extra?: object;
  /** Width in points; the scene keeps its design proportions (390 × 844 for a screen). */
  width?: number;
  style?: CanvasStyle;
}

/** A scene, recorded once into a picture and scaled to `width`. */
export function Scene({ name, timeOfDay, layer, extra, width, style }: SceneProps) {
  const renderer = useArtRenderer();
  const art = useMemo(() => {
    const opts: SceneOptions = {
      ...(timeOfDay ? { timeOfDay } : {}),
      ...(layer ? { layer } : {}),
      ...(extra ? { extra } : {}),
    };
    return renderer.scene(name, opts);
    // `extra` is compared by content.
  }, [renderer, name, timeOfDay, layer, JSON.stringify(extra)]);
  if (!art) return null;
  const w = width ?? art.width;
  const k = w / art.width;
  return (
    <Canvas style={[{ width: w, height: art.height * k }, style]}>
      <Group transform={[{ scale: k }]}>
        <Picture picture={art.picture} />
      </Group>
    </Canvas>
  );
}

export interface BurrowObjectProps {
  /** As the renders name them: `jar-1`, `desk-mug-2`, `seed`. */
  id: BurrowObjectId;
  /** Width in points (the prototype draws them 56 wide); 4/3 as tall. */
  size?: number;
  style?: CanvasStyle;
}

/** A burrow word object (jar, desk, plant, mail at stages 0–2; desk kinds; the seed packet). */
export function BurrowObject({ id, size = 56, style }: BurrowObjectProps) {
  const renderer = useArtRenderer();
  const art = useMemo(() => renderer.object(id), [renderer, id]);
  const k = size / art.width;
  return (
    <Canvas style={[{ width: size, height: art.height * k }, style]}>
      <Group transform={[{ scale: k }]}>
        <Picture picture={art.picture} />
      </Group>
    </Canvas>
  );
}
