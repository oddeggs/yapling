import type { Mood, Mouth, PipSpecies } from '@yapling/art';
import { Critter, Scene } from '@yapling/art/native';
import type { CharacterId } from '@yapling/contracts';
import { liveCurves, translucent, type Transition } from '@yapling/theme';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { transitionTo } from '../../ui/motion/play';
import { useLipsyncClock, type Lipsync } from '../../voice/lipsync';
import { useReduceMotion } from '../../ui/motion/reduce-motion';
import { artCharacter, BlurredScene } from './call-art';
import type { BubbleTone } from '../../ui/speech-bubble';
import { liftFor, type FitFrame } from './place-fit';
import type { TrackerState } from './tracker';
import type { CallView } from './view-model';
import { stageCast, type CallLayout, type CastSpot } from './scene-layout';
import {
  cueOf,
  shotFor,
  SHOT_MS,
  type StageCue,
  type StageMoment,
  type StageShot,
  type StageSignals,
} from './stage-acts';

/*
 * The scene behind the call and the cast in it: Mei behind the café counter for the whole call
 * with the roommate small at the side, Bea at the wheel of Bus 45, the burrow softly blurred
 * behind the roommate, the town meeting in the square. The speaking critter's mouth follows the
 * lipsync clock on the UI thread; each critter acts on what the call is doing (`stage-acts.ts`).
 */

export interface CallStageProps {
  readonly layout: CallLayout;
  /** Points per prototype point (the phone's width over 390). */
  readonly k: number;
  readonly width: number;
  readonly height: number;
  readonly species: PipSpecies;
  /** The call as the screen draws it: moods, who talks (their mouth follows `mouth`), who thinks. */
  readonly view: Pick<
    CallView,
    'moods' | 'talking' | 'awaiting' | 'learnerTalking' | 'listener' | 'sceneDone'
  >;
  /** Passed turns and the first line: the hops and the hello. */
  readonly tracker: Pick<TrackerState, 'passes' | 'lines'>;
  readonly mouth: SharedValue<Mouth>;
  /** The edges a `clear` critter's face keeps away from (the bubble above, the cards below). */
  readonly fit: Omit<FitFrame, 'k'>;
}

export function CallStage({
  layout,
  k,
  width,
  height,
  species,
  view,
  tracker,
  mouth,
  fit,
}: CallStageProps) {
  const { backdrop } = layout;
  const { moods, talking } = view;
  const moment: StageMoment = {
    learnerTalking: view.learnerTalking,
    thinker: view.awaiting,
    talking,
  };
  const signals: StageSignals = {
    passes: tracker.passes,
    greeter: tracker.lines[0]?.speaker ?? null,
    done: view.sceneDone,
  };
  const cues = useStageCues(layout, moment, signals, view.listener);
  const spot = (s: CastSpot) => (
    <StageCritter
      key={s.character}
      spot={s}
      k={k}
      species={species}
      mood={moods[s.character] ?? 'happy'}
      mouth={talking === s.character ? mouth : 'rest'}
      cue={cues(s)}
      lift={liftFor(s, { ...fit, k })}
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
          style={{ position: 'absolute', top: (backdrop.top ?? 0) * k, left: 0 }}
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

/**
 * Each critter's act from the call: its held act from the moment, and the one-shot (a hop, a wave)
 * the latest change of signals started, for as long as it plays.
 */
function useStageCues(
  layout: CallLayout,
  moment: StageMoment,
  signals: StageSignals,
  listener: CharacterId,
): (spot: CastSpot) => StageCue {
  const cast = stageCast(layout);
  const last = useRef(signals);
  const plays = useRef<Partial<Record<CharacterId, number>>>({});
  const [shot, setShot] = useState<StageShot | null>(null);
  useEffect(() => {
    const next = shotFor(last.current, signals, {
      listener,
      host: layout.pill,
      cast,
      now: Date.now(),
    });
    last.current = signals;
    if (!next) return;
    for (const c of next.cast) plays.current[c] = (plays.current[c] ?? 0) + 1;
    setShot(next);
    // Only a change of signals starts a one-shot.
  }, [signals.passes, signals.greeter, signals.done]);
  // When the one-shot is over, the call's state has the stage again.
  useEffect(() => {
    if (!shot) return undefined;
    const timer = setTimeout(() => setShot(null), SHOT_MS[shot.act]);
    return () => clearTimeout(timer);
  }, [shot]);
  const now = Date.now();
  return (s) => cueOf(s, moment, cast, shot, plays.current[s.character] ?? 0, now);
}

/** A critter rising clear of the cards, or settling back: a calm travel, as the rig's own fades. */
const LIFT: Transition = { durationMs: 520, easing: liveCurves.travel };

function StageCritter({
  spot,
  k,
  species,
  mood,
  mouth,
  cue,
  lift,
}: {
  spot: CastSpot;
  k: number;
  species: PipSpecies;
  mood: Mood;
  mouth: Mouth | SharedValue<Mouth>;
  cue: StageCue;
  /** Points up, to keep the face clear of the cards. */
  lift: number;
}) {
  const reduce = useReduceMotion();
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.set(reduce ? -lift : transitionTo(-lift, LIFT));
  }, [lift, reduce, rise]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: rise.get() }] }));
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
        act={cue.act}
        play={cue.play}
        lookAt={cue.lookAt}
      />
    </Animated.View>
  );
}

/** A fixed closed mouth for before the engine exists. */
export const restMouth = makeMutable<Mouth>('rest');

/** Runs the engine's lipsync clock on the UI thread while the call is on screen. */
export function LipsyncClock({ lipsync }: { lipsync: Lipsync }) {
  useLipsyncClock(lipsync);
  return null;
}

/** A speaker's bubble colour. */
export const bubbleTone = (c: CharacterId): BubbleTone =>
  c === 'pip' ? 'pip' : c === 'office' ? 'office' : 'neighbour';
