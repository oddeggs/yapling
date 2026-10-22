import type { Mood, Mouth, PipSpecies } from '@yapling/art';
import { Critter, Scene } from '@yapling/art/native';
import type { CharacterId } from '@yapling/contracts';
import { motion, translucent } from '@yapling/theme';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { transitionTo } from '../../ui/motion/play';
import { useReduceMotion } from '../../ui/motion/reduce-motion';
import { artCharacter, BlurredScene } from './call-art';
import type { CallLayout, CastSpot } from './scene-layout';

/*
 * The scene behind the call and the cast in it: Mei behind the café counter for the whole call
 * with the roommate small at the side, Bea at the wheel of Bus 45, or the burrow softly blurred
 * behind the roommate. The speaking critter's mouth follows the lipsync clock on the UI thread.
 */

export interface CallStageProps {
  readonly layout: CallLayout;
  /** Points per prototype point (the phone's width over 390). */
  readonly k: number;
  readonly width: number;
  readonly height: number;
  readonly species: PipSpecies;
  readonly moods: Readonly<Partial<Record<CharacterId, Mood>>>;
  /** Whose line is playing: their mouth follows `mouth`. */
  readonly talking: CharacterId | null;
  readonly mouth: SharedValue<Mouth>;
  /** Who tilts their head while a reply is on its way. */
  readonly thinker: CharacterId | null;
}

/** The head tilt while thinking, in degrees (the prototype's `tilt: 8`). */
const TILT_DEG = 8;

export function CallStage({
  layout,
  k,
  width,
  height,
  species,
  moods,
  talking,
  mouth,
  thinker,
}: CallStageProps) {
  const { backdrop } = layout;
  const spot = (s: CastSpot) => (
    <StageCritter
      key={s.character}
      spot={s}
      k={k}
      species={species}
      mood={moods[s.character] ?? 'happy'}
      mouth={talking === s.character ? mouth : 'rest'}
      tilted={thinker === s.character}
    />
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {backdrop.kind === 'blur' ? (
        <>
          <BlurredScene name={backdrop.name} width={width} height={height} />
          <View
            style={{ position: 'absolute', inset: 0, backgroundColor: translucent.paperWashCall }}
          />
        </>
      ) : (
        <Scene
          name={backdrop.name}
          width={width}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      )}
      {layout.cast.map(spot)}
      {backdrop.kind === 'sharp' && backdrop.front ? (
        <Scene
          name={backdrop.name}
          layer="front"
          width={width}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      ) : null}
      {layout.castFront.map(spot)}
    </View>
  );
}

function StageCritter({
  spot,
  k,
  species,
  mood,
  mouth,
  tilted,
}: {
  spot: CastSpot;
  k: number;
  species: PipSpecies;
  mood: Mood;
  mouth: Mouth | SharedValue<Mouth>;
  tilted: boolean;
}) {
  const reduce = useReduceMotion();
  const tilt = useSharedValue(0);
  useEffect(() => {
    const to = tilted ? TILT_DEG : 0;
    tilt.set(reduce ? to : transitionTo(to, motion.transitions.roommateLift));
  }, [tilted, reduce, tilt]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.get()}deg` }] }));
  const character = artCharacter(spot.character);
  if (!character) return null;
  const size = spot.size * k;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: spot.left * k,
          top: spot.top * k,
          width: size,
          height: size * 1.2,
          transformOrigin: 'bottom',
        },
        style,
      ]}
    >
      <Critter
        character={character}
        species={species}
        mood={mood}
        mouth={mouth}
        size={size}
        animated={!reduce}
      />
    </Animated.View>
  );
}
