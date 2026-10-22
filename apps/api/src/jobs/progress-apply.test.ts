import type { CallKind, Progress, WeekRing } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import { applyCall, ringSceneOf, type CallFacts } from './progress-apply';

/*
 * The ring through the learning model's rule: each slot tied to its week's scene, opened on the
 * story day the call ended on, and filled by a call of that scene.
 */

const HCM = 'Asia/Ho_Chi_Minh';
const AT = Date.UTC(2026, 10, 20, 3);

const progress = (weeks: WeekRing[] = []): Progress => ({
  revision: 1,
  installedOn: '2026-10-21',
  dayIndex: 1,
  phrases: [],
  errorTargets: [],
  canDos: [],
  keepsakes: [],
  weeks,
  settlingChaptersDone: [],
});

let calls = 0;
const facts = (kind: CallKind, sceneId: string, storyDay: number): CallFacts => ({
  callId: `call_${(calls += 1)}`,
  sceneId,
  kind,
  endedAt: AT,
  timezone: HCM,
  storyDay,
  scenePhrases: [],
  sceneCast: ['pip'],
  learnerLines: [],
  draft: null,
});

/** Plays calls in order, each on its story day; answers the rings after the last. */
function play(...played: [CallKind, string, number][]): WeekRing[] {
  let current = progress();
  for (const [kind, scene, day] of played) {
    current = { ...current, ...applyCall(current, facts(kind, scene, day)).lists };
  }
  return current.weeks;
}

const slot = (weeks: WeekRing[], week: number, kind: string) =>
  weeks[week - 1]?.slots.find((s) => s.kind === kind);

const WEEK_ONE: [CallKind, string, number][] = [
  ['episode', 's1-e1', 2],
  ['real_week', 's1-e1-real-week', 4],
  ['practice', 's1-e1-practice', 5],
];

describe('the ring after a call', () => {
  it('fills week 1 as before, each slot with its own scene', () => {
    const weeks = play(...WEEK_ONE);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.slots.map((s) => [s.kind, s.status, s.sceneId])).toEqual([
      ['episode', 'done', 's1-e1'],
      ['real_week', 'done', 's1-e1-real-week'],
      ['practice', 'done', 's1-e1-practice'],
    ]);
  });

  it('fills ring 3 with Episode 3 played in week 4, leaving Episode 4 waiting', () => {
    const weeks = play(...WEEK_ONE, ['episode', 's1-e2', 9], ['episode', 's1-e3', 23]);
    expect(weeks).toHaveLength(4);
    expect(slot(weeks, 3, 'episode')).toMatchObject({ status: 'done', sceneId: 's1-e3' });
    expect(slot(weeks, 4, 'episode')).toMatchObject({ status: 'open', sceneId: 's1-e4' });
  });

  it('lets a replay finish nothing: Episode 1 again in week 2 leaves Episode 2 open', () => {
    const weeks = play(...WEEK_ONE, ['episode', 's1-e1', 9]);
    expect(slot(weeks, 2, 'episode')).toMatchObject({ status: 'open', sceneId: 's1-e2' });
  });

  it("never takes week 1's real-week slot with another week's real-week call", () => {
    const weeks = play(['episode', 's1-e1', 2], ['real_week', 'later-real-week', 10]);
    // Week 1's slot is Episode 1's own real-week call; week 2 names none, so it takes any.
    expect(slot(weeks, 1, 'real_week')).toMatchObject({ status: 'open' });
    expect(slot(weeks, 2, 'real_week')).toMatchObject({ status: 'done', sceneId: null });
  });

  it('opens the rings on the story day, not the install day', () => {
    // Day 3 of the story: week 1's real-week call opens on day 4, so it can't be filled yet.
    const weeks = play(['real_week', 's1-e1-real-week', 3]);
    expect(slot(weeks, 1, 'real_week')).toMatchObject({ status: 'upcoming' });
    expect(slot(play(['real_week', 's1-e1-real-week', 4]), 1, 'real_week')).toMatchObject({
      status: 'done',
    });
  });

  it("never fills a slot with Pip's minute, Settling in or the placement call", () => {
    for (const kind of ['daily', 'settling', 'placement'] as const) {
      const weeks = play(['episode', 's1-e1', 2], [kind, 's1-e1-real-week', 5]);
      expect(slot(weeks, 1, 'real_week')).toMatchObject({ status: 'open' });
    }
  });

  it('keeps the ring full keepsake on the third slot of a week', () => {
    let current = progress();
    for (const [kind, scene, day] of WEEK_ONE) {
      current = { ...current, ...applyCall(current, facts(kind, scene, day)).lists };
    }
    expect(current.keepsakes).toContainEqual(
      expect.objectContaining({ id: 'week-1', kind: 'week', signedBy: 'pip' }),
    );
  });

  it('names a Visitor version by the scene it stands in for', () => {
    expect(ringSceneOf('s1-e1-voicemail-visitor')).toBe('s1-e1-voicemail');
    expect(ringSceneOf('s1-e3')).toBe('s1-e3');
  });
});
