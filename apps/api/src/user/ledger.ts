import type { LocalDate, MinutesSummary, Plan, TimeZone } from '@yapling/contracts';
import { ledgerPeriod, WRAP_UP_SECONDS } from '@yapling/domain';

/*
 * The live-minute ledger's rules, kept apart from storage and the object. `domainLedgerRules` is
 * `@yapling/domain`'s canonical ledger (`tech-decisions.md` §3): free has a generous first week
 * from the day the story started (the install day until that is known), then 10 minutes a week on
 * the same weekday; Plus has 150 minutes a calendar month, fair use. Periods start at the
 * learner's local midnight. Settling-in calls are free (`isMeteredCall`).
 */

/**
 * The ledger's timezone until the learner has a profile: Vietnam, where the app launches.
 */
export const DEFAULT_LEDGER_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** What the ledger knows about the learner, besides usage. */
export interface LedgerState {
  readonly plan: Plan;
  /** The learner's timezone: periods follow their local days. */
  readonly timezone: TimeZone;
  /** The install day in that timezone: the free weeks count from here until the story starts. */
  readonly installedOn: LocalDate;
  /** The day the story started, once it has: the free weeks count from here. */
  readonly storyStartedOn: LocalDate | null;
}

/** The period an instant falls in, and what it allows. */
export interface Period {
  readonly plan: Plan;
  readonly start: number;
  readonly end: number;
  readonly allowanceSeconds: number;
  readonly firstWeek: boolean;
}

export interface LedgerRules {
  period(state: LedgerState, now: number): Period;
}

export const domainLedgerRules: LedgerRules = {
  period: (state, now) => {
    const p = ledgerPeriod({
      plan: state.plan,
      installedOn: state.installedOn,
      storyStartedOn: state.storyStartedOn,
      timezone: state.timezone,
      now,
    });
    return {
      plan: p.plan,
      start: p.periodStart,
      end: p.periodEnd,
      allowanceSeconds: p.allowanceSeconds,
      firstWeek: p.firstWeek,
    };
  },
};

export function secondsLeft(period: Period, usedSeconds: number): number {
  return Math.max(0, period.allowanceSeconds - usedSeconds);
}

/** `GET /api/me/minutes`. */
export function minutesSummary(period: Period, usedSeconds: number): MinutesSummary {
  return {
    plan: period.plan,
    periodStart: period.start,
    periodEnd: period.end,
    allowanceSeconds: period.allowanceSeconds,
    usedSeconds,
    leftSeconds: secondsLeft(period, usedSeconds),
    firstWeek: period.firstWeek,
  };
}

/** Who was talking: both count toward live minutes. */
export type TalkKind = 'learner' | 'character';

/** What a charge leaves: the call's `minutes` frame is made from it. */
export interface ChargeResult {
  readonly secondsLeft: number;
  /** From 60 s left: the character closes the scene kindly. */
  readonly wrappingUp: boolean;
  /** Nothing left: the call ends with `minutes_exhausted`. */
  readonly exhausted: boolean;
}

export function chargeResult(period: Period, usedSeconds: number): ChargeResult {
  const left = secondsLeft(period, usedSeconds);
  return { secondsLeft: left, wrappingUp: left <= WRAP_UP_SECONDS, exhausted: left === 0 };
}

/**
 * What a charge of an unmetered call (Settling in) leaves: nothing was charged, and the call never
 * wraps up or ends for minutes, whatever the period has left.
 */
export function unmeteredResult(period: Period, usedSeconds: number): ChargeResult {
  return { secondsLeft: secondsLeft(period, usedSeconds), wrappingUp: false, exhausted: false };
}
