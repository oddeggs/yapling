import { CHARACTER_IDS, PLANS, STAGES } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  chooseRung,
  EXPOSURE_RUNGS,
  listeningCheckpoint,
  openRungs,
  voicesUpTo,
  type ExposureContext,
} from './ladders';

describe('the accent ladder', () => {
  it('meets Pip, Linh and Mei first, then adds voices stage by stage', () => {
    expect(voicesUpTo('newcomer')).toEqual(['pip', 'linh', 'mei']);
    expect(voicesUpTo('neighbour')).toEqual(['pip', 'linh', 'mei', 'sol', 'bea', 'nell']);
    expect(voicesUpTo('regular')).toContain('dex');
    expect(voicesUpTo('local')).toContain('hank');
    for (const v of voicesUpTo('voice')) expect(CHARACTER_IDS).toContain(v);
  });

  it('never fails a listening checkpoint: it replays slower, then helps the van in', () => {
    expect(listeningCheckpoint('neighbour', true, 0)).toEqual({ kind: 'move_in', helped: false });
    expect(listeningCheckpoint('neighbour', false, 0)).toEqual({
      kind: 'replay_slower',
      ttsSpeed: 0.8,
    });
    expect(listeningCheckpoint('neighbour', false, 1)).toEqual({
      kind: 'replay_slower',
      ttsSpeed: 0.7,
    });
    expect(listeningCheckpoint('neighbour', false, 2)).toEqual({ kind: 'move_in', helped: true });
    expect(listeningCheckpoint('neighbour', true, 1)).toEqual({ kind: 'move_in', helped: true });
    fc.assert(
      fc.property(
        fc.constantFrom(...STAGES),
        fc.boolean(),
        fc.nat(10),
        (s, understood, replays) => {
          const outcome = listeningCheckpoint(s, understood, replays);
          if (outcome.kind === 'replay_slower')
            expect(outcome.ttsSpeed).toBeGreaterThanOrEqual(0.7);
          expect(['move_in', 'replay_slower']).toContain(outcome.kind);
        },
      ),
    );
  });
});

describe('the exposure ladder', () => {
  const newcomer: ExposureContext = {
    stage: 'newcomer',
    plan: 'free',
    placementDone: false,
    dayIndex: 1,
    hankChallenged: false,
  };

  it('opens each rung at its moment', () => {
    expect([...openRungs(newcomer)]).toEqual(['text_and_voice_notes']);
    expect(openRungs({ ...newcomer, placementDone: true }).has('live_pip')).toBe(true);
    expect(openRungs({ ...newcomer, placementDone: true }).has('live_neighbours')).toBe(false);
    expect(
      openRungs({ ...newcomer, placementDone: true, dayIndex: 2 }).has('live_neighbours'),
    ).toBe(true);
    expect(openRungs({ ...newcomer, plan: 'plus' }).has('camera_call')).toBe(false);
    expect(openRungs({ ...newcomer, plan: 'plus', stage: 'neighbour' }).has('camera_call')).toBe(
      true,
    );
    expect(openRungs({ ...newcomer, stage: 'neighbour' }).has('camera_call')).toBe(false);
    expect(openRungs({ ...newcomer, stage: 'local' }).has('hard_mode')).toBe(false);
    expect(openRungs({ ...newcomer, stage: 'local', hankChallenged: true }).has('hard_mode')).toBe(
      true,
    );
  });

  it('never opens real humans yet, and always allows stepping down to text and voice notes', () => {
    const ctx = fc.record({
      stage: fc.constantFrom(...STAGES),
      plan: fc.constantFrom(...PLANS),
      placementDone: fc.boolean(),
      dayIndex: fc.integer({ min: 1, max: 400 }),
      hankChallenged: fc.boolean(),
    });
    fc.assert(
      fc.property(ctx, fc.constantFrom(...EXPOSURE_RUNGS), (c, wanted) => {
        expect(openRungs(c).has('real_humans')).toBe(false);
        expect(chooseRung(c, 'text_and_voice_notes')).toBe('text_and_voice_notes');
        const chosen = chooseRung(c, wanted);
        expect(openRungs(c).has(chosen)).toBe(true);
        expect(EXPOSURE_RUNGS.indexOf(chosen)).toBeLessThanOrEqual(EXPOSURE_RUNGS.indexOf(wanted));
      }),
    );
  });
});
