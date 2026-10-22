import { RING_SLOT_KINDS, type WeekRing } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { dateOfDay, planWeekOneKnocks } from './day-clock';
import { DEFAULT_QUIET_HOURS, isQuietTime } from './knocks';
import { fillRingSlot } from './ring';
import { TEST_SEASON } from './season.fixture';
import {
  KNOCK_HORIZON_DAYS,
  LATER_WEEK_KNOCK_KINDS,
  planLaterWeekKnocks,
  type LaterWeekKnockContext,
} from './story-knocks';
import { seasonRingWeeks } from './story-week';
import { addDays, DAY_MS, HOUR_MS, instantOf, localDateOf } from './time';

const HCM = 'Asia/Ho_Chi_Minh';
const START = '2026-09-21';
const on = (day: number, hour = 7): number =>
  instantOf(START, '00:00', HCM) + (day - 1) * DAY_MS + hour * HOUR_MS;

/** Every ring call of weeks 1…`through`, each played on its week's day 6. */
const played = (through: number): readonly WeekRing[] => {
  let weeks: readonly WeekRing[] = [];
  for (let week = 1; week <= through; week++) {
    const day = (week - 1) * 7 + 6;
    for (const kind of RING_SLOT_KINDS) {
      const ring = seasonRingWeeks(weeks, day, TEST_SEASON);
      const sceneId = ring[week - 1]?.slots.find((s) => s.kind === kind)?.sceneId ?? null;
      weeks = fillRingSlot(
        ring,
        { kind, callRecordId: `${kind}-${week}`, doneAt: on(day), sceneId },
        HCM,
      ).weeks;
    }
  }
  return weeks;
};

const ctx = (day: number, weeks: readonly WeekRing[], extra: Partial<LaterWeekKnockContext> = {}) =>
  ({
    installedOn: START,
    storyStartedOn: START,
    timezone: HCM,
    now: on(day),
    notificationsAllowed: true,
    lastOpenedOn: dateOfDay(START, day),
    season: TEST_SEASON,
    weeks,
    ...extra,
  }) satisfies LaterWeekKnockContext;

const days = (knocks: readonly { readonly day: number }[]) => knocks.map((k) => k.day);

describe('knocks after the first week', () => {
  it('knock for the week’s new story and voicemail, after week one’s own day 8', () => {
    const knocks = planLaterWeekKnocks(ctx(8, played(1)));
    expect(knocks.map((k) => [k.day, k.kind, k.key, k.from, k.time])).toEqual([
      [9, 'story', 'knocks.week2_story', 'pip', '12:40'],
      [12, 'voicemail', 'knocks.week2_voicemail', 'sol', '19:20'],
    ]);
    // Day 8 is week one's coming-back knock, which announces Episode 2.
    expect(days(planWeekOneKnocks(ctx(7, played(1))))).toContain(8);
    expect(days(planLaterWeekKnocks(ctx(7, played(1))))).not.toContain(8);
  });

  it('knock for a week only once the story has reached it', () => {
    // Episode 2 played: week 3 is next, and its episode, story and voicemail knock.
    const knocks = planLaterWeekKnocks(ctx(13, played(2)));
    expect(knocks.map((k) => [k.day, k.kind, k.from])).toEqual([
      [15, 'episode', 'mei'],
      [16, 'story', 'pip'],
      [19, 'voicemail', 'sol'],
    ]);
  });

  it('only knock for new things: a learner who missed week 3 hears nothing until they play', () => {
    // Back on day 24 with Episode 3 still waiting: week 3's things are open already, and week 4's
    // can't be played before Episode 3.
    expect(planLaterWeekKnocks(ctx(24, played(2)))).toEqual([]);
  });

  it('plan only 14 days past the last open', () => {
    // A season of weeks with no episode to wait for: a story every week on day 2.
    const stories = Array.from({ length: 8 }, (_, i) => ({
      id: `w${i + 1}`,
      week: [{ day: 2, scene: `w${i + 1}-story` }],
      scenes: [{ id: `w${i + 1}-story`, kind: 'story', cast: ['pip' as const] }],
    }));
    const knocks = planLaterWeekKnocks(ctx(8, [], { season: stories }));
    expect(knocks.map((k) => [k.day, k.date])).toEqual([
      [9, '2026-09-29'],
      [16, '2026-10-06'],
    ]);
    // Opened again on day 20: the horizon moves with it.
    expect(days(planLaterWeekKnocks(ctx(20, [], { season: stories })))).toEqual([23, 30]);
  });

  it('end with the festival week’s story; weeks past the season have nothing to announce', () => {
    const knocks = planLaterWeekKnocks(ctx(41, played(6), { now: on(41, 20) }));
    expect(knocks.map((k) => [k.week, k.kind, k.day])).toEqual([[7, 'story', 44]]);
  });

  it('ring at most once a day, out of quiet hours, and never without permission', () => {
    expect(planLaterWeekKnocks(ctx(8, played(1), { notificationsAllowed: false }))).toEqual([]);
    // Quiet over lunch: the story knock moves to the end of them.
    const lunch = planLaterWeekKnocks(
      ctx(8, played(1), { quietHours: { start: '12:00', end: '14:00' } }),
    );
    expect(lunch[0]).toMatchObject({ day: 9, time: '14:00' });
    // Quiet from 19:00 to 13:00: the day-12 voicemail moves into day 13.
    const long = planLaterWeekKnocks(
      ctx(8, played(2), { quietHours: { start: '19:00', end: '13:00' } }),
    );
    expect(long.map((k) => [k.day, k.date, k.time])).toEqual([
      [9, '2026-09-29', '13:00'],
      [12, '2026-10-03', '13:00'],
      [15, '2026-10-05', '13:00'],
      [16, '2026-10-06', '13:00'],
      [19, '2026-10-10', '13:00'],
    ]);
  });

  it('keep their rules whatever the learner has played and whenever they open', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 0, max: 6 }),
        fc.boolean(),
        (day, through, quiet) => {
          // Only weeks whose calls (played on day 6 of each) have already happened.
          const weeks = played(Math.min(through, day >= 6 ? Math.floor((day - 6) / 7) + 1 : 0));
          const quietHours = quiet ? DEFAULT_QUIET_HOURS : null;
          const knocks = planLaterWeekKnocks(ctx(day, weeks, { quietHours }));
          const dates = knocks.map((k) => k.date);
          expect(new Set(dates).size).toBe(dates.length);
          const horizon = addDays(dateOfDay(START, day), KNOCK_HORIZON_DAYS);
          for (const k of knocks) {
            expect(k.at).toBeGreaterThan(on(day));
            expect(k.ownDate <= horizon).toBe(true);
            expect(k.day).toBeGreaterThan(8);
            expect(LATER_WEEK_KNOCK_KINDS).toContain(k.kind);
            expect(localDateOf(k.at, HCM)).toBe(k.date);
            if (quietHours !== null) expect(isQuietTime(k.time, quietHours)).toBe(false);
          }
        },
      ),
    );
  });
});
