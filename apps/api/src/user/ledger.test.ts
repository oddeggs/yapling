import { MinutesSummary } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import {
  FREE_DAILY_SECONDS,
  FREE_FIRST_DAYS_SECONDS,
  PLUS_DAILY_SECONDS,
  startOfLocalDay,
} from '@yapling/domain';

import {
  chargeResult,
  DEFAULT_LEDGER_TIMEZONE,
  domainLedgerRules,
  minutesSummary,
  unmeteredResult,
} from './ledger';

const DAY = 24 * 60 * 60_000;
const HCM = DEFAULT_LEDGER_TIMEZONE;

describe('the ledger rules', () => {
  // 22 Oct 2026, 16:00 in Ho Chi Minh City.
  const installed = Date.UTC(2026, 9, 22, 9);
  const midnight = startOfLocalDay('2026-10-22', HCM);
  const learner = {
    plan: 'free',
    timezone: HCM,
    installedOn: '2026-10-22',
    storyStartedOn: null,
  } as const;

  it('gives a daily allowance, generous for the first seven days from install', () => {
    expect(domainLedgerRules.period(learner, installed + DAY)).toEqual({
      plan: 'free',
      start: midnight + DAY,
      end: midnight + 2 * DAY,
      allowanceSeconds: FREE_FIRST_DAYS_SECONDS,
      firstWeek: true,
    });
    expect(domainLedgerRules.period(learner, midnight + 9 * DAY)).toEqual({
      plan: 'free',
      start: midnight + 9 * DAY,
      end: midnight + 10 * DAY,
      allowanceSeconds: FREE_DAILY_SECONDS,
      firstWeek: false,
    });
  });

  it('gives Plus a daily allowance', () => {
    const plus = { ...learner, plan: 'plus' } as const;
    expect(domainLedgerRules.period(plus, installed)).toEqual({
      plan: 'plus',
      start: midnight,
      end: midnight + DAY,
      allowanceSeconds: PLUS_DAILY_SECONDS,
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
      secondsLeft: FREE_FIRST_DAYS_SECONDS,
      wrappingUp: false,
      exhausted: false,
    });
    expect(chargeResult(period, FREE_FIRST_DAYS_SECONDS - 61)).toMatchObject({
      secondsLeft: 61,
      wrappingUp: false,
    });
    expect(chargeResult(period, FREE_FIRST_DAYS_SECONDS - 60)).toEqual({
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

  it('never wraps up or runs out an unmetered call', () => {
    const period = domainLedgerRules.period(learner, installed);
    expect(unmeteredResult(period, 4_000)).toEqual({
      secondsLeft: 0,
      wrappingUp: false,
      exhausted: false,
    });
    expect(unmeteredResult(period, 100)).toMatchObject({
      secondsLeft: FREE_FIRST_DAYS_SECONDS - 100,
    });
  });

  it('summarises a period by the contracts', () => {
    const period = domainLedgerRules.period(learner, installed);
    const summary = MinutesSummary.parse(minutesSummary(period, 4_000));
    expect(summary).toMatchObject({ usedSeconds: 4_000, leftSeconds: 0, firstWeek: true });
  });
});
