import type { WeekRing } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import { TEST_SEASON } from './season.fixture';
import {
  seasonEndedOn,
  seasonKeepsakeId,
  seasonKeepsakeOf,
  withSeasonKeepsake,
} from './season-keepsake';

const zone = 'Asia/Ho_Chi_Minh';
const day = (d: number) => Date.UTC(2026, 10, d, 3); // 10:00 in Hồ Chí Minh City

/** Rings for weeks 1–7 with the episode slot of each week in `played` done on day `week * 7`. */
const rings = (played: readonly number[]): WeekRing[] =>
  Array.from({ length: 7 }, (_, i) => {
    const week = i + 1;
    const done = played.includes(week);
    return {
      week,
      slots: [
        {
          kind: 'episode',
          status: done ? 'done' : 'open',
          sceneId: `s1-e${week}`,
          callRecordId: done ? `call-${week}` : null,
          doneAt: done ? day(week * 3) : null,
        },
        { kind: 'real_week', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
        { kind: 'practice', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
      ],
    };
  });

describe('the season keepsake', () => {
  it('waits while any episode is still to play, a missed one included', () => {
    expect(seasonEndedOn(TEST_SEASON, rings([1, 2, 3, 4, 5]), zone)).toBeNull();
    expect(seasonEndedOn(TEST_SEASON, rings([1, 2, 4, 5, 6]), zone)).toBeNull();
    expect(seasonKeepsakeOf(1, TEST_SEASON, rings([1, 2, 3]), zone)).toBeNull();
  });

  it('is earned on the day the last episode was played, signed by Mei', () => {
    expect(seasonEndedOn(TEST_SEASON, rings([1, 2, 3, 4, 5, 6]), zone)).toBe('2026-11-18');
    expect(seasonKeepsakeOf(1, TEST_SEASON, rings([1, 2, 3, 4, 5, 6]), zone)).toEqual({
      id: 'season-1',
      kind: 'season',
      canDoId: null,
      signedBy: 'mei',
      earnedOn: '2026-11-18',
    });
  });

  it('is kept once: the first day it was earned never moves', () => {
    const first = seasonKeepsakeOf(1, TEST_SEASON, rings([1, 2, 3, 4, 5, 6]), zone);
    if (first === null) throw new Error('earned');
    const kept = withSeasonKeepsake([], first);
    expect(kept).toEqual([first]);
    const again = withSeasonKeepsake(kept, { ...first, earnedOn: '2026-12-01' });
    expect(again).toBe(kept);
    expect(seasonKeepsakeId(2)).toBe('season-2');
  });
});
