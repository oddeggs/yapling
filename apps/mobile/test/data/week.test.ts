import { describe, expect, it } from '@jest/globals';
import type { Progress, RingSlot, RingSlotKind, WeekRing } from '@yapling/contracts';
import { fillRingSlot, firstDayOfWeek, isRingFull, ringWeeks, weekOfDay } from '@yapling/domain';

import { currentWeek, msUntilNextDay } from '../../src/data/week';
import { emptyProgress } from './fake-api';
import { FULL_SEASON } from './season-fixture';

const TZ = 'Asia/Ho_Chi_Minh';
/** 2026-10-22 10:00 in Ho Chi Minh City (UTC+7). */
const OCT_22_10AM = Date.UTC(2026, 9, 22, 3, 0, 0);
const DAY = 86_400_000;

describe('the current week', () => {
  it('opens the week-one calls by the day clock, even before the server says so', () => {
    // Installed on 20 Oct: 22 Oct is day 3, so only the episode (day 2) is open.
    const week = currentWeek({ ...emptyProgress(), dayIndex: 1 }, OCT_22_10AM, TZ);
    expect(week).toMatchObject({ week: 1, dayIndex: 3, dayOfWeek: 3, full: false });
    expect(week.ring.slots.map((s) => s.status)).toEqual(['open', 'upcoming', 'upcoming']);
    // Day 5: the real-week call (day 4) and practice (day 5) are open too.
    const later = currentWeek(emptyProgress(), OCT_22_10AM + 2 * DAY, TZ);
    expect(later.ring.slots.map((s) => s.status)).toEqual(['open', 'open', 'open']);
  });

  it('keeps a missed week’s calls open and moves on to the next week', () => {
    const done: WeekRing = {
      week: 1,
      slots: [
        { kind: 'episode', status: 'done', sceneId: 's1-e1', callRecordId: 'c1', doneAt: 1 },
        { kind: 'real_week', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
        { kind: 'practice', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
      ],
    };
    const week = currentWeek({ ...emptyProgress(), weeks: [done] }, OCT_22_10AM + 6 * DAY, TZ);
    expect(week.week).toBe(2);
    expect(week.dayOfWeek).toBe(2);
    // The open calls stay open, and learn the scenes week 1 names for them.
    expect(week.weeks[0]?.slots).toEqual([
      done.slots[0],
      { ...done.slots[1], sceneId: 's1-e1-real-week' },
      { ...done.slots[2], sceneId: 's1-e1-practice' },
    ]);
    expect(week.ring.slots.map((s) => s.status)).toEqual(['open', 'upcoming', 'upcoming']);
    expect(week.waiting).toEqual([
      { week: 1, kind: 'real_week', sceneId: 's1-e1-real-week', opensOn: '2026-10-23' },
      { week: 1, kind: 'practice', sceneId: 's1-e1-practice', opensOn: '2026-10-24' },
    ]);
  });

  it('never goes behind the server’s day', () => {
    const week = currentWeek({ ...emptyProgress(), dayIndex: 9 }, OCT_22_10AM, TZ);
    expect(week).toMatchObject({ calendarWeek: 2, dayIndex: 9 });
  });

  it('counts a Visitor’s weeks from the day the story started, not the install day', () => {
    // Installed on 20 Oct, settled in, and the letter came on 22 Oct: that is week 1's day 1, so
    // nothing in the ring is open yet, whatever the server's install-day count says.
    const week = currentWeek({ ...emptyProgress(), dayIndex: 3 }, OCT_22_10AM, TZ, '2026-10-22');
    expect(week).toMatchObject({ week: 1, dayIndex: 1, dayOfWeek: 1 });
    expect(week.ring.slots.map((s) => s.status)).toEqual(['upcoming', 'upcoming', 'upcoming']);
    // The next day the episode opens.
    const next = currentWeek(emptyProgress(), OCT_22_10AM + DAY, TZ, '2026-10-22');
    expect(next.ring.slots.map((s) => s.status)).toEqual(['open', 'upcoming', 'upcoming']);
  });

  it('knows when the next local day starts', () => {
    expect(msUntilNextDay(OCT_22_10AM, TZ)).toBe(14 * 3_600_000);
  });
});

const done = (kind: RingSlotKind, sceneId: string | null, at = 1): RingSlot => ({
  kind,
  status: 'done',
  sceneId,
  callRecordId: `c-${kind}-${at}`,
  doneAt: at,
});
const open = (kind: RingSlotKind, sceneId: string | null): RingSlot => ({
  kind,
  status: 'open',
  sceneId,
  callRecordId: null,
  doneAt: null,
});
const fullRing = (week: number): WeekRing => ({
  week,
  slots: [
    done('episode', `s1-e${week}`),
    done('real_week', `s1-e${week}-real-week`),
    done('practice', `s1-e${week}-practice`),
  ],
});

/** The story started on 1 Oct, so story day N is N Oct. */
const STARTED = '2026-10-01';
const dayAt = (day: number): number => OCT_22_10AM + (day - 22) * DAY;
const withWeeks = (weeks: readonly WeekRing[]): Progress => ({
  ...emptyProgress(),
  weeks: [...weeks],
});

describe('the story week', () => {
  // Weeks 1 and 2 full; week 3's episode and real-week call done, its practice call still open.
  const weekThreePracticeOpen: readonly WeekRing[] = [
    fullRing(1),
    fullRing(2),
    {
      week: 3,
      slots: [
        done('episode', 's1-e3'),
        done('real_week', 's1-e3-real-week'),
        open('practice', 's1-e3-practice'),
      ],
    },
  ];

  it('reads week 4 and week 3’s practice call still waiting, from a full season', () => {
    const week = currentWeek(withWeeks(weekThreePracticeOpen), dayAt(22), TZ, STARTED, FULL_SEASON);
    expect(week).toMatchObject({
      week: 4,
      calendarWeek: 4,
      behind: false,
      dayIndex: 22,
      dayOfWeek: 1,
    });
    expect(week.ring.week).toBe(4);
    expect(week.slots).toEqual([
      expect.objectContaining({
        kind: 'episode',
        status: 'open',
        sceneId: 's1-e4',
        opensOn: '2026-10-22',
      }),
      expect.objectContaining({ kind: 'real_week', status: 'upcoming', opensOn: '2026-10-24' }),
      expect.objectContaining({ kind: 'practice', status: 'upcoming', opensOn: '2026-10-25' }),
    ]);
    expect(week.today.map((o) => o.scene)).toEqual(['s1-e4']);
    expect(week.waiting).toEqual([
      { week: 3, kind: 'practice', sceneId: 's1-e3-practice', opensOn: '2026-10-18' },
    ]);
    // On the week's fourth day all three of week 4's calls are open, and week 3's still waits.
    const later = currentWeek(
      withWeeks(weekThreePracticeOpen),
      dayAt(25),
      TZ,
      STARTED,
      FULL_SEASON,
    );
    expect(later.ring.slots.map((s) => s.status)).toEqual(['open', 'open', 'open']);
    expect(later.waiting.map((w) => [w.week, w.kind])).toEqual([[3, 'practice']]);
  });

  it('reads both from the story as it ships, a call the week names no scene for included', () => {
    const shipped: readonly WeekRing[] = [
      fullRing(1),
      {
        week: 2,
        slots: [done('episode', 's1-e2'), done('real_week', null), done('practice', null)],
      },
      {
        week: 3,
        slots: [done('episode', 's1-e3'), done('real_week', null), open('practice', null)],
      },
    ];
    const week = currentWeek(withWeeks(shipped), dayAt(22), TZ, STARTED);
    expect(week).toMatchObject({ week: 4, dayOfWeek: 1 });
    expect(week.ring.slots[0]).toMatchObject({ kind: 'episode', status: 'open', sceneId: 's1-e4' });
    expect(week.waiting).toEqual([
      expect.objectContaining({ week: 3, kind: 'practice', opensOn: '2026-10-18' }),
    ]);
  });

  it('keeps a learner who missed week 3 on week 3 until they play Episode 3', () => {
    const progress = withWeeks([fullRing(1), fullRing(2)]);
    const week = currentWeek(progress, dayAt(24), TZ, STARTED, FULL_SEASON);
    expect(week).toMatchObject({ week: 3, calendarWeek: 4, behind: true, dayOfWeek: 7 });
    expect(week.today).toEqual([]);
    expect(week.ring.slots.map((s) => [s.status, s.sceneId])).toEqual([
      ['open', 's1-e3'],
      ['open', 's1-e3-real-week'],
      ['open', 's1-e3-practice'],
    ]);
    expect(week.waiting).toEqual([]);
    // Episode 3, played in week 4, fills ring 3; the learner moves on to week 4 with week 3's
    // other calls waiting.
    const played = fillRingSlot(
      week.weeks,
      { kind: 'episode', callRecordId: 'e3', doneAt: dayAt(24), sceneId: 's1-e3' },
      TZ,
    );
    expect(played.filled).toEqual({ week: 3, kind: 'episode' });
    const next = currentWeek(withWeeks(played.weeks), dayAt(24), TZ, STARTED, FULL_SEASON);
    expect(next).toMatchObject({ week: 4, behind: false, dayOfWeek: 3 });
    expect(next.waiting.map((w) => [w.week, w.kind, w.sceneId])).toEqual([
      [3, 'real_week', 's1-e3-real-week'],
      [3, 'practice', 's1-e3-practice'],
    ]);
  });

  it('opens a later week’s calls on the days its scenes arrive', () => {
    // Week 5's practice call arrives on its sixth day, not the fourth.
    const weeks = [1, 2, 3, 4].map(fullRing);
    const fourth = currentWeek(withWeeks(weeks), dayAt(32), TZ, STARTED, FULL_SEASON);
    expect(fourth).toMatchObject({ week: 5, dayOfWeek: 4 });
    expect(fourth.ring.slots.map((s) => s.status)).toEqual(['open', 'open', 'upcoming']);
    const sixth = currentWeek(withWeeks(weeks), dayAt(34), TZ, STARTED, FULL_SEASON);
    expect(sixth.ring.slots.map((s) => s.status)).toEqual(['open', 'open', 'open']);
  });
});

describe('week 1', () => {
  // The week as it read before the story week: the calendar's week and the first week's plan.
  const before = (progress: Progress, day: number) => {
    const weeks = ringWeeks(progress.weeks, day);
    const week = weekOfDay(day);
    const ring = weeks[week - 1] ?? { week, slots: [] };
    return {
      week,
      dayOfWeek: day - firstDayOfWeek(week) + 1,
      statuses: ring.slots.map((s) => s.status),
      full: isRingFull(ring),
    };
  };
  const played = withWeeks([
    { week: 1, slots: [done('episode', 's1-e1'), open('real_week', null), open('practice', null)] },
  ]);

  it.each([1, 2, 3, 4, 5, 6, 7])('reads day %i as before', (day) => {
    for (const progress of [emptyProgress(), played]) {
      const week = currentWeek(progress, dayAt(day), TZ, STARTED);
      expect({
        week: week.week,
        dayOfWeek: week.dayOfWeek,
        statuses: week.ring.slots.map((s) => s.status),
        full: week.full,
      }).toEqual(before(progress, day));
      expect(week).toMatchObject({ calendarWeek: 1, behind: false, dayIndex: day, waiting: [] });
    }
  });

  it('ties week 1’s calls to its scenes and dates them from the story’s start', () => {
    const week = currentWeek(emptyProgress(), dayAt(5), TZ, STARTED);
    expect(week.slots.map((s) => [s.kind, s.sceneId, s.opensOn])).toEqual([
      ['episode', 's1-e1', '2026-10-02'],
      ['real_week', 's1-e1-real-week', '2026-10-04'],
      ['practice', 's1-e1-practice', '2026-10-05'],
    ]);
  });

  it('moves on to week 2 once Episode 1 is played', () => {
    const week = currentWeek(played, dayAt(8), TZ, STARTED);
    expect(week).toMatchObject({ week: 2, calendarWeek: 2, dayOfWeek: 1 });
    expect(week.waiting.map((w) => w.kind)).toEqual(['real_week', 'practice']);
  });
});
