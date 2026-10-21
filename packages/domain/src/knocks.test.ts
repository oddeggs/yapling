import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_QUIET_HOURS,
  isQuietTime,
  nextAllowedTime,
  oneKnockPerDay,
  placeKnock,
} from './knocks';
import { localTimeOf, timeOfMinutes } from './time';

const HCM = 'Asia/Ho_Chi_Minh';
const time = fc.integer({ min: 0, max: 1_439 }).map(timeOfMinutes);

describe('quiet hours', () => {
  it('default to 22:00–08:00, running past midnight', () => {
    expect(DEFAULT_QUIET_HOURS).toEqual({ start: '22:00', end: '08:00' });
    expect(
      ['22:00', '23:59', '00:00', '07:59'].map((t) => isQuietTime(t, DEFAULT_QUIET_HOURS)),
    ).toEqual([true, true, true, true]);
    expect(['08:00', '12:40', '21:59'].map((t) => isQuietTime(t, DEFAULT_QUIET_HOURS))).toEqual([
      false,
      false,
      false,
    ]);
    expect(isQuietTime('13:30', { start: '13:00', end: '14:00' })).toBe(true);
  });

  it('move a knock to the end of the quiet hours, the next day when they run past midnight', () => {
    expect(nextAllowedTime('2026-09-22', '08:12', DEFAULT_QUIET_HOURS)).toEqual({
      date: '2026-09-22',
      time: '08:12',
    });
    expect(nextAllowedTime('2026-09-22', '07:30', DEFAULT_QUIET_HOURS)).toEqual({
      date: '2026-09-22',
      time: '08:00',
    });
    expect(nextAllowedTime('2026-09-26', '19:20', { start: '18:00', end: '09:00' })).toEqual({
      date: '2026-09-27',
      time: '09:00',
    });
    expect(nextAllowedTime('2026-09-22', '08:12', null).time).toBe('08:12');
  });

  it('never leave a knock inside quiet hours, and never move it backwards', () => {
    fc.assert(
      fc.property(time, time, time, (wanted, start, end) => {
        fc.pre(start !== end);
        const quiet = { start, end };
        const moved = nextAllowedTime('2026-09-22', wanted, quiet);
        expect(isQuietTime(moved.time, quiet)).toBe(false);
        expect(`${moved.date} ${moved.time}` >= `2026-09-22 ${wanted}`).toBe(true);
        const slot = placeKnock('2026-09-22', wanted, HCM, quiet);
        expect(localTimeOf(slot.at, HCM)).toBe(moved.time);
      }),
    );
  });
});

describe('one knock a day', () => {
  it('keeps the day’s own knock over one pushed into it by quiet hours', () => {
    const quiet = { start: '18:00', end: '09:00' };
    const pushed = placeKnock('2026-09-26', '19:20', HCM, quiet); // lands on the 27th at 09:00
    const own = placeKnock('2026-09-27', '10:02', HCM, quiet);
    expect(pushed.date).toBe('2026-09-27');
    expect(oneKnockPerDay([pushed, own])).toEqual([own]);
  });

  it('keeps at most one per day, whatever comes in', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ day: fc.integer({ min: 0, max: 9 }), t: time }), { maxLength: 20 }),
        (wanted) => {
          const slots = wanted.map((w) =>
            placeKnock(
              `2026-09-${String(21 + w.day).padStart(2, '0')}`,
              w.t,
              HCM,
              DEFAULT_QUIET_HOURS,
            ),
          );
          const kept = oneKnockPerDay(slots);
          expect(new Set(kept.map((k) => k.date)).size).toBe(kept.length);
          expect(new Set(slots.map((k) => k.date)).size).toBe(kept.length);
        },
      ),
    );
  });
});
