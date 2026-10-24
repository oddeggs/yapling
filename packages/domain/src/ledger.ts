import type {
  CallKind,
  EpochMs,
  LocalDate,
  MinutesSummary,
  Plan,
  Seconds,
  TimeZone,
} from '@yapling/contracts';

import { addDays, daysBetween, localDateOf, startOfLocalDay } from './time';

/*
 * The live-minute ledger. Only live conversations cost minutes; the wall, replays and your words
 * never do, and neither does Pip's minute. A call charges the seconds the learner talked plus the
 * seconds the character talked. Periods are the learner's local days: nobody waits a week to see
 * what happens next.
 *
 * - Free, the first seven days from install: `FREE_FIRST_DAYS_MINUTES` a day, enough for several
 *   whole conversations, to feel understood and learn something they can name.
 * - Free, after that: `FREE_DAILY_MINUTES` a day.
 * - Plus: `PLUS_DAILY_MINUTES` a day, fair use.
 *
 * A new day, or a change of plan, starts a fresh allowance. At 60 seconds left the character
 * wraps the conversation up kindly and the painting is still kept.
 */

/** Free live minutes a day in the first week. Founder-tunable after the first learner test. */
export const FREE_FIRST_DAYS_MINUTES = 20;
/** Free live minutes a day after the first week. */
export const FREE_DAILY_MINUTES = 10;
/** Plus live minutes a day (fair use). */
export const PLUS_DAILY_MINUTES = 120;
/** How many days from install count as the generous first week. */
export const FIRST_DAYS = 7;
export const FREE_FIRST_DAYS_SECONDS = FREE_FIRST_DAYS_MINUTES * 60;
export const FREE_DAILY_SECONDS = FREE_DAILY_MINUTES * 60;
export const PLUS_DAILY_SECONDS = PLUS_DAILY_MINUTES * 60;
/** From this many seconds left, the character wraps the scene up. */
export const WRAP_UP_SECONDS = 60;

/** The calls that never cost live minutes: Settling in is free, and so is Pip's minute. */
export const UNMETERED_CALL_KINDS: ReadonlySet<CallKind> = new Set<CallKind>(['settling', 'daily']);

/** Whether a call of this kind costs live minutes. */
export const isMeteredCall = (kind: CallKind): boolean => !UNMETERED_CALL_KINDS.has(kind);

export interface LedgerContext {
  readonly plan: Plan;
  readonly installedOn: LocalDate;
  /**
   * The day the story started, which the free weeks count from. Null or left out: the install day
   * (a profile from before it was kept, or a Visitor still settling in, whose calls are free).
   */
  readonly storyStartedOn?: LocalDate | null;
  readonly timezone: TimeZone;
  readonly now: EpochMs;
}

/** The day the free days count from: the install day (or a story start kept from before). */
export const freeWeeksStartOn = (ctx: LedgerContext): LocalDate =>
  ctx.storyStartedOn ?? ctx.installedOn;

export interface LedgerPeriod {
  readonly plan: Plan;
  readonly periodStart: EpochMs;
  readonly periodEnd: EpochMs;
  readonly allowanceSeconds: Seconds;
  readonly firstWeek: boolean;
}

/** The period `now` falls in for the plan: the learner's local day. */
export const ledgerPeriod = (ctx: LedgerContext): LedgerPeriod => {
  const today = localDateOf(ctx.now, ctx.timezone);
  const periodStart = startOfLocalDay(today, ctx.timezone);
  const periodEnd = startOfLocalDay(addDays(today, 1), ctx.timezone);
  if (ctx.plan === 'plus') {
    return {
      plan: 'plus',
      periodStart,
      periodEnd,
      allowanceSeconds: PLUS_DAILY_SECONDS,
      firstWeek: false,
    };
  }
  const day = Math.max(0, daysBetween(freeWeeksStartOn(ctx), today));
  const firstWeek = day < FIRST_DAYS;
  return {
    plan: 'free',
    periodStart,
    periodEnd,
    allowanceSeconds: firstWeek ? FREE_FIRST_DAYS_SECONDS : FREE_DAILY_SECONDS,
    firstWeek,
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

/**
 * Whether a live call of this kind may start now: an unmetered call always may; a metered one
 * while the period has seconds left.
 */
export const canStartCall = (
  state: LedgerState | null,
  ctx: LedgerContext,
  kind: CallKind,
): boolean => !isMeteredCall(kind) || !ledgerStatus(state, ctx).exhausted;

export interface TalkSeconds {
  readonly learnerSeconds: Seconds;
  readonly characterSeconds: Seconds;
  /** The call's kind; an unmetered call (Settling in) charges nothing. Left out: metered. */
  readonly callKind?: CallKind;
}

export interface ChargeResult extends LedgerStatus {
  readonly state: LedgerState;
  readonly chargedSeconds: Seconds;
}

/**
 * Charges talk time to the period `now` falls in. Seconds are whole and never negative; an
 * unmetered call charges none. The last chunk of a call may take the used seconds past the
 * allowance; the learner is never cut off mid-word, so the overrun is kept and `secondsLeft` stays
 * at zero.
 */
export const chargeTalk = (
  state: LedgerState | null,
  ctx: LedgerContext,
  talk: TalkSeconds,
): ChargeResult => {
  const current = currentLedger(state, ctx);
  const metered = talk.callKind === undefined || isMeteredCall(talk.callKind);
  const chargedSeconds = metered
    ? Math.max(0, Math.round(talk.learnerSeconds)) + Math.max(0, Math.round(talk.characterSeconds))
    : 0;
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
