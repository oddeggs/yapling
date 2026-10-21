import type { EpochMs, LocalDate, LocalTime, QuietHours, TimeZone } from '@yapling/contracts';

import { addDays, instantOf, localDateOf, minutesOfDay } from './time';

/*
 * Knocks: notifications that knock instead of nag. Opt-in, at most one a day, never inside the
 * learner's quiet hours, and always framed as an event or a favour (the copy lives in
 * `@yapling/i18n`; never guilt, never "you'll lose…", no countdowns).
 */

/** Quiet hours until the learner sets their own. */
export const DEFAULT_QUIET_HOURS: QuietHours = { start: '22:00', end: '08:00' };

/** True when a time falls inside quiet hours (which may run past midnight). End is exclusive. */
export const isQuietTime = (time: LocalTime, quiet: QuietHours): boolean => {
  const t = minutesOfDay(time);
  const start = minutesOfDay(quiet.start);
  const end = minutesOfDay(quiet.end);
  return start < end ? t >= start && t < end : t >= start || t < end;
};

/**
 * The first time at or after `date` `time` outside quiet hours: unchanged when allowed, otherwise
 * the end of the quiet hours (the next day when they run past midnight and `time` is before it).
 */
export const nextAllowedTime = (
  date: LocalDate,
  time: LocalTime,
  quiet: QuietHours | null,
): { readonly date: LocalDate; readonly time: LocalTime } => {
  if (quiet === null || !isQuietTime(time, quiet)) return { date, time };
  const wraps = minutesOfDay(quiet.start) >= minutesOfDay(quiet.end);
  const afterStart = minutesOfDay(time) >= minutesOfDay(quiet.start);
  return { date: wraps && afterStart ? addDays(date, 1) : date, time: quiet.end };
};

export interface KnockSlot {
  /** The calendar day the knock belongs to (what it announces). */
  readonly ownDate: LocalDate;
  /** When it rings, after quiet hours moved it. */
  readonly date: LocalDate;
  readonly time: LocalTime;
  readonly at: EpochMs;
}

/** Places a knock wanted at `date` `time`, moved out of quiet hours, as an instant. */
export const placeKnock = (
  date: LocalDate,
  time: LocalTime,
  timezone: TimeZone,
  quiet: QuietHours | null,
): KnockSlot => {
  const allowed = nextAllowedTime(date, time, quiet);
  const at = instantOf(allowed.date, allowed.time, timezone);
  return { ownDate: date, date: localDateOf(at, timezone), time: allowed.time, at };
};

/**
 * At most one knock a day. When two land on the same day (quiet hours pushed one into the next
 * day), the day's own knock stays and the pushed one is dropped; what it announced still waits in
 * the app. Between two knocks of the same standing, the earlier one stays.
 */
export const oneKnockPerDay = <T extends KnockSlot>(knocks: readonly T[]): readonly T[] => {
  const byDay = new Map<LocalDate, T>();
  for (const knock of [...knocks].sort((a, b) => a.at - b.at)) {
    const kept = byDay.get(knock.date);
    const own = knock.ownDate === knock.date;
    if (kept === undefined || (own && kept.ownDate !== kept.date)) byDay.set(knock.date, knock);
  }
  return [...byDay.values()].sort((a, b) => a.at - b.at);
};
