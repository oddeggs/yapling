import { Critter } from '@yapling/art/native';
import {
  type Character,
  type Mood,
  type Mouth,
  type PipSpecies,
  type TimeOfDay,
} from '@yapling/art';
import { colours, layout } from '@yapling/theme';
import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoomScene } from './art';

/*
 * The burrow room behind every burrow screen, and the onboarding's unpacking chat. The scene is
 * drawn at the screen's width; everything that sits in the room (critters, shelf objects) is
 * placed in the prototype's 390-point units and scaled with it, so it stays on its shelf.
 */

/** The status bar's height in the prototype's frame: the room's string of lights hangs just under it. */
const PROTOTYPE_STATUS_BAR = 40;

/**
 * Scales the prototype's 390-point positions to this screen's width. The room sits below the
 * status bar (the prototype lets the string of lights run under it): `y` places a point of the
 * room vertically, `u` scales a length.
 */
export function useStage() {
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const k = width / layout.screen.width;
  const drop = Math.max(0, top - PROTOTYPE_STATUS_BAR);
  return { width, height, k, drop, u: (n: number) => n * k, y: (n: number) => drop + n * k };
}

export interface CastSpot {
  readonly character: Character;
  readonly mood: Mood;
  /** Width in prototype points, and the top-left of the critter's box. */
  readonly size: number;
  readonly left: number;
  readonly top: number;
  /** A fixed mouth, or the lipsync's shared value while the critter talks. */
  readonly mouth?: Mouth | SharedValue<Mouth>;
}

export interface BurrowBackdropProps {
  /** `burrow-day1` keeps the last box by the door; `burrow` is the unpacked room. */
  readonly scene: 'burrow' | 'burrow-day1';
  readonly timeOfDay: TimeOfDay;
  /** Pip's species, the learner's pick. */
  readonly species: PipSpecies;
  readonly cast?: readonly CastSpot[];
  /** Things in the room between the scene and the critters (shelf objects, the keepsake). */
  readonly room?: ReactNode;
  readonly children?: ReactNode;
}

/** The burrow by time of day, with its critters idling (breathing, blinking) in place. */
export function BurrowBackdrop({
  scene,
  timeOfDay,
  species,
  cast = [],
  room,
  children,
}: BurrowBackdropProps) {
  const { width, u, y, drop } = useStage();
  // The first-day room draws the plain burrow underneath, so it takes the light the same way.
  const light =
    scene === 'burrow'
      ? { timeOfDay }
      : timeOfDay === 'afternoon'
        ? {}
        : { extra: { tod: timeOfDay } };
  return (
    <View style={styles.screen}>
      <View style={styles.scene}>
        <RoomScene name={scene} options={light} width={width} drop={drop} />
      </View>
      {room}
      {cast.map((c) => (
        <Critter
          key={c.character}
          character={c.character}
          species={species}
          mood={c.mood}
          size={u(c.size)}
          {...(c.mouth !== undefined ? { mouth: c.mouth } : {})}
          style={{ position: 'absolute', left: u(c.left), top: y(c.top) }}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.accentSoft, overflow: 'hidden' },
  scene: { position: 'absolute', left: 0, top: 0 },
});
