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
  localDateOf,
  startOfLocalDay,
  storyWeek,
  type SeasonWeeks,
  type StoryWeek,
  type StoryWeekSlot,
} from '@yapling/domain';

import { SEASON_WEEKS } from './season';

/*
 * The learner's week, as the phone shows it between syncs: the day comes from the day clock in the
 * learner's timezone, so a slot whose day has come shows open even offline. Nothing is ever taken
 * back: open and done slots stay as the server last had them.
 *
 * The days count from the day the story starts (`storyStartedOn`, the letter under the café door):
 * a Visitor settles in first, and their week 1 opens on the letter's day, not the install day. With
 * no story start recorded, they count from the install day, as the server's `dayIndex` does.
 *
 * The week is the story's, not only the calendar's: the week of the next episode the learner hasn't
 * played, never ahead of the calendar. A learner who missed week 3 comes back in week 4 to week 3,
 * and calls still open from weeks before it wait in `waiting`. Each slot opens on its scene's day
 * and knows its scene, as the season's weeks say.
 */

export interface CurrentWeek extends Omit<StoryWeek, 'ring'> {
  /** Days since the story started (or the install, before it is recorded), that day being day 1. */
  readonly dayIndex: number;
  /** Day 1's date. */
  readonly startedOn: LocalDate;
  /** The story week's ring. */
  readonly ring: WeekRing;
  /** The story week's ring slots, each with the day and date it opens. */
  readonly slots: readonly StoryWeekSlot[];
}

export function currentWeek(
  progress: Progress,
  now: EpochMs,
  timezone: TimeZone,
  storyStartedOn: LocalDate | null = null,
  season: SeasonWeeks = SEASON_WEEKS,
): CurrentWeek {
  const dayIndex =
    storyStartedOn !== null
      ? dayIndexOf(storyStartedOn, now, timezone)
      : Math.max(progress.dayIndex, dayIndexOf(progress.installedOn, now, timezone));
  // Day 1 as the count above has it (the server's day can be ahead of the install day's count).
  const startedOn = storyStartedOn ?? addDays(localDateOf(now, timezone), 1 - dayIndex);
  const { ring: slots, ...story } = storyWeek({
    season,
    weeks: progress.weeks,
    dayIndex,
    startedOn,
  });
  const ring = story.weeks[story.week - 1] ?? { week: story.week, slots: [] };
  return { ...story, dayIndex, startedOn, ring, slots };
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
