import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { pick, seededRng } from './rng';
import {
  addDays,
  daysBetween,
  instantOf,
  localDateOf,
  localTimeOf,
  startOfLocalDay,
  startOfMonth,
  startOfNextMonth,
  utcOffsetMs,
} from './time';

const HCM = 'Asia/Ho_Chi_Minh';

describe('calendar days', () => {
  it('reads the learner’s day and time in their timezone', () => {
    // 2026-10-21T17:30Z is 00:30 on the 22nd in Ho Chi Minh City (UTC+7).
    const at = Date.UTC(2026, 9, 21, 17, 30);
    expect(localDateOf(at, HCM)).toBe('2026-10-22');
    expect(localTimeOf(at, HCM)).toBe('00:30');
    expect(localDateOf(at, 'UTC')).toBe('2026-10-21');
    expect(utcOffsetMs(at, HCM)).toBe(7 * 3_600_000);
  });

  it('adds and counts days across months and leap years', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(daysBetween('2026-10-22', '2026-10-29')).toBe(7);
    expect(daysBetween('2026-10-29', '2026-10-22')).toBe(-7);
    expect(startOfMonth('2026-10-22')).toBe('2026-10-01');
    expect(startOfNextMonth('2026-12-09')).toBe('2027-01-01');
  });

  it('adding then counting days gives the same number', () => {
    fc.assert(
      fc.property(fc.integer({ min: -2_000, max: 2_000 }), (n) => {
        expect(daysBetween('2026-10-22', addDays('2026-10-22', n))).toBe(n);
      }),
    );
  });

  it('finds local midnight, and the wall time round-trips', () => {
    expect(startOfLocalDay('2026-10-22', HCM)).toBe(Date.UTC(2026, 9, 21, 17));
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3_000 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.constantFrom(HCM, 'UTC', 'Asia/Jakarta', 'America/Sao_Paulo', 'Asia/Tokyo'),
        (dayOffset, h, m, tz) => {
          const date = addDays('2025-01-01', dayOffset);
          const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          const at = instantOf(date, time, tz);
          expect(localDateOf(at, tz)).toBe(date);
          expect(localTimeOf(at, tz)).toBe(time);
        },
      ),
    );
  });

  it('moves a time that a clock skips forward past the gap', () => {
    // Clocks in Berlin jump from 02:00 to 03:00 on 2026-03-29.
    const at = instantOf('2026-03-29', '02:30', 'Europe/Berlin');
    expect(localTimeOf(at, 'Europe/Berlin')).toBe('03:30');
    // 02:30 happens twice on 2026-10-25; the first one is chosen (still on summer time).
    const twice = instantOf('2026-10-25', '02:30', 'Europe/Berlin');
    expect(utcOffsetMs(twice, 'Europe/Berlin')).toBe(2 * 3_600_000);
  });
});

describe('seeded random source', () => {
  it('replays the same sequence for the same seed', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('picks only from the list', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1 }), fc.integer(), (items, seed) => {
        expect(items).toContain(pick(items, seededRng(seed)));
      }),
    );
    expect(pick([], seededRng(1))).toBeUndefined();
  });
});
