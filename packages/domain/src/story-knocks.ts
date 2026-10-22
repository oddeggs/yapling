import type { Id, LocalDate, LocalTime, WeekRing } from '@yapling/contracts';

import {
  WEEK_ONE_PLAN,
  dateOfDay,
  storyStartOn,
  type KnockPlanContext,
  type ScheduledKnock,
} from './day-clock';
import { DEFAULT_QUIET_HOURS, oneKnockPerDay, placeKnock } from './knocks';
import { firstDayOfWeek, weekOfDay } from './ring';
import {
  nextEpisodeWeek,
  seasonRingWeeks,
  storyWeekPlan,
  type SeasonWeeks,
  type WeekOpening,
} from './story-week';
import { addDays, daysBetween, localDateOf } from './time';

/*
 * Knocks for the weeks after the first, from each week's own slots: the new episode, Pip's story
 * and the voicemail, each from its character. Only new things knock: nothing that is already
 * waiting, no ring call, never Pip's minute. At most one a day, never in quiet hours, and planned
 * only 14 days ahead of the last time the learner opened the app, so a learner who stays away two
 * weeks simply stops hearing from us. A week is knocked for only once the story has reached it
 * (every episode before it played), so a knock never announces something the learner can't open.
 */

/** The things in a week that knock, in the order they win a shared day. */
export const LATER_WEEK_KNOCK_KINDS = ['episode', 'story', 'voicemail'] as const;
export type LaterWeekKnockKind = (typeof LATER_WEEK_KNOCK_KINDS)[number];

/** When each one wants to ring, before quiet hours move it. Founder-tunable. */
export const LATER_WEEK_KNOCK_TIMES: Readonly<Record<LaterWeekKnockKind, LocalTime>> = {
  episode: '08:15',
  story: '12:40',
  voicemail: '19:20',
};

/** Knocks are planned this many days past the last open, and no further. */
export const KNOCK_HORIZON_DAYS = 14;

/** The i18n key of a later week's knock (the knocks catalogue): `knocks.week3_episode`. */
export const laterWeekKnockKey = (week: number, kind: LaterWeekKnockKind): string =>
  `knocks.week${week}_${kind}`;

/** The last story day week one's own plan knocks for; later weeks' knocks start after it. */
const WEEK_ONE_PLAN_LAST_DAY = Math.max(...WEEK_ONE_PLAN.map((d) => d.day));

export interface LaterWeekKnockContext extends KnockPlanContext {
  readonly season: SeasonWeeks;
  /** The rings as progress has them. */
  readonly weeks: readonly WeekRing[];
}

export interface LaterWeekKnock extends ScheduledKnock {
  readonly week: number;
  /** 1–7 within the week. */
  readonly dayOfWeek: number;
  readonly kind: LaterWeekKnockKind;
  readonly scene: Id;
}

/** The one thing of a day that knocks: the first of `LATER_WEEK_KNOCK_KINDS` the day opens. */
const knockOfDay = (
  opens: readonly WeekOpening[],
): {
  readonly kind: LaterWeekKnockKind;
  readonly opening: WeekOpening;
  readonly scene: Id;
} | null => {
  for (const kind of LATER_WEEK_KNOCK_KINDS) {
    const opening = opens.find((o) => o.kind === kind && o.scene !== null);
    if (opening !== undefined && opening.scene !== null) {
      return { kind, opening, scene: opening.scene };
    }
  }
  return null;
};

/**
 * The later weeks' knocks still to come, rebuilt whenever the app opens: one for each new episode,
 * story and voicemail on its day, from week 2 on (after week one's plan), in weeks the story has
 * reached, no further than 14 days past the last open; moved out of quiet hours, at most one a
 * day, none in the past, none without permission.
 */
export const planLaterWeekKnocks = (ctx: LaterWeekKnockContext): readonly LaterWeekKnock[] => {
  if (!ctx.notificationsAllowed) return [];
  const quiet = ctx.quietHours === undefined ? DEFAULT_QUIET_HOURS : ctx.quietHours;
  const dayOne = storyStartOn({
    installedOn: ctx.installedOn,
    storyStartedOn: ctx.storyStartedOn ?? null,
  });
  const today = localDateOf(ctx.now, ctx.timezone);
  const lastOpen: LocalDate =
    ctx.lastOpenedOn !== null && ctx.lastOpenedOn > today ? ctx.lastOpenedOn : today;
  const horizon = addDays(lastOpen, KNOCK_HORIZON_DAYS);
  const todayIndex = Math.max(1, daysBetween(dayOne, today) + 1);
  const lastWeek = weekOfDay(daysBetween(dayOne, horizon) + 1);
  const rings = seasonRingWeeks(ctx.weeks, todayIndex, ctx.season);
  // The story reaches week W once every episode before W is played.
  const reached = nextEpisodeWeek(ctx.season, rings) ?? Number.POSITIVE_INFINITY;
  const knocks: LaterWeekKnock[] = [];
  for (let week = 2; week <= Math.min(lastWeek, reached); week++) {
    for (const { day, opens } of storyWeekPlan(ctx.season[week - 1], week)) {
      const storyDay = firstDayOfWeek(week) - 1 + day;
      const date = dateOfDay(dayOne, storyDay);
      const knock = knockOfDay(opens);
      if (knock === null || storyDay <= WEEK_ONE_PLAN_LAST_DAY || date > horizon) continue;
      const face = knock.opening.cast[0] ?? 'pip';
      const slot = placeKnock(date, LATER_WEEK_KNOCK_TIMES[knock.kind], ctx.timezone, quiet);
      knocks.push({
        ...slot,
        day: storyDay,
        week,
        dayOfWeek: day,
        kind: knock.kind,
        scene: knock.scene,
        key: laterWeekKnockKey(week, knock.kind),
        from: face,
        face,
      });
    }
  }
  return oneKnockPerDay(knocks.filter((k) => k.at > ctx.now));
};
