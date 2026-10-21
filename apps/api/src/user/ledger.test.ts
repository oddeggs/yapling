import { MinutesSummary } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import {
  FREE_FIRST_WEEK_SECONDS,
  FREE_WEEKLY_SECONDS,
  PLUS_MONTHLY_SECONDS,
  startOfLocalDay,
} from '@yapling/domain';

import { chargeResult, DEFAULT_LEDGER_TIMEZONE, domainLedgerRules, minutesSummary } from './ledger';

const DAY = 24 * 60 * 60_000;
const HCM = DEFAULT_LEDGER_TIMEZONE;

describe('the ledger rules', () => {
  // 22 Oct 2026, 16:00 in Ho Chi Minh City.
  const installed = Date.UTC(2026, 9, 22, 9);
  const midnight = startOfLocalDay('2026-10-22', HCM);
  const learner = { plan: 'free', timezone: HCM, installedOn: '2026-10-22' } as const;

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
      start: startOfLocalDay('2026-10-01', HCM),
      end: startOfLocalDay('2026-11-01', HCM),
      allowanceSeconds: PLUS_MONTHLY_SECONDS,
      firstWeek: false,
    });
  });

  it("follows the learner's own local midnight", () => {
    const la = { ...learner, timezone: 'America/Los_Angeles' } as const;
    expect(domainLedgerRules.period(la, installed).start).toBe(
      startOfLocalDay('2026-10-22', 'America/Los_Angeles'),
    );
  });

  it('wraps up from a minute left and runs out at none', () => {
    const period = domainLedgerRules.period(learner, installed);
    expect(chargeResult(period, 0)).toEqual({
      secondsLeft: 3_600,
      wrappingUp: false,
      exhausted: false,
    });
    expect(chargeResult(period, FREE_FIRST_WEEK_SECONDS - 61)).toMatchObject({
      secondsLeft: 61,
      wrappingUp: false,
    });
    expect(chargeResult(period, FREE_FIRST_WEEK_SECONDS - 60)).toEqual({
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
    const period = domainLedgerRules.period(learner, installed);
    const summary = MinutesSummary.parse(minutesSummary(period, 4_000));
    expect(summary).toMatchObject({ usedSeconds: 4_000, leftSeconds: 0, firstWeek: true });
  });
});
