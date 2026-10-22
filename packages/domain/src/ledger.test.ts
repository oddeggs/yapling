import { MinutesSummary, RING_SLOT_KINDS } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  canStartCall,
  chargeTalk,
  currentLedger,
  FREE_FIRST_WEEK_SECONDS,
  FREE_WEEKLY_MINUTES,
  FREE_WEEKLY_SECONDS,
  isMeteredCall,
  ledgerPeriod,
  ledgerStatus,
  minutesSummary,
  UNMETERED_CALL_KINDS,
  type LedgerContext,
  type LedgerState,
} from './ledger';
import { DAY_MS, HOUR_MS, instantOf } from './time';

const HCM = 'Asia/Ho_Chi_Minh';
// Installed on Wednesday 21 October 2026.
const installedOn = '2026-10-21';
const at = (date: string, time = '09:00') => instantOf(date, time, HCM);
const free = (now: number): LedgerContext => ({ plan: 'free', installedOn, timezone: HCM, now });
const plus = (now: number): LedgerContext => ({ plan: 'plus', installedOn, timezone: HCM, now });

describe('the live-minute ledger', () => {
  it('gives free learners a generous first week, then 10 minutes a week from the install weekday', () => {
    const first = ledgerPeriod(free(at('2026-10-27', '23:59')));
    expect(first.firstWeek).toBe(true);
    expect(first.allowanceSeconds).toBe(FREE_FIRST_WEEK_SECONDS);
    expect(FREE_FIRST_WEEK_SECONDS).toBeGreaterThan(10 * 60);
    expect(first.periodStart).toBe(at('2026-10-21', '00:00'));
    expect(first.periodEnd).toBe(at('2026-10-28', '00:00'));

    const second = ledgerPeriod(free(at('2026-10-28', '00:00')));
    expect(second.firstWeek).toBe(false);
    expect(second.allowanceSeconds).toBe(600);
    expect(second.periodStart).toBe(at('2026-10-28', '00:00'));
    // Weeks roll Wednesday to Wednesday.
    expect(ledgerPeriod(free(at('2026-11-10'))).periodStart).toBe(at('2026-11-04', '00:00'));
  });

  it('gives Plus 150 minutes per calendar month in the learner’s timezone', () => {
    // 18:00 UTC on 31 October is already 1 November in Ho Chi Minh City.
    const p = ledgerPeriod(plus(Date.UTC(2026, 9, 31, 18)));
    expect(p.allowanceSeconds).toBe(9_000);
    expect(p.firstWeek).toBe(false);
    expect(p.periodStart).toBe(at('2026-11-01', '00:00'));
    expect(p.periodEnd).toBe(at('2026-12-01', '00:00'));
  });

  it('charges learner and character talk, and wraps up at 60 seconds left', () => {
    const now = at('2026-11-02');
    let state: LedgerState | null = null;
    const r1 = chargeTalk(state, free(now), { learnerSeconds: 300, characterSeconds: 200 });
    expect(r1.chargedSeconds).toBe(500);
    expect(r1.secondsLeft).toBe(100);
    expect(r1.wrappingUp).toBe(false);
    state = r1.state;
    const r2 = chargeTalk(state, free(now), { learnerSeconds: 25, characterSeconds: 15 });
    expect(r2.secondsLeft).toBe(60);
    expect(r2.wrappingUp).toBe(true);
    expect(r2.exhausted).toBe(false);
    const r3 = chargeTalk(r2.state, free(now), { learnerSeconds: 50, characterSeconds: 30 });
    expect(r3.secondsLeft).toBe(0);
    expect(r3.exhausted).toBe(true);
    expect(r3.state.usedSeconds).toBe(620);
  });

  it('starts a fresh allowance in a new period or on a new plan', () => {
    const used = chargeTalk(null, free(at('2026-11-02')), {
      learnerSeconds: 600,
      characterSeconds: 0,
    }).state;
    expect(ledgerStatus(used, free(at('2026-11-03'))).exhausted).toBe(true);
    expect(ledgerStatus(used, free(at('2026-11-04'))).secondsLeft).toBe(600);
    expect(ledgerStatus(used, plus(at('2026-11-03'))).secondsLeft).toBe(9_000);
    expect(currentLedger(used, free(at('2026-11-03')))).toBe(used);
  });

  it('always reports a summary valid for the contract and never more left than allowed', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('free', 'plus'),
        fc.array(
          fc.record({
            day: fc.integer({ min: 0, max: 90 }),
            learner: fc.integer({ min: 0, max: 900 }),
            character: fc.integer({ min: 0, max: 900 }),
          }),
          { maxLength: 30 },
        ),
        (plan, charges) => {
          const base = at(installedOn, '00:00');
          let state: LedgerState | null = null;
          for (const c of [...charges].sort((a, b) => a.day - b.day)) {
            const ctx = {
              plan,
              installedOn,
              timezone: HCM,
              now: base + c.day * DAY_MS + 9 * HOUR_MS,
            };
            const r = chargeTalk(state, ctx, {
              learnerSeconds: c.learner,
              characterSeconds: c.character,
            });
            state = r.state;
            const summary = minutesSummary(state, ctx);
            expect(MinutesSummary.safeParse(summary).success).toBe(true);
            expect(summary.leftSeconds).toBe(r.secondsLeft);
            expect(summary.leftSeconds).toBe(
              Math.max(0, summary.allowanceSeconds - summary.usedSeconds),
            );
            expect(ctx.now).toBeGreaterThanOrEqual(summary.periodStart);
            expect(ctx.now).toBeLessThan(summary.periodEnd);
          }
        },
      ),
    );
  });
});

describe('the ledger on the beginner path', () => {
  // A Visitor installed on Wednesday 21 October, settled in for four days; the letter came on
  // Sunday 25 October.
  const storyStartedOn = '2026-10-25';
  const visitor = (now: number): LedgerContext => ({ ...free(now), storyStartedOn });

  it('never charges a Settling-in call, and charges every other kind', () => {
    expect(isMeteredCall('settling')).toBe(false);
    for (const kind of [
      'placement',
      'episode',
      'real_week',
      'practice',
      'voicemail_reply',
    ] as const) {
      expect(isMeteredCall(kind)).toBe(true);
    }
    const ctx = free(at('2026-10-22'));
    const settled = chargeTalk(null, ctx, {
      learnerSeconds: 90,
      characterSeconds: 80,
      callKind: 'settling',
    });
    expect(settled.chargedSeconds).toBe(0);
    expect(settled.state.usedSeconds).toBe(0);
    expect(settled.secondsLeft).toBe(FREE_FIRST_WEEK_SECONDS);
    const episode = chargeTalk(settled.state, ctx, {
      learnerSeconds: 90,
      characterSeconds: 80,
      callKind: 'episode',
    });
    expect(episode.chargedSeconds).toBe(170);
  });

  it('lets a Settling-in call start even when the minutes are used up', () => {
    const ctx = free(at('2026-11-10'));
    const spent = chargeTalk(null, ctx, { learnerSeconds: 600, characterSeconds: 0 }).state;
    expect(ledgerStatus(spent, ctx).exhausted).toBe(true);
    expect(canStartCall(spent, ctx, 'settling')).toBe(true);
    expect(canStartCall(spent, ctx, 'practice')).toBe(false);
    expect(canStartCall(null, ctx, 'practice')).toBe(true);
  });

  it('starts the generous first week on the day the story starts, not the install day', () => {
    const first = ledgerPeriod(visitor(at('2026-10-31', '23:59')));
    expect(first.firstWeek).toBe(true);
    expect(first.allowanceSeconds).toBe(FREE_FIRST_WEEK_SECONDS);
    expect(first.periodStart).toBe(at('2026-10-25', '00:00'));
    expect(first.periodEnd).toBe(at('2026-11-01', '00:00'));

    const second = ledgerPeriod(visitor(at('2026-11-01', '00:00')));
    expect(second.firstWeek).toBe(false);
    expect(second.allowanceSeconds).toBe(600);
    // Weeks roll Sunday to Sunday, from the story's start.
    expect(ledgerPeriod(visitor(at('2026-11-10'))).periodStart).toBe(at('2026-11-08', '00:00'));
  });

  it('gives a fresh first-week allowance when the story starts after Settling in', () => {
    // Minutes used before the story starts stay in the period before it.
    const settling = free(at('2026-10-22'));
    const used = chargeTalk(null, settling, { learnerSeconds: 300, characterSeconds: 300 }).state;
    const storyDay = visitor(at('2026-10-25', '18:00'));
    expect(ledgerStatus(used, storyDay).secondsLeft).toBe(FREE_FIRST_WEEK_SECONDS);
    expect(minutesSummary(used, storyDay).firstWeek).toBe(true);
  });

  it('counts from the install day when the story start is not recorded, as before', () => {
    for (const story of [null, installedOn]) {
      const p = ledgerPeriod({ ...free(at('2026-10-28')), storyStartedOn: story });
      expect(p.periodStart).toBe(at('2026-10-28', '00:00'));
      expect(p.firstWeek).toBe(false);
    }
  });

  it('leaves Plus on calendar months whatever the story start', () => {
    const p = ledgerPeriod({ ...plus(at('2026-10-26')), storyStartedOn });
    expect(p.periodStart).toBe(at('2026-10-01', '00:00'));
  });
});

describe('the ledger after the first week', () => {
  it('takes the free weekly allowance from one named number of minutes', () => {
    expect(FREE_WEEKLY_MINUTES).toBe(10);
    expect(FREE_WEEKLY_SECONDS).toBe(FREE_WEEKLY_MINUTES * 60);
    for (const date of ['2026-10-28', '2026-11-20', '2027-03-01']) {
      expect(ledgerPeriod(free(at(date))).allowanceSeconds).toBe(FREE_WEEKLY_SECONDS);
    }
  });

  it("never charges Pip's minute, which is no ring call", () => {
    expect(isMeteredCall('daily')).toBe(false);
    expect(UNMETERED_CALL_KINDS.has('daily')).toBe(true);
    expect((RING_SLOT_KINDS as readonly string[]).includes('daily')).toBe(false);
    const ctx = free(at('2026-11-10'));
    const minute = chargeTalk(null, ctx, {
      learnerSeconds: 20,
      characterSeconds: 25,
      callKind: 'daily',
    });
    expect(minute.chargedSeconds).toBe(0);
    expect(minutesSummary(minute.state, ctx).leftSeconds).toBe(FREE_WEEKLY_SECONDS);
  });

  it('never charges an unmetered call, and lets it start with no minutes left', () => {
    const ctx = free(at('2026-11-10'));
    const spent = chargeTalk(null, ctx, { learnerSeconds: 600, characterSeconds: 0 }).state;
    for (const kind of UNMETERED_CALL_KINDS) {
      const r = chargeTalk(spent, ctx, {
        learnerSeconds: 60,
        characterSeconds: 40,
        callKind: kind,
      });
      expect(r.chargedSeconds).toBe(0);
      expect(r.state.usedSeconds).toBe(spent.usedSeconds);
      expect(canStartCall(spent, ctx, kind)).toBe(true);
    }
  });
});
