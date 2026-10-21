import type { MinutesSummary, Plan } from '@yapling/contracts';

/*
 * The live-minute ledger's rules, kept apart from storage and the object so they can be swapped
 * whole. `@yapling/domain` will own the canonical ledger math; when it lands, an adapter that
 * implements `LedgerRules` with it replaces `localLedgerRules` in `user-object.ts`, and nothing
 * else changes. Until then these follow `tech-decisions.md` §3: free has a generous first week,
 * then 10 minutes a week; Plus has 150 minutes a month, fair use.
 */

const DAY_MS = 24 * 60 * 60_000;
const WEEK_MS = 7 * DAY_MS;
/** A Plus period: a month, as 30 days from the purchase's period start. */
const PLUS_PERIOD_MS = 30 * DAY_MS;

export const FIRST_WEEK_SECONDS = 60 * 60;
export const FREE_WEEK_SECONDS = 10 * 60;
export const PLUS_PERIOD_SECONDS = 150 * 60;
/** From this many seconds left the character wraps the scene up kindly. */
export const WRAP_UP_SECONDS = 60;

/** What the ledger knows about the learner, besides usage. */
export interface LedgerState {
  readonly plan: Plan;
  /** When the current Plus period started (from the purchase); unused on free. */
  readonly planPeriodStart: number;
  /** When the account was made: the first week counts from here. */
  readonly startedAt: number;
}

/** The period an instant falls in, and what it allows. */
export interface Period {
  readonly plan: Plan;
  readonly start: number;
  readonly end: number;
  readonly allowanceSeconds: number;
  readonly firstWeek: boolean;
}

/** The seam `@yapling/domain` will fill. */
export interface LedgerRules {
  period(state: LedgerState, now: number): Period;
}

function repeating(anchor: number, length: number, now: number): { start: number; end: number } {
  const k = Math.max(0, Math.floor((now - anchor) / length));
  const start = anchor + k * length;
  return { start, end: start + length };
}

export const localLedgerRules: LedgerRules = {
  period(state, now) {
    if (state.plan === 'plus') {
      const { start, end } = repeating(state.planPeriodStart, PLUS_PERIOD_MS, now);
      return { plan: 'plus', start, end, allowanceSeconds: PLUS_PERIOD_SECONDS, firstWeek: false };
    }
    const firstWeekEnd = state.startedAt + WEEK_MS;
    if (now < firstWeekEnd) {
      return {
        plan: 'free',
        start: state.startedAt,
        end: firstWeekEnd,
        allowanceSeconds: FIRST_WEEK_SECONDS,
        firstWeek: true,
      };
    }
    const { start, end } = repeating(firstWeekEnd, WEEK_MS, now);
    return { plan: 'free', start, end, allowanceSeconds: FREE_WEEK_SECONDS, firstWeek: false };
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
