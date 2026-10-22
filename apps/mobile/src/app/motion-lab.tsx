import { ACT_NAMES, MOUTHS, type ActName, type Character, type Mouth } from '@yapling/art';
import { Critter, RigCritter, useArtRenderer } from '@yapling/art/native';
import { colours, layout } from '@yapling/theme';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChip } from '../ui/chip';
import { Txt } from '../ui/text';

/*
 * Dev-only lab for the critter rig (`yapling-dev://motion-lab`): today's Pip beside the rigged Pip
 * cycling the rig's acts, and three critters on screen (Pip, Mei, Linh) with the UI thread's frame
 * times, to measure. Not part of the product: release builds redirect home, and its labels are
 * English on purpose.
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

type Mode = 'compare' | 'three-rig' | 'three-today' | 'none';

function Lab() {
  const insets = useSafeAreaInsets();
  const renderer = useArtRenderer();
  const systemReduce = useReducedMotion();
  const [reduceToggle, setReduce] = useState(false);
  const reduced = systemReduce || reduceToggle;
  const [mode, setMode] = useState<Mode>('compare');
  const [cycle, setCycle] = useState(true);
  const [actIndex, setActIndex] = useState(0);
  const [play, setPlay] = useState(0);
  const [talk, setTalk] = useState(false);
  const act: ActName = ACT_NAMES[actIndex % ACT_NAMES.length] ?? 'breathe';
  const [line, setLine] = useState('');
  const [recordMs, setRecordMs] = useState<string>('');

  // Cycle the acts: each one starts and ends at rest, so the next follows without a jump.
  useEffect(() => {
    if (!cycle || reduced) return;
    const next = setTimeout(
      () => {
        setActIndex((i) => i + 1);
        setPlay((p) => p + 1);
      },
      act === 'breathe' ? 4000 : act === 'hop' ? 2600 : act === 'wave' ? 3900 : 6900,
    );
    return () => clearTimeout(next);
  }, [cycle, reduced, act, play]);

  // What recording costs: the rig for Pip, Mei and Linh, fresh (JS thread, once each).
  useEffect(() => {
    const out: string[] = [];
    for (const species of ['redpanda', 'otter', 'pangolin'] as const) {
      const spec = { species, mood: 'happy' as const, size: 151 };
      const t0 = performance.now();
      renderer.critter(spec);
      const t1 = performance.now();
      renderer.critterRig(spec, 3);
      const t2 = performance.now();
      out.push(`${species} today ${(t1 - t0).toFixed(0)} ms · rig ${(t2 - t1).toFixed(0)} ms`);
    }
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
      const text =
        `${mode} · ${s.frames} frames · interval ${(s.sumDt / s.frames).toFixed(2)} ms (max ${s.maxDt.toFixed(1)}) · ` +
        `dropped ${s.dropped} (${((100 * s.dropped) / (s.frames + s.dropped)).toFixed(1)}%) · ` +
        `rig work ${(s.costSum / s.frames).toFixed(2)} ms/frame (max ${s.costMax.toFixed(1)}, >4 ms ${s.costOver4})`;
      setLine(text);
      console.log(`[motion-lab] ${text}`);
    }, 2000);
    return () => clearInterval(timer);
  }, [mode, stats, c0, c1, c2]);

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
        {(['compare', 'three-rig', 'three-today', 'none'] as const).map((m) => (
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
        <ChoiceChip
          label={systemReduce ? 'Reduce Motion (system)' : 'Reduce Motion'}
          selected={reduced}
          onPress={() => setReduce(!reduceToggle)}
        />
      </View>

      {mode === 'compare' ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 30 }}>
          <View style={{ alignItems: 'center', gap: 30 }}>
            <Critter character="pip" size={140} animated={!reduced} mouth={mouth} />
            <Txt variant="note" colour={colours.textMuted}>
              today
            </Txt>
          </View>
          <View style={{ alignItems: 'center', gap: 30 }}>
            <RigCritter
              character="pip"
              size={140}
              act={act}
              play={play}
              reduced={reduced}
              mouth={mouth}
              cost={c0}
            />
            <Txt variant="note" colour={colours.textMuted}>
              {`rig · ${act}`}
            </Txt>
          </View>
        </View>
      ) : mode === 'none' ? (
        <View style={{ height: 200 }} />
      ) : (
        <Three
          rig={mode === 'three-rig'}
          act={act}
          play={play}
          reduced={reduced}
          mouth={mouth}
          costs={costs}
        />
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

const TRIO: readonly { character: Character; side: 1 | -1 }[] = [
  { character: 'pip', side: 1 },
  { character: 'mei', side: -1 },
  { character: 'linh', side: -1 },
];

function Three({
  rig,
  act,
  play,
  reduced,
  mouth,
  costs,
}: {
  rig: boolean;
  act: ActName;
  play: number;
  reduced: boolean;
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
      {TRIO.map(({ character, side }, i) =>
        rig ? (
          <RigCritter
            key={character}
            character={character}
            size={110}
            act={act}
            play={play}
            side={side}
            reduced={reduced}
            {...(i === 0 ? { mouth } : {})}
            {...(costs[i] ? { cost: costs[i] } : {})}
          />
        ) : (
          <Critter
            key={character}
            character={character}
            size={110}
            animated={!reduced}
            {...(i === 0 ? { mouth } : {})}
          />
        ),
      )}
    </View>
  );
}
