import { ACT_NAMES, MOUTHS, type Character, type Mood, type Mouth } from '@yapling/art';
import { Critter, useArtRenderer, type CritterAct } from '@yapling/art/native';
import { colours, layout } from '@yapling/theme';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { PixelRatio, ScrollView, View } from 'react-native';
import {
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BurrowBackdrop, useStage } from '../features/burrow';
import { ChoiceChip } from '../ui/chip';
import { Txt } from '../ui/text';

/*
 * Dev-only lab for the living critters (`yapling-dev://motion-lab`): today's drawing beside the
 * rig cycling its acts, three critters on screen (Pip, Mei, Linh) as the rig or as today's drawing,
 * and the whole cast at once, with the UI thread's frame times, to measure. Not part of the
 * product: release builds redirect home, and its labels are English on purpose.
 */

const FRAME_MS = 1000 / 60;

interface Stats {
  frames: number;
  sumDt: number;
  maxDt: number;
  dropped: number;
  costSum: number;
  costMax: number;
  costOver4: number;
}
const EMPTY: Stats = {
  frames: 0,
  sumDt: 0,
  maxDt: 0,
  dropped: 0,
  costSum: 0,
  costMax: 0,
  costOver4: 0,
};

export default function MotionLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

type Mode = 'compare' | 'three-rig' | 'three-today' | 'cast' | 'burrow' | 'none';
const MODES: readonly Mode[] = ['compare', 'three-rig', 'three-today', 'cast', 'burrow', 'none'];
const LAB_MOODS: readonly Mood[] = ['happy', 'listen', 'excited', 'confused', 'sleepy', 'laugh'];

/** How long the cycle stays on each act (the held ones loop meanwhile). */
const CYCLE_MS: Record<CritterAct, number> = {
  idle: 4000,
  listen: 7000,
  think: 6000,
  hop: 2400,
  wave: 3800,
};

function Lab() {
  const insets = useSafeAreaInsets();
  const renderer = useArtRenderer();
  const systemReduce = useReducedMotion();
  const [reduceToggle, setReduce] = useState(false);
  const reduced = systemReduce || reduceToggle;
  const [mode, setMode] = useState<Mode>('compare');
  const [mood, setMood] = useState<Mood>('happy');
  const [cycle, setCycle] = useState(true);
  const [actIndex, setActIndex] = useState(0);
  const [play, setPlay] = useState(0);
  const [talk, setTalk] = useState(false);
  const [left, setLeft] = useState(false);
  const act: CritterAct = ACT_NAMES[actIndex % ACT_NAMES.length] ?? 'idle';
  const [line, setLine] = useState('');
  const [recordMs, setRecordMs] = useState<string>('');

  // Cycle the acts: any act can follow any other at any moment; what is on screen melts into it.
  useEffect(() => {
    if (!cycle || reduced) return;
    const next = setTimeout(() => {
      setActIndex((i) => i + 1);
      setPlay((p) => p + 1);
    }, CYCLE_MS[act]);
    return () => clearTimeout(next);
  }, [cycle, reduced, act, play]);

  // What recording costs: today's critter and the rig for Pip, Mei and Linh, fresh (JS thread).
  useEffect(() => {
    const out: string[] = [];
    const ratio = PixelRatio.get();
    for (const species of ['redpanda', 'otter', 'pangolin'] as const) {
      const spec = { species, mood: 'patient' as const, size: 151 };
      const t0 = performance.now();
      renderer.critter(spec, ratio);
      const t1 = performance.now();
      renderer.critterRig(spec, ratio);
      const t2 = performance.now();
      out.push(`${species} today ${(t1 - t0).toFixed(0)} ms · rig ${(t2 - t1).toFixed(0)} ms`);
    }
    const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
    out.push(
      `cache ${mb(renderer.cache.bytes)} MB of ${mb(renderer.cache.cap)} · on screen ${mb(renderer.cache.pinnedBytes)} MB · ${renderer.cache.size} entries`,
    );
    setRecordMs(out.join('\n'));
    console.log(`[motion-lab] record\n${out.join('\n')}`);
  }, [renderer]);

  // The UI thread's frame intervals and the rigs' own work per frame.
  const stats = useSharedValue<Stats>(EMPTY);
  const costs = [useSharedValue(0), useSharedValue(0), useSharedValue(0)] as const;
  const [c0, c1, c2] = costs;
  useFrameCallback((frame) => {
    const dt = frame.timeSincePreviousFrame;
    if (dt === null) return;
    const cost = c0.value + c1.value + c2.value;
    const s = stats.value;
    stats.value = {
      frames: s.frames + 1,
      sumDt: s.sumDt + dt,
      maxDt: Math.max(s.maxDt, dt),
      dropped: s.dropped + Math.max(0, Math.round(dt / FRAME_MS) - 1),
      costSum: s.costSum + cost,
      costMax: Math.max(s.costMax, cost),
      costOver4: s.costOver4 + (cost > 4 ? 1 : 0),
    };
  });
  useEffect(() => {
    stats.value = EMPTY;
    c0.value = 0;
    c1.value = 0;
    c2.value = 0;
    const timer = setInterval(() => {
      const s = stats.value;
      if (s.frames === 0) return;
      const fps = 1000 / (s.sumDt / s.frames);
      const text =
        `${mode} · ${s.frames} frames · ${fps.toFixed(1)} fps · interval ${(s.sumDt / s.frames).toFixed(2)} ms (max ${s.maxDt.toFixed(1)}) · ` +
        `dropped ${s.dropped} (${((100 * s.dropped) / (s.frames + s.dropped)).toFixed(1)}%) · ` +
        `rig work ${(s.costSum / s.frames).toFixed(2)} ms/frame (max ${s.costMax.toFixed(1)}, >4 ms ${s.costOver4})`;
      setLine(text);
      console.log(`[motion-lab] ${text}`);
    }, 2000);
    return () => clearInterval(timer);
  }, [mode, mood, stats, c0, c1, c2]);

  // Lipsync stays as it is: a mouth shared value swaps the mouth picture.
  const mouth = useSharedValue<Mouth>('rest');
  const talking = useSharedValue(false);
  useEffect(() => {
    talking.value = talk;
  }, [talk, talking]);
  useFrameCallback((frame) => {
    const i = Math.floor(frame.timeSinceFirstFrame / 140);
    const next: Mouth = talking.value ? (MOUTHS[1 + ((i * 5) % 7)] ?? 'rest') : 'rest';
    if (mouth.value !== next) mouth.value = next;
  });

  const shared = {
    mood,
    act,
    play,
    lookAt: left ? ('left' as const) : ('right' as const),
    animated: !reduced,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colours.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: layout.marginScreen,
        gap: 12,
      }}
    >
      <Txt variant="screenTitle">motion lab</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {MODES.map((m) => (
          <ChoiceChip key={m} label={m} selected={mode === m} onPress={() => setMode(m)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ACT_NAMES.map((name, i) => (
          <ChoiceChip
            key={name}
            label={name}
            selected={act === name}
            onPress={() => {
              setCycle(false);
              setActIndex(i);
              setPlay((p) => p + 1);
            }}
          />
        ))}
        <ChoiceChip label="cycle" selected={cycle} onPress={() => setCycle(!cycle)} />
        <ChoiceChip label="talk" selected={talk} onPress={() => setTalk(!talk)} />
        <ChoiceChip label="look left" selected={left} onPress={() => setLeft(!left)} />
        <ChoiceChip
          label={systemReduce ? 'Reduce Motion (system)' : 'Reduce Motion'}
          selected={reduced}
          onPress={() => setReduce(!reduceToggle)}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LAB_MOODS.map((m) => (
          <ChoiceChip key={m} label={m} selected={mood === m} onPress={() => setMood(m)} />
        ))}
      </View>

      {mode === 'compare' ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 30 }}>
          <View style={{ alignItems: 'center', gap: 30 }}>
            <Critter character="pip" size={140} {...shared} rig={false} mouth={mouth} />
            <Txt variant="note" colour={colours.textMuted}>
              today
            </Txt>
          </View>
          <View style={{ alignItems: 'center', gap: 30 }}>
            <Critter character="pip" size={140} {...shared} mouth={mouth} cost={c0} />
            <Txt variant="note" colour={colours.textMuted}>
              {`rig · ${act}`}
            </Txt>
          </View>
        </View>
      ) : mode === 'none' ? (
        <View style={{ height: 200 }} />
      ) : mode === 'cast' ? (
        <Cast {...shared} />
      ) : mode === 'burrow' ? (
        <Burrow mood={mood} />
      ) : (
        <Three rig={mode === 'three-rig'} {...shared} mouth={mouth} costs={costs} />
      )}

      <Txt variant="note" colour={colours.textBody}>
        {line || 'measuring…'}
      </Txt>
      <Txt variant="note" colour={colours.textMuted}>
        {recordMs}
      </Txt>
    </ScrollView>
  );
}

interface Shared {
  mood: Mood;
  act: CritterAct;
  play: number;
  lookAt: 'left' | 'right';
  animated: boolean;
}

const TRIO: readonly { character: Character; lookAt: 'left' | 'right' }[] = [
  { character: 'pip', lookAt: 'right' },
  { character: 'mei', lookAt: 'left' },
  { character: 'linh', lookAt: 'left' },
];

function Three({
  rig,
  mouth,
  costs,
  ...shared
}: Shared & {
  rig: boolean;
  mouth: SharedValue<Mouth>;
  costs: readonly [SharedValue<number>, SharedValue<number>, SharedValue<number>];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        paddingTop: 30,
        rowGap: 40,
      }}
    >
      {TRIO.map(({ character, lookAt }, i) => (
        <Critter
          key={character}
          character={character}
          size={110}
          {...shared}
          lookAt={lookAt}
          rig={rig}
          {...(i === 0 ? { mouth } : {})}
          {...(costs[i] && rig ? { cost: costs[i] } : {})}
        />
      ))}
    </View>
  );
}

/** Every cast member and Pip's three species at once, as a crowded screen would show them. */
const CAST: readonly { character: Character; species?: 'redpanda' | 'capybara' | 'cat' }[] = [
  { character: 'pip', species: 'redpanda' },
  { character: 'pip', species: 'capybara' },
  { character: 'pip', species: 'cat' },
  { character: 'mei' },
  { character: 'linh' },
  { character: 'sol' },
  { character: 'hank' },
  { character: 'nell' },
  { character: 'bea' },
  { character: 'dex' },
  { character: 'arjun' },
];

function Cast(shared: Shared) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        paddingTop: 20,
        rowGap: 28,
      }}
    >
      {CAST.map(({ character, species }, i) => (
        <Critter
          key={`${character}${species ?? ''}`}
          character={character}
          {...(species ? { species } : {})}
          size={84}
          {...shared}
          lookAt={i % 2 ? 'left' : 'right'}
        />
      ))}
    </View>
  );
}

/**
 * The burrow as its screens draw it (the room by time of day, critters placed in the prototype's
 * units) with three roommates idling: the critters as every burrow screen gets them, untouched.
 */
function Burrow({ mood }: { mood: Mood }) {
  const { u } = useStage();
  return (
    <View style={{ height: u(660), marginHorizontal: -layout.marginScreen }}>
      <BurrowBackdrop
        scene="burrow"
        timeOfDay="afternoon"
        species="redpanda"
        cast={[
          { character: 'pip', mood, size: 140, left: 8, top: 474 },
          { character: 'linh', mood: 'happy', size: 142, left: 146, top: 446 },
          { character: 'mei', mood: 'patient', size: 112, left: 270, top: 500 },
        ]}
      />
    </View>
  );
}
