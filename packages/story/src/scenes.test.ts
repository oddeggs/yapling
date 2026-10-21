import { STAGES, type Stage } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import { SCENES } from './catalogue';
import {
  activeBeats,
  reduceScene,
  startScene,
  type RunnerState,
  type SceneEffect,
  type SceneEvent,
  type Step,
} from './runner';
import type { Scene } from './types';
import { reachableBeats, validateScene } from './validate';

type Outcome = Extract<
  SceneEvent['type'],
  'fine' | 'target_error' | 'silent' | 'meaning_request' | 'hint_request' | 'timer_end'
>;

/** A tiny seeded generator, so mixed runs are reproducible. */
const seeded = (seed: number) => () => {
  seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
  return seed / 2 ** 31;
};

const MIXED: readonly Outcome[] = [
  'fine',
  'target_error',
  'silent',
  'meaning_request',
  'hint_request',
  'timer_end',
];

type Strategy = (state: RunnerState) => Outcome;

const strategies: Record<string, () => Strategy> = {
  'all fine': () => () => 'fine',
  'all target errors': () => () => 'target_error',
  'all silent': () => () => 'silent',
  'all meaning requests': () => () => 'meaning_request',
  mixed: () => {
    const next = seeded(7);
    return () => MIXED[Math.floor(next() * MIXED.length)] ?? 'fine';
  },
};

/** Plays a scene the way the director would: answers playback, then the learner's outcomes. */
const simulate = (scene: Scene, stage: Stage, strategy: Strategy, bound: number) => {
  let step: Step = startScene(scene, stage);
  const effects: SceneEffect[] = [...step.effects];
  for (let n = 0; n < bound; n++) {
    const { state } = step;
    if (state.phase === 'ended') return { ended: true, steps: n, effects };
    const event: SceneEvent =
      state.phase === 'playing'
        ? { type: 'rec_played' }
        : state.phase === 'speaking' || state.phase === 'fallback'
          ? { type: 'gen_done' }
          : { type: strategy(state) };
    // Every state is plain JSON: a resumed call carries on from a copy.
    step = reduceScene(scene, JSON.parse(JSON.stringify(state)) as RunnerState, event);
    effects.push(...step.effects);
  }
  return { ended: step.state.phase === 'ended', steps: bound, effects };
};

describe.each(SCENES.map((s) => [s.id, s] as const))('scene %s', (_id, scene) => {
  it('is valid: known lines, phrases, can-dos and cast; forward-only beats', () => {
    expect(validateScene(scene)).toEqual([]);
  });

  it('reaches every beat at some stage', () => {
    const reachable = reachableBeats(scene);
    expect(scene.beats.filter((b) => !reachable.has(b.id)).map((b) => b.id)).toEqual([]);
  });

  // Each beat takes at most: its audio, a correction, three tries, the asks and a fallback.
  const bound = scene.beats.length * 12 + 4;

  for (const stage of STAGES) {
    for (const [name, make] of Object.entries(strategies)) {
      it(`ends at ${stage} with ${name}`, () => {
        const run = simulate(scene, stage, make(), bound);
        expect(run.ended).toBe(true);
        expect(run.effects.filter((e) => e.type === 'scene_end')).toHaveLength(1);
        expect(run.effects.at(-1)?.type).toBe('scene_end');
      });
    }
  }

  it('plays every rec beat of the stage, in order, when all goes well', () => {
    for (const stage of STAGES) {
      const run = simulate(scene, stage, () => 'fine', bound);
      const played = run.effects.flatMap((e) => (e.type === 'play_rec' ? [e.beatId] : []));
      const expected = activeBeats(scene, stage)
        .filter((b) => b.kind === 'rec')
        .map((b) => b.id);
      expect(played).toEqual(expected);
    }
  });
});
