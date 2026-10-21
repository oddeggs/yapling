import type {
  EpochMs,
  LocalDate,
  MinutesSummary,
  Plan,
  Seconds,
  TimeZone,
} from '@yapling/contracts';

import {
  addDays,
  daysBetween,
  localDateOf,
  startOfLocalDay,
  startOfMonth,
  startOfNextMonth,
} from './time';

/*
 * The live-minute ledger. Only live calls cost minutes; stories, postcards, voicemails and voice
 * notes never do. A call charges the seconds the learner talked plus the seconds the character
 * talked. Periods are in the learner's timezone:
 *
 * - Free, days 1–7 after install: a generous first week.
 * - Free, after that: 10 minutes a week, the week rolling from the install day's weekday (the same
 *   seven-day weeks as the ring).
 * - Plus: 150 minutes a calendar month, fair use.
 *
 * A new period, or a change of plan, starts a fresh allowance. At 60 seconds left the character
 * wraps the scene up kindly and the scene saves its place.
 */

/**
 * The free first week's live allowance: an hour, enough for the week's three calls (about 4, 3
 * and 4 minutes) several times over, plus the placement chat. Founder-tunable.
 */
export const FREE_FIRST_WEEK_SECONDS = 60 * 60;
/** Free plan, every week after the first. */
export const FREE_WEEKLY_SECONDS = 10 * 60;
/** Plus, per calendar month (fair use). */
export const PLUS_MONTHLY_SECONDS = 150 * 60;
/** From this many seconds left, the character wraps the scene up. */
export const WRAP_UP_SECONDS = 60;

export interface LedgerContext {
  readonly plan: Plan;
  readonly installedOn: LocalDate;
  readonly timezone: TimeZone;
  readonly now: EpochMs;
}

export interface LedgerPeriod {
  readonly plan: Plan;
  readonly periodStart: EpochMs;
  readonly periodEnd: EpochMs;
  readonly allowanceSeconds: Seconds;
  readonly firstWeek: boolean;
}

/** The period `now` falls in for the plan. */
export const ledgerPeriod = (ctx: LedgerContext): LedgerPeriod => {
  const today = localDateOf(ctx.now, ctx.timezone);
  if (ctx.plan === 'plus') {
    return {
      plan: 'plus',
      periodStart: startOfLocalDay(startOfMonth(today), ctx.timezone),
      periodEnd: startOfLocalDay(startOfNextMonth(today), ctx.timezone),
      allowanceSeconds: PLUS_MONTHLY_SECONDS,
      firstWeek: false,
    };
  }
  const week = Math.max(0, Math.floor(daysBetween(ctx.installedOn, today) / 7));
  const start = addDays(ctx.installedOn, week * 7);
  return {
    plan: 'free',
    periodStart: startOfLocalDay(start, ctx.timezone),
    periodEnd: startOfLocalDay(addDays(start, 7), ctx.timezone),
    allowanceSeconds: week === 0 ? FREE_FIRST_WEEK_SECONDS : FREE_WEEKLY_SECONDS,
    firstWeek: week === 0,
  };
};

/** What the ledger keeps: the period it counts and the seconds used in it. */
export interface LedgerState {
  readonly plan: Plan;
  readonly periodStart: EpochMs;
  readonly usedSeconds: Seconds;
}

/** The state for the period `now` falls in: a new period or plan starts at zero. */
export const currentLedger = (state: LedgerState | null, ctx: LedgerContext): LedgerState => {
  const period = ledgerPeriod(ctx);
  return state !== null && state.plan === period.plan && state.periodStart === period.periodStart
    ? state
    : { plan: period.plan, periodStart: period.periodStart, usedSeconds: 0 };
};

export interface LedgerStatus {
  readonly secondsLeft: Seconds;
  /** 60 s or less left: the character closes the scene kindly. */
  readonly wrappingUp: boolean;
  /** Nothing left: no new live call until the next period. */
  readonly exhausted: boolean;
}

const statusOf = (period: LedgerPeriod, used: Seconds): LedgerStatus => {
  const secondsLeft = Math.max(0, period.allowanceSeconds - used);
  return { secondsLeft, wrappingUp: secondsLeft <= WRAP_UP_SECONDS, exhausted: secondsLeft === 0 };
};

/** Seconds left right now, without charging. */
export const ledgerStatus = (state: LedgerState | null, ctx: LedgerContext): LedgerStatus =>
  statusOf(ledgerPeriod(ctx), currentLedger(state, ctx).usedSeconds);

export interface TalkSeconds {
  readonly learnerSeconds: Seconds;
  readonly characterSeconds: Seconds;
}

export interface ChargeResult extends LedgerStatus {
  readonly state: LedgerState;
  readonly chargedSeconds: Seconds;
}

/**
 * Charges talk time to the period `now` falls in. Seconds are whole and never negative. The last
 * chunk of a call may take the used seconds past the allowance; the learner is never cut off
 * mid-word, so the overrun is kept and `secondsLeft` stays at zero.
 */
export const chargeTalk = (
  state: LedgerState | null,
  ctx: LedgerContext,
  talk: TalkSeconds,
): ChargeResult => {
  const current = currentLedger(state, ctx);
  const chargedSeconds =
    Math.max(0, Math.round(talk.learnerSeconds)) + Math.max(0, Math.round(talk.characterSeconds));
  const next: LedgerState = { ...current, usedSeconds: current.usedSeconds + chargedSeconds };
  return { state: next, chargedSeconds, ...statusOf(ledgerPeriod(ctx), next.usedSeconds) };
};

/** `GET /api/me/minutes`. */
export const minutesSummary = (state: LedgerState | null, ctx: LedgerContext): MinutesSummary => {
  const period = ledgerPeriod(ctx);
  const used = currentLedger(state, ctx).usedSeconds;
  return {
    plan: period.plan,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    allowanceSeconds: period.allowanceSeconds,
    usedSeconds: used,
    leftSeconds: statusOf(period, used).secondsLeft,
    firstWeek: period.firstWeek,
  };
};
