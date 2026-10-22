import type { LocalDate, TimeZone } from '@yapling/contracts';

import { SEEN_MOMENTS, appData } from '../../data';
import { jumpToDay, now } from './debug-clock';
import { fillRingPlan, listeningScenesBefore, storyDayOf, weekJumpPlan } from './week-tools';

/*
 * The week tools' effects: each writes the learner's real progress (the server's copy wins a
 * conflict, as any write) and the moments seen on this phone, then moves the debug clock.
 */

/** The learner the week tools work on: their story has started. */
export interface WeekLearner {
  /** The story's first day (week 1's day 1). */
  readonly storyDayOne: LocalDate;
  readonly timezone: TimeZone;
}

/** Week `week`, day `day`, with every week before it played (see `weekJumpPlan`). */
export async function jumpToWeek(week: number, day: number, learner: WeekLearner): Promise<void> {
  const data = appData();
  await data.progress.update((p) => {
    const plan = weekJumpPlan({
      week,
      day,
      weeks: p.weeks,
      keepsakes: p.keepsakes,
      startedOn: learner.storyDayOne,
      timezone: learner.timezone,
      season: data.season,
    });
    return { ...p, weeks: plan.weeks, keepsakes: plan.keepsakes };
  });
  // Week 1's named moments, and every story, postcard and voicemail before this week, heard.
  await data.seen.mark(SEEN_MOMENTS);
  await data.seen.markScenes(listeningScenesBefore(week, data.season));
  jumpToDay(storyDayOf(week, day), learner.storyDayOne, learner.timezone);
}

/** Week `week`'s ring full now, with its keepsake. */
export async function fillRing(week: number, learner: WeekLearner): Promise<void> {
  const data = appData();
  await data.progress.update((p) => {
    const plan = fillRingPlan({
      week,
      weeks: p.weeks,
      keepsakes: p.keepsakes,
      now: now(),
      timezone: learner.timezone,
      season: data.season,
    });
    return { ...p, weeks: plan.weeks, keepsakes: plan.keepsakes };
  });
}
