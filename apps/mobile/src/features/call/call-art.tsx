import { Blur, Canvas, Group, Paint, Picture } from '@shopify/react-native-skia';
import { CAST, SCENES, speciesOf, type Character, type Mood, type PipSpecies } from '@yapling/art';
import { useArtRenderer } from '@yapling/art/native';
import type { CharacterId } from '@yapling/contracts';
import { colours } from '@yapling/theme';
import { useMemo } from 'react';

import type { CallSceneName } from './scene-layout';

/*
 * The call's art that isn't a whole critter: a face in a circle (the pill, the round strip) and a
 * scene seen softly through the phone. Both are the prototype's own generators, drawn once into a
 * cached picture by `@yapling/art`.
 */

/** The cast member a character id draws as, or null for a voice with no critter (the office). */
export function artCharacter(id: CharacterId): Character | null {
  return id in CAST || id === 'pip' ? (id as Character) : null;
}

export interface CritterFaceProps {
  readonly character: CharacterId;
  readonly species: PipSpecies;
  readonly size: number;
  readonly mood?: Mood;
  /** The circle's fill behind the face. */
  readonly fill?: string;
}

/** A critter's face, as the prototype crops it (`s_face`). */
export function CritterFace({
  character,
  species,
  size,
  mood = 'happy',
  fill = colours.accentSoft,
}: CritterFaceProps) {
  const renderer = useArtRenderer();
  const who = artCharacter(character);
  const art = useMemo(
    () =>
      who
        ? renderer.art({
            fn: 's_face',
            w: size,
            h: size,
            o: { sp: speciesOf(who, species), mood, bg: fill },
          })
        : null,
    [renderer, who, species, size, mood, fill],
  );
  if (!art) return null;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Picture picture={art.picture} />
    </Canvas>
  );
}

/** How far the blurred scene overhangs the screen, as the prototype draws it. */
const OVERHANG = 24;

/** A scene behind a roommate's call: blurred, overhanging the edges, under a pale wash. */
export function BlurredScene({
  name,
  width,
  height,
}: {
  name: CallSceneName;
  width: number;
  height: number;
}) {
  const renderer = useArtRenderer();
  // The prototype draws the scene 48 points bigger than the screen, 24 past each edge.
  const w = Math.round(width + 2 * OVERHANG);
  const h = Math.round(height + 2 * OVERHANG);
  const art = useMemo(
    () => renderer.art({ fn: SCENES[name].fn, w, h, o: { t: 0 } }),
    [renderer, name, w, h],
  );
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }} pointerEvents="none">
      <Group
        layer={
          <Paint>
            <Blur blur={12} mode="clamp" />
          </Paint>
        }
      >
        <Group transform={[{ translateX: -OVERHANG }, { translateY: -OVERHANG }]}>
          <Picture picture={art.picture} />
        </Group>
      </Group>
    </Canvas>
  );
}
