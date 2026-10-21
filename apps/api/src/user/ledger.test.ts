import { MinutesSummary } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import {
  FREE_FIRST_WEEK_SECONDS,
  FREE_WEEKLY_SECONDS,
  PLUS_MONTHLY_SECONDS,
  startOfLocalDay,
} from '@yapling/domain';

import {
  chargeResult,
  domainLedgerRules,
  FIRST_WEEK_SECONDS,
  FREE_WEEK_SECONDS,
  localLedgerRules,
  minutesSummary,
  LEDGER_TIMEZONE,
  PLUS_PERIOD_SECONDS,
} from './ledger';

const DAY = 24 * 60 * 60_000;
const start = Date.UTC(2026, 9, 22, 9);
const free = { plan: 'free', planPeriodStart: start, startedAt: start } as const;

describe('the ledger rules', () => {
  it('gives a free learner a generous first week, then ten minutes a week', () => {
    expect(localLedgerRules.period(free, start + DAY)).toEqual({
      plan: 'free',
      start,
      end: start + 7 * DAY,
      allowanceSeconds: FIRST_WEEK_SECONDS,
      firstWeek: true,
    });
    expect(localLedgerRules.period(free, start + 7 * DAY)).toEqual({
      plan: 'free',
      start: start + 7 * DAY,
      end: start + 14 * DAY,
      allowanceSeconds: FREE_WEEK_SECONDS,
      firstWeek: false,
    });
    expect(localLedgerRules.period(free, start + 20 * DAY)).toMatchObject({
      start: start + 14 * DAY,
      end: start + 21 * DAY,
    });
  });

  it('gives Plus 150 minutes a month from the purchase', () => {
    const paidAt = start + 3 * DAY;
    const plus = { ...free, plan: 'plus', planPeriodStart: paidAt } as const;
    expect(localLedgerRules.period(plus, paidAt + 31 * DAY)).toEqual({
      plan: 'plus',
      start: paidAt + 30 * DAY,
      end: paidAt + 60 * DAY,
      allowanceSeconds: PLUS_PERIOD_SECONDS,
      firstWeek: false,
    });
  });

  it('wraps up from a minute left and runs out at none', () => {
    const period = localLedgerRules.period(free, start);
    expect(chargeResult(period, 0)).toEqual({
      secondsLeft: 3_600,
      wrappingUp: false,
      exhausted: false,
    });
    expect(chargeResult(period, 3_539)).toMatchObject({ secondsLeft: 61, wrappingUp: false });
    expect(chargeResult(period, 3_540)).toEqual({
      secondsLeft: 60,
      wrappingUp: true,
      exhausted: false,
    });
    expect(chargeResult(period, 4_000)).toEqual({
      secondsLeft: 0,
      wrappingUp: true,
      exhausted: true,
    });
  });

  it('summarises a period by the contracts', () => {
    const period = localLedgerRules.period(free, start);
    const summary = MinutesSummary.parse(minutesSummary(period, 4_000));
    expect(summary).toMatchObject({ usedSeconds: 4_000, leftSeconds: 0, firstWeek: true });
  });
});

describe('the learning model behind the seam', () => {
  // 22 Oct 2026, 16:00 in Ho Chi Minh City.
  const installed = Date.UTC(2026, 9, 22, 9);
  const midnight = startOfLocalDay('2026-10-22', LEDGER_TIMEZONE);
  const learner = { plan: 'free', planPeriodStart: installed, startedAt: installed } as const;

  it('runs the free first week and then weekly allowances from the install day', () => {
    expect(domainLedgerRules.period(learner, installed + DAY)).toEqual({
      plan: 'free',
      start: midnight,
      end: midnight + 7 * DAY,
      allowanceSeconds: FREE_FIRST_WEEK_SECONDS,
      firstWeek: true,
    });
    expect(domainLedgerRules.period(learner, midnight + 9 * DAY)).toEqual({
      plan: 'free',
      start: midnight + 7 * DAY,
      end: midnight + 14 * DAY,
      allowanceSeconds: FREE_WEEKLY_SECONDS,
      firstWeek: false,
    });
  });

  it('gives Plus calendar months', () => {
    const plus = { ...learner, plan: 'plus' } as const;
    expect(domainLedgerRules.period(plus, installed)).toEqual({
      plan: 'plus',
      start: startOfLocalDay('2026-10-01', LEDGER_TIMEZONE),
      end: startOfLocalDay('2026-11-01', LEDGER_TIMEZONE),
      allowanceSeconds: PLUS_MONTHLY_SECONDS,
      firstWeek: false,
    });
  });

  it('wraps up and runs out by the same rule', () => {
    const period = domainLedgerRules.period(learner, installed);
    expect(chargeResult(period, FREE_FIRST_WEEK_SECONDS - 60)).toMatchObject({
      wrappingUp: true,
      exhausted: false,
    });
    expect(chargeResult(period, FREE_FIRST_WEEK_SECONDS)).toMatchObject({
      secondsLeft: 0,
      exhausted: true,
    });
  });
});
