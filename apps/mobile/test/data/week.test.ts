import { describe, expect, it } from '@jest/globals';
import type { WeekRing } from '@yapling/contracts';

import { currentWeek, msUntilNextDay } from '../../src/data/week';
import { emptyProgress } from './fake-api';

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
    expect(week.weeks[0]).toEqual(done);
    expect(week.ring.slots.map((s) => s.status)).toEqual(['open', 'upcoming', 'upcoming']);
  });

  it('never goes behind the server’s day', () => {
    const week = currentWeek({ ...emptyProgress(), dayIndex: 9 }, OCT_22_10AM, TZ);
    expect(week).toMatchObject({ week: 2, dayIndex: 9 });
  });

  it('knows when the next local day starts', () => {
    expect(msUntilNextDay(OCT_22_10AM, TZ)).toBe(14 * 3_600_000);
  });
});
