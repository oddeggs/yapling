import { RING_SLOT_KINDS, WeekRing, type RingSlotKind } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { dateOfDay } from './day-clock';
import { fillRingSlot, firstDayOfWeek, LATER_WEEK_SLOT_OPENS, ringWeeks, weekOfDay } from './ring';
import { FESTIVAL_WEEK, TEST_SEASON } from './season.fixture';
import {
  nextEpisodeWeek,
  ringOpensOnDayOfWeek,
  seasonEpisodes,
  seasonRingWeeks,
  seasonSlotOpensOn,
  storyWeek,
  storyWeekOf,
  storyWeekPlan,
} from './story-week';
import { DAY_MS, HOUR_MS, instantOf } from './time';

const HCM = 'Asia/Ho_Chi_Minh';
const START = '2026-09-21';
const on = (day: number, hour = 19): number =>
  instantOf(START, '00:00', HCM) + (day - 1) * DAY_MS + hour * HOUR_MS;

const kinds = (day: { readonly opens: readonly { readonly kind: string }[] } | undefined) =>
  day?.opens.map((o) => o.kind);

/** Plays a call of `kind` on story day `day`, as the app offers it: the story week's own scene. */
const play = (
  weeks: readonly WeekRing[],
  day: number,
  kind: RingSlotKind,
  sceneId: string | null,
  id = `${kind}-${day}`,
) =>
  fillRingSlot(
    seasonRingWeeks(weeks, day, TEST_SEASON),
    { kind, callRecordId: id, doneAt: on(day), sceneId },
    HCM,
  );

/** Fills a week's whole ring on day `day` with its own scenes. */
const fillWeek = (weeks: readonly WeekRing[], week: number, day: number): readonly WeekRing[] => {
  let next = weeks;
  for (const kind of RING_SLOT_KINDS) {
    const slot = seasonRingWeeks(next, day, TEST_SEASON)[week - 1]?.slots.find(
      (s) => s.kind === kind,
    );
    next = play(next, day, kind, slot?.sceneId ?? null, `${kind}-w${week}`).weeks;
  }
  return next;
};

describe('the story-week plan', () => {
  it('reads what opens on days 1–7 from the week’s slots, the ring call first each day', () => {
    const days = storyWeekPlan(TEST_SEASON[1], 2);
    expect(days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(days.map(kinds)).toEqual([
      ['episode'],
      ['story', 'postcard'],
      ['real_week'],
      ['practice'],
      ['voicemail'],
      [],
      [],
    ]);
    expect(days[0]?.opens[0]).toMatchObject({ scene: 's1-e2', ring: 'episode' });
    expect(days[1]?.opens[0]).toMatchObject({ scene: 's1-e2-story', ring: null, cast: ['pip'] });
  });

  it('opens ring slots on the days of their scenes, the later-week days when a week names none', () => {
    expect(RING_SLOT_KINDS.map((k) => ringOpensOnDayOfWeek(TEST_SEASON[4], 5, k))).toEqual([
      1, 3, 6,
    ]);
    expect(RING_SLOT_KINDS.map((k) => ringOpensOnDayOfWeek(TEST_SEASON[3], 4, k))).toEqual(
      RING_SLOT_KINDS.map((k) => LATER_WEEK_SLOT_OPENS[k]),
    );
    // Week 4 names no real-week or practice scene: they still come, with no scene of their own.
    const week4 = storyWeekPlan(TEST_SEASON[3], 4);
    expect(week4[2]?.opens).toEqual([
      { day: 3, scene: null, kind: 'real_week', ring: 'real_week', cast: [] },
    ]);
    // A week past the season's end has only its three ring calls, on the later-week days.
    expect(storyWeekPlan(undefined, 9).map(kinds)).toEqual([
      ['episode'],
      [],
      ['real_week'],
      ['practice'],
      [],
      [],
      [],
    ]);
  });

  it('keeps the first week’s own days whatever its slots say', () => {
    const opens = seasonSlotOpensOn(TEST_SEASON);
    expect(RING_SLOT_KINDS.map((k) => opens(1, k))).toEqual([2, 4, 5]);
    expect(RING_SLOT_KINDS.map((k) => opens(5, k))).toEqual([29, 31, 34]);
    const festival = storyWeekPlan(FESTIVAL_WEEK, 7);
    expect(festival.map(kinds)).toEqual([
      ['episode'],
      ['story'],
      ['real_week', 'postcard'],
      ['practice'],
      [],
      [],
      [],
    ]);
  });

  it('ties each slot to its week’s scene, and tells an open slot its scene when it learns it', () => {
    const weeks = seasonRingWeeks([], 11, TEST_SEASON);
    expect(weeks[1]?.slots.map((s) => [s.status, s.sceneId])).toEqual([
      ['open', 's1-e2'],
      ['open', 's1-e2-real-week'],
      ['open', 's1-e2-practice'],
    ]);
    // Rings opened before the story named their scenes.
    const old = ringWeeks([], 11);
    expect(old[1]?.slots.every((s) => s.sceneId === null)).toBe(true);
    const learned = seasonRingWeeks(old, 11, TEST_SEASON);
    expect(learned[1]?.slots.map((s) => s.sceneId)).toEqual([
      's1-e2',
      's1-e2-real-week',
      's1-e2-practice',
    ]);
  });
});

describe('ring slots tied to their scene', () => {
  it('fills the slot whose scene the call played, and never another scene’s', () => {
    // Day 24: weeks 1–4 are open. Episode 3 fills ring 3, not ring 1, 2 or 4.
    const r = play([], 24, 'episode', 's1-e3');
    expect(r.filled).toEqual({ week: 3, kind: 'episode' });
    // A replay of Episode 1 once it's done fills nothing.
    const after1 = play(r.weeks, 24, 'episode', 's1-e1');
    expect(after1.filled).toEqual({ week: 1, kind: 'episode' });
    const replay = play(after1.weeks, 24, 'episode', 's1-e1');
    expect(replay.filled).toBeNull();
    expect(replay.weeks).toEqual(seasonRingWeeks(after1.weeks, 24, TEST_SEASON));
  });

  it('lets a slot with no scene take any call of its kind, oldest first', () => {
    // Week 4 names no practice scene; weeks 1–3 do.
    const r = play([], 25, 'practice', 'teach-the-yapling');
    expect(r.filled).toEqual({ week: 4, kind: 'practice' });
    // Past the season: the festival week's slots take any call of their kind.
    const later = play([], 45, 'episode', 's1-e1');
    expect(later.filled).toEqual({ week: 1, kind: 'episode' });
    const festival = play(later.weeks, 45, 'episode', 's1-e2');
    expect(festival.filled).toEqual({ week: 2, kind: 'episode' });
    const replay = play(festival.weeks, 45, 'episode', 's1-e2');
    expect(replay.filled).toEqual({ week: 7, kind: 'episode' });
  });
});

describe('the story week', () => {
  it('is the calendar’s week while the learner keeps up', () => {
    let weeks = fillWeek([], 1, 5);
    weeks = play(weeks, 8, 'episode', 's1-e2').weeks;
    const w = storyWeek({ season: TEST_SEASON, weeks, dayIndex: 10, startedOn: START });
    expect(w).toMatchObject({ week: 2, calendarWeek: 2, behind: false, dayOfWeek: 3 });
    expect(w.today.map((o) => o.kind)).toEqual(['real_week']);
    expect(w.opened.map((o) => o.kind)).toEqual(['episode', 'story', 'postcard', 'real_week']);
    expect(w.ring.map((s) => [s.kind, s.status, s.opensOn])).toEqual([
      ['episode', 'done', '2026-09-28'],
      ['real_week', 'open', '2026-09-30'],
      ['practice', 'upcoming', '2026-10-01'],
    ]);
    expect(w.waiting).toEqual([]);
  });

  it('never runs ahead of the calendar', () => {
    // Week 2's episode played on its day; week 3's hasn't come yet.
    let weeks = fillWeek([], 1, 5);
    weeks = fillWeek(weeks, 2, 12);
    expect(storyWeekOf(TEST_SEASON, weeks, 14)).toBe(2);
    expect(storyWeekOf(TEST_SEASON, weeks, 15)).toBe(3);
  });

  it('lists earlier open calls as waiting, oldest first', () => {
    let weeks = play([], 2, 'episode', 's1-e1').weeks;
    weeks = play(weeks, 8, 'episode', 's1-e2').weeks;
    const w = storyWeek({ season: TEST_SEASON, weeks, dayIndex: 9, startedOn: START });
    expect(w.week).toBe(2);
    expect(w.waiting).toEqual([
      { week: 1, kind: 'real_week', sceneId: 's1-e1-real-week', opensOn: '2026-09-24' },
      { week: 1, kind: 'practice', sceneId: 's1-e1-practice', opensOn: '2026-09-25' },
    ]);
  });

  it('waits for a learner who misses week 3: Episode 3 fills ring 3 and the season map agrees', () => {
    // Weeks 1 and 2 played in full; then nothing until day 24 (week 4, day 3).
    let weeks = fillWeek([], 1, 5);
    weeks = fillWeek(weeks, 2, 11);
    const back = { season: TEST_SEASON, weeks, dayIndex: 24, startedOn: START };
    const w = storyWeek(back);
    expect(w).toMatchObject({ week: 3, calendarWeek: 4, behind: true, dayOfWeek: 7 });
    expect(w.today).toEqual([]);
    expect(w.opened.map((o) => o.scene)).toContain('s1-e3-voicemail');
    expect(w.ring.every((s) => s.status === 'open')).toBe(true);
    expect(w.waiting).toEqual([]);

    // The season map's current episode is the week view's, on the same date.
    const map = seasonEpisodes(back);
    expect(map.map((e) => e.state)).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    const e3 = map.find((e) => e.state === 'current');
    const weekEpisode = w.ring.find((s) => s.kind === 'episode');
    expect(e3).toMatchObject({ week: w.week, sceneId: 's1-e3', open: true });
    expect(e3?.opensOn).toBe(weekEpisode?.opensOn);
    expect(e3?.opensOn).toBe(dateOfDay(START, 15));

    // Episode 3 played on day 24 fills ring 3, not ring 4, and the story moves to week 4.
    const r = play(weeks, 24, 'episode', 's1-e3');
    expect(r.filled).toEqual({ week: 3, kind: 'episode' });
    weeks = r.weeks;
    weeks = play(weeks, 24, 'real_week', 's1-e3-real-week').weeks;
    const full = play(weeks, 25, 'practice', 's1-e3-practice');
    expect(full.filled).toEqual({ week: 3, kind: 'practice' });
    expect(full.ringFull).toEqual({ id: 'week-3', week: 3, earnedOn: '2026-10-15' });
    weeks = full.weeks;

    const next = { season: TEST_SEASON, weeks, dayIndex: 25, startedOn: START };
    const w4 = storyWeek(next);
    expect(w4).toMatchObject({ week: 4, behind: false, dayOfWeek: 4 });
    expect(w4.ring.map((s) => s.status)).toEqual(['open', 'open', 'open']);
    const map4 = seasonEpisodes(next);
    expect(map4.map((e) => e.state)).toEqual([
      'done',
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(map4[3]).toMatchObject({ week: 4, open: true, opensOn: dateOfDay(START, 22) });
    expect(map4[3]?.opensOn).toBe(w4.ring[0]?.opensOn);
  });

  it('dates the season map from the story’s start, the same days the week opens', () => {
    const map = seasonEpisodes({ season: TEST_SEASON, weeks: [], dayIndex: 1, startedOn: START });
    expect(map.map((e) => [e.id, e.opensOnDay, e.opensOn, e.open])).toEqual([
      ['s1-e1', 2, '2026-09-22', false],
      ['s1-e2', 8, '2026-09-28', false],
      ['s1-e3', 15, '2026-10-05', false],
      ['s1-e4', 22, '2026-10-12', false],
      ['s1-e5', 29, '2026-10-19', false],
      ['s1-e6', 36, '2026-10-26', false],
    ]);
    // The festival week has no episode, so it holds nothing back.
    let weeks: readonly WeekRing[] = [];
    for (let n = 1; n <= 6; n++) weeks = fillWeek(weeks, n, firstDayOfWeek(n) + 5);
    expect(nextEpisodeWeek(TEST_SEASON, weeks)).toBeNull();
    expect(storyWeekOf(TEST_SEASON, weeks, 50)).toBe(8);
  });

  it('keeps the story week, the ring and the season map in step for any way of playing', () => {
    // Each step moves the day on, or plays one of the calls the week view offers today.
    const step = fc.oneof(
      fc.record({ kind: fc.constant('day' as const), by: fc.integer({ min: 0, max: 9 }) }),
      fc.record({
        kind: fc.constant('call' as const),
        slot: fc.constantFrom(...RING_SLOT_KINDS),
        waiting: fc.boolean(),
      }),
      fc.record({ kind: fc.constant('replay' as const), episode: fc.integer({ min: 1, max: 6 }) }),
    );
    fc.assert(
      fc.property(fc.array(step, { maxLength: 60 }), (steps) => {
        let day = 1;
        let weeks: readonly WeekRing[] = [];
        for (const [i, s] of steps.entries()) {
          const view = storyWeek({ season: TEST_SEASON, weeks, dayIndex: day, startedOn: START });
          if (s.kind === 'day') {
            day += s.by;
            continue;
          }
          if (s.kind === 'replay') {
            // The season map replays a finished episode; it never fills an episode week's slot.
            const done = seasonEpisodes({
              season: TEST_SEASON,
              weeks,
              dayIndex: day,
              startedOn: START,
            });
            if (done[s.episode - 1]?.state !== 'done') continue;
            const r = play(weeks, day, 'episode', `s1-e${s.episode}`, `r${i}`);
            if (r.filled !== null) expect(r.filled.week).toBeGreaterThan(6);
            weeks = r.weeks;
            continue;
          }
          const offered = s.waiting
            ? view.waiting.find((w) => w.kind === s.slot)
            : view.ring.find((r) => r.kind === s.slot && r.status === 'open');
          if (offered === undefined) continue;
          weeks = play(weeks, day, s.slot, offered.sceneId, `c${i}`).weeks;
        }
        const input = { season: TEST_SEASON, weeks, dayIndex: day, startedOn: START };
        const view = storyWeek(input);
        const map = seasonEpisodes(input);
        expect(view.week).toBeLessThanOrEqual(view.calendarWeek);
        expect(view.calendarWeek).toBe(weekOfDay(day));
        for (const w of view.weeks) expect(WeekRing.safeParse(w).success).toBe(true);
        // Episodes are played in order: none done after one that isn't.
        const states = map.map((e) => e.state);
        const firstNotDone = states.findIndex((st) => st !== 'done');
        if (firstNotDone !== -1) {
          expect(states.slice(firstNotDone).every((st) => st !== 'done')).toBe(true);
          expect(states[firstNotDone]).toBe('current');
        }
        // The map's current episode, once its day has come, is the week the story is on, and
        // both date it the same.
        const current = map.find((e) => e.state === 'current');
        if (current?.open) {
          expect(current.week).toBe(view.week);
          expect(current.opensOn).toBe(view.ring.find((r) => r.kind === 'episode')?.opensOn);
        }
        // Waiting calls are open, and only from weeks before the story week.
        for (const w of view.waiting) expect(w.week).toBeLessThan(view.week);
      }),
    );
  });
});
