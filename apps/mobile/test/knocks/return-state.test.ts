import { describe, expect, it, jest } from '@jest/globals';
import { instantOf } from '@yapling/domain';

import { returnStateOf } from '../../src/features/knocks/plan';

jest.mock('expo-notifications', () => ({}));

const tz = 'Asia/Ho_Chi_Minh';
const now = instantOf('2026-10-27', '08:45', tz);
const base = {
  now,
  timezone: tz,
  completedEpisodes: ['s1-e1'] as const,
  cameBackAfterAway: false,
};

describe('back after a few days', () => {
  it('is a normal welcome on the first open and after a day or two', () => {
    expect(returnStateOf({ ...base, lastOpenedAt: null })).toEqual({
      away: false,
      days: 0,
      recapKey: null,
    });
    const twoDays = returnStateOf({ ...base, lastOpenedAt: instantOf('2026-10-25', '23:50', tz) });
    expect(twoDays).toEqual({ away: false, days: 2, recapKey: null });
  });

  it('counts calendar days in the learner’s timezone, from three up', () => {
    const away = returnStateOf({ ...base, lastOpenedAt: instantOf('2026-10-24', '23:59', tz) });
    expect(away).toEqual({ away: true, days: 3, recapKey: 's1-e1.recap' });
    const longer = returnStateOf({ ...base, lastOpenedAt: instantOf('2026-10-17', '09:00', tz) });
    expect(longer.days).toBe(10);
  });

  it('has no recap before the first episode', () => {
    const away = returnStateOf({
      ...base,
      completedEpisodes: [],
      lastOpenedAt: instantOf('2026-10-20', '09:00', tz),
    });
    expect(away).toEqual({ away: true, days: 7, recapKey: null });
  });

  it('comes back after three days when the test menu says so', () => {
    const forced = returnStateOf({ ...base, cameBackAfterAway: true, lastOpenedAt: now - 60_000 });
    expect(forced).toEqual({ away: true, days: 3, recapKey: 's1-e1.recap' });
    const first = returnStateOf({ ...base, cameBackAfterAway: true, lastOpenedAt: null });
    expect(first.away).toBe(true);
    // A longer real absence stays as it was.
    const longer = returnStateOf({
      ...base,
      cameBackAfterAway: true,
      lastOpenedAt: instantOf('2026-10-20', '09:00', tz),
    });
    expect(longer.days).toBe(7);
  });
});
