import { Keepsake, RING_SLOT_KINDS, WeekRing } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  fillRingSlot,
  firstDayOfWeek,
  fullRingCount,
  ringWeeks,
  slotOpensOnDay,
  weekKeepsakeToWire,
  weekOfDay,
} from './ring';
import { DAY_MS, HOUR_MS, instantOf } from './time';

const HCM = 'Asia/Ho_Chi_Minh';
const on = (dayIndex: number, hour = 19): number =>
  instantOf('2026-09-21', '00:00', HCM) + (dayIndex - 1) * DAY_MS + hour * HOUR_MS;
const statuses = (w: WeekRing | undefined) => w?.slots.map((s) => s.status);

describe('the weekly ring', () => {
  it('counts weeks from the install day', () => {
    expect([1, 7, 8, 14, 15].map(weekOfDay)).toEqual([1, 1, 2, 2, 3]);
    expect(firstDayOfWeek(3)).toBe(15);
  });

  it('opens the first week’s calls on days 2, 4 and 5', () => {
    expect(RING_SLOT_KINDS.map((k) => slotOpensOnDay(1, k))).toEqual([2, 4, 5]);
    expect(statuses(ringWeeks([], 1)[0])).toEqual(['upcoming', 'upcoming', 'upcoming']);
    expect(statuses(ringWeeks([], 2)[0])).toEqual(['open', 'upcoming', 'upcoming']);
    expect(statuses(ringWeeks([], 4)[0])).toEqual(['open', 'open', 'upcoming']);
    expect(statuses(ringWeeks([], 5)[0])).toEqual(['open', 'open', 'open']);
    expect(RING_SLOT_KINDS.map((k) => slotOpensOnDay(2, k))).toEqual([8, 10, 11]);
  });

  it('asks the story for the scene when a slot opens', () => {
    const weeks = ringWeeks([], 2, (week, kind) => (kind === 'episode' ? `s1-e${week}` : null));
    expect(weeks[0]?.slots[0]?.sceneId).toBe('s1-e1');
    expect(weeks[0]?.slots[1]?.sceneId).toBeNull();
  });

  it('fills a ring with three calls and gives a week keepsake on the last', () => {
    let weeks = ringWeeks([], 5);
    const calls = [
      { kind: 'episode', callRecordId: 'c1', doneAt: on(2) },
      { kind: 'real_week', callRecordId: 'c2', doneAt: on(4) },
      { kind: 'practice', callRecordId: 'c3', doneAt: on(5) },
    ] as const;
    const results = calls.map((call) => {
      const r = fillRingSlot(weeks, call, HCM);
      weeks = r.weeks;
      return r;
    });
    expect(results.map((r) => r.filled)).toEqual([
      { week: 1, kind: 'episode' },
      { week: 1, kind: 'real_week' },
      { week: 1, kind: 'practice' },
    ]);
    expect(results.slice(0, 2).every((r) => r.ringFull === null)).toBe(true);
    expect(results[2]?.ringFull).toEqual({ id: 'week-1', week: 1, earnedOn: '2026-09-25' });
    expect(Keepsake.safeParse(weekKeepsakeToWire(results[2]!.ringFull!)).success).toBe(true);
    expect(weekKeepsakeToWire(results[2]!.ringFull!)).toEqual({
      id: 'week-1',
      kind: 'week',
      canDoId: null,
      signedBy: 'pip',
      earnedOn: '2026-09-25',
    });
    expect(fullRingCount(weeks)).toBe(1);
  });

  it('never misses a week: open slots wait, and the next call fills the oldest first', () => {
    // Away for all of week 1 after the episode; it's now day 12 (week 2).
    let weeks = ringWeeks([], 2);
    weeks = fillRingSlot(weeks, { kind: 'episode', callRecordId: 'c1', doneAt: on(2) }, HCM).weeks;
    weeks = ringWeeks(weeks, 12);
    expect(statuses(weeks[0])).toEqual(['done', 'open', 'open']);
    expect(statuses(weeks[1])).toEqual(['open', 'open', 'open']);
    const r = fillRingSlot(weeks, { kind: 'practice', callRecordId: 'c2', doneAt: on(12) }, HCM);
    expect(r.filled).toEqual({ week: 1, kind: 'practice' });
  });

  it('does not fill an upcoming slot early, nor count an extra call twice', () => {
    const weeks = ringWeeks([], 3);
    const early = fillRingSlot(weeks, { kind: 'practice', callRecordId: 'c', doneAt: on(3) }, HCM);
    expect(early.filled).toBeNull();
    expect(early.weeks).toBe(weeks);
  });

  it('only ever moves slots forward and stays valid for the contract', () => {
    const step = fc.oneof(
      fc.record({ kind: fc.constant('day' as const), by: fc.integer({ min: 0, max: 9 }) }),
      fc.record({ kind: fc.constant('call' as const), slot: fc.constantFrom(...RING_SLOT_KINDS) }),
    );
    const rank = { upcoming: 0, open: 1, done: 2 } as const;
    fc.assert(
      fc.property(fc.array(step, { maxLength: 40 }), (steps) => {
        let day = 1;
        let weeks = ringWeeks([], day);
        let keepsakes = 0;
        for (const [i, s] of steps.entries()) {
          const before = weeks;
          if (s.kind === 'day') {
            day += s.by;
            weeks = ringWeeks(weeks, day);
          } else {
            const r = fillRingSlot(
              weeks,
              { kind: s.slot, callRecordId: `c${i}`, doneAt: on(day) },
              HCM,
            );
            if (r.ringFull) keepsakes++;
            weeks = r.weeks;
          }
          before.forEach((w, wi) =>
            w.slots.forEach((slot, si) => {
              expect(rank[weeks[wi]!.slots[si]!.status]).toBeGreaterThanOrEqual(rank[slot.status]);
            }),
          );
          for (const w of weeks) expect(WeekRing.safeParse(w).success).toBe(true);
        }
        expect(weeks.length).toBe(weekOfDay(day));
        expect(keepsakes).toBe(fullRingCount(weeks));
      }),
    );
  });
});

describe('ring slots and their scenes', () => {
  const sceneFor = (week: number, kind: string) =>
    week === 1 || kind !== 'episode' ? null : `s1-e${week}`;

  it('fills the slot of the call’s own scene before an older slot with no scene', () => {
    const weeks = ringWeeks([], 16, sceneFor);
    const r = fillRingSlot(
      weeks,
      { kind: 'episode', callRecordId: 'c', doneAt: on(16), sceneId: 's1-e3' },
      HCM,
    );
    expect(r.filled).toEqual({ week: 3, kind: 'episode' });
    // Then a call with no slot of its own scene takes the oldest one with no scene.
    const other = fillRingSlot(
      r.weeks,
      { kind: 'episode', callRecordId: 'd', doneAt: on(16), sceneId: 'teach-the-yapling' },
      HCM,
    );
    expect(other.filled).toEqual({ week: 1, kind: 'episode' });
    // And never another scene’s slot.
    const none = fillRingSlot(
      other.weeks,
      { kind: 'episode', callRecordId: 'e', doneAt: on(16), sceneId: 's1-e5' },
      HCM,
    );
    expect(none.filled).toBeNull();
  });

  it('opens slots on the days it is given, and an open slot learns its scene later', () => {
    const weeks = ringWeeks(
      [],
      9,
      () => null,
      (week, kind) => (week === 2 && kind === 'episode' ? 9 : 99),
    );
    expect(statuses(weeks[1])).toEqual(['open', 'upcoming', 'upcoming']);
    expect(weeks[1]?.slots[0]?.sceneId).toBeNull();
    const learned = ringWeeks(weeks, 9, sceneFor, (week, kind) =>
      week === 2 && kind === 'episode' ? 9 : 99,
    );
    expect(learned[1]?.slots[0]?.sceneId).toBe('s1-e2');
  });
});
