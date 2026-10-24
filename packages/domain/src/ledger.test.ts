import { MinutesSummary } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  canStartCall,
  chargeTalk,
  currentLedger,
  FREE_DAILY_SECONDS,
  FREE_FIRST_DAYS_SECONDS,
  isMeteredCall,
  ledgerPeriod,
  ledgerStatus,
  minutesSummary,
  PLUS_DAILY_SECONDS,
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
  it('gives free learners a generous allowance each day of the first week, then a smaller one', () => {
    const day7 = ledgerPeriod(free(at('2026-10-27', '23:59')));
    expect(day7.firstWeek).toBe(true);
    expect(day7.allowanceSeconds).toBe(FREE_FIRST_DAYS_SECONDS);
    expect(day7.periodStart).toBe(at('2026-10-27', '00:00'));
    expect(day7.periodEnd).toBe(at('2026-10-28', '00:00'));

    const day8 = ledgerPeriod(free(at('2026-10-28', '00:00')));
    expect(day8.firstWeek).toBe(false);
    expect(day8.allowanceSeconds).toBe(FREE_DAILY_SECONDS);
    expect(FREE_FIRST_DAYS_SECONDS).toBeGreaterThan(FREE_DAILY_SECONDS);
  });

  it('gives Plus a daily allowance in the learner’s timezone', () => {
    // 18:00 UTC on 31 October is already 1 November in Ho Chi Minh City.
    const p = ledgerPeriod(plus(Date.UTC(2026, 9, 31, 18)));
    expect(p.allowanceSeconds).toBe(PLUS_DAILY_SECONDS);
    expect(p.firstWeek).toBe(false);
    expect(p.periodStart).toBe(at('2026-11-01', '00:00'));
    expect(p.periodEnd).toBe(at('2026-11-02', '00:00'));
  });

  it('charges learner and character talk, and wraps up at 60 seconds left', () => {
    const now = at('2026-11-02');
    const r1 = chargeTalk(null, free(now), { learnerSeconds: 300, characterSeconds: 200 });
    expect(r1.chargedSeconds).toBe(500);
    expect(r1.secondsLeft).toBe(100);
    expect(r1.wrappingUp).toBe(false);
    const r2 = chargeTalk(r1.state, free(now), { learnerSeconds: 25, characterSeconds: 15 });
    expect(r2.secondsLeft).toBe(60);
    expect(r2.wrappingUp).toBe(true);
    expect(r2.exhausted).toBe(false);
    const r3 = chargeTalk(r2.state, free(now), { learnerSeconds: 50, characterSeconds: 30 });
    expect(r3.secondsLeft).toBe(0);
    expect(r3.exhausted).toBe(true);
    expect(r3.state.usedSeconds).toBe(620);
  });

  it('starts a fresh allowance the next day or on a new plan', () => {
    const used = chargeTalk(null, free(at('2026-11-02')), {
      learnerSeconds: 600,
      characterSeconds: 0,
    }).state;
    expect(ledgerStatus(used, free(at('2026-11-02', '22:00'))).exhausted).toBe(true);
    expect(ledgerStatus(used, free(at('2026-11-03'))).secondsLeft).toBe(FREE_DAILY_SECONDS);
    expect(ledgerStatus(used, plus(at('2026-11-02'))).secondsLeft).toBe(PLUS_DAILY_SECONDS);
    expect(currentLedger(used, free(at('2026-11-02', '23:00')))).toBe(used);
  });

  it('lets an unmetered call start with no minutes left, and never charges it', () => {
    const ctx = free(at('2026-11-10'));
    const spent = chargeTalk(null, ctx, { learnerSeconds: 600, characterSeconds: 0 }).state;
    expect(canStartCall(spent, ctx, 'moment')).toBe(false);
    expect(canStartCall(null, ctx, 'moment')).toBe(true);
    expect(isMeteredCall('moment')).toBe(true);
    for (const kind of UNMETERED_CALL_KINDS) {
      const r = chargeTalk(spent, ctx, {
        learnerSeconds: 60,
        characterSeconds: 40,
        callKind: kind,
      });
      expect(r.chargedSeconds).toBe(0);
      expect(canStartCall(spent, ctx, kind)).toBe(true);
    }
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
