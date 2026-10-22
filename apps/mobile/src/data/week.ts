import {
  TimeZone,
  type EpochMs,
  type LocalDate,
  type Progress,
  type WeekRing,
} from '@yapling/contracts';
import {
  addDays,
  dayIndexOf,
  firstDayOfWeek,
  isRingFull,
  localDateOf,
  ringWeeks,
  startOfLocalDay,
  weekOfDay,
} from '@yapling/domain';

/*
 * The current week's ring, as the phone shows it between syncs: the day comes from the day clock
 * in the learner's timezone, so a slot whose day has come shows open even offline. Nothing is ever
 * taken back: open and done slots stay as the server last had them.
 *
 * The weeks count from the day the story starts (`storyStartedOn`, the letter under the café door):
 * a Visitor settles in first, and their week 1 opens on the letter's day, not the install day. With
 * no story start recorded, they count from the install day, as the server's `dayIndex` does.
 */

export interface CurrentWeek {
  readonly week: number;
  /** Days since the story started (or the install, before it is recorded), that day being day 1. */
  readonly dayIndex: number;
  /** 1–7 within the week. */
  readonly dayOfWeek: number;
  readonly ring: WeekRing;
  readonly full: boolean;
  /** Every week so far, the current one last. */
  readonly weeks: readonly WeekRing[];
}

export function currentWeek(
  progress: Progress,
  now: EpochMs,
  timezone: TimeZone,
  storyStartedOn: LocalDate | null = null,
): CurrentWeek {
  const dayIndex =
    storyStartedOn !== null
      ? dayIndexOf(storyStartedOn, now, timezone)
      : Math.max(progress.dayIndex, dayIndexOf(progress.installedOn, now, timezone));
  const weeks = ringWeeks(progress.weeks, dayIndex);
  const week = weekOfDay(dayIndex);
  const ring = weeks[week - 1] ?? { week, slots: [] };
  return {
    week,
    dayIndex,
    dayOfWeek: dayIndex - firstDayOfWeek(week) + 1,
    ring,
    full: isRingFull(ring),
    weeks,
  };
}

/** The phone's IANA timezone, or null when the runtime doesn't give a usable one. */
export function phoneTimeZone(): TimeZone | null {
  const parsed = TimeZone.safeParse(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return parsed.success ? parsed.data : null;
}

/** The phone's own timezone, when the profile has none yet; Vietnam's (the launch) if unknown. */
export function deviceTimeZone(): TimeZone {
  return phoneTimeZone() ?? 'Asia/Ho_Chi_Minh';
}

/** Milliseconds until the next local midnight, when the day index moves on. */
export function msUntilNextDay(now: EpochMs, timezone: TimeZone): number {
  const tomorrow = addDays(localDateOf(now, timezone), 1);
  return Math.max(1_000, startOfLocalDay(tomorrow, timezone) - now);
}
