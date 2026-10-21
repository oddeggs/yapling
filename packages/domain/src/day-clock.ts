import type {
  CharacterId,
  EpochMs,
  Id,
  LocalDate,
  LocalTime,
  QuietHours,
  TimeZone,
} from '@yapling/contracts';

import { SEASON_1_EPISODES, type Season1EpisodeId } from './can-dos';
import { DEFAULT_QUIET_HOURS, oneKnockPerDay, placeKnock, type KnockSlot } from './knocks';
import { addDays, daysBetween, localDateOf } from './time';

/*
 * The day clock and the first week. Day 1 is the install day; a new day starts at local midnight
 * in the learner's timezone. The first week is a fixed plan: what each day opens and the knock that
 * announces it. Everything a day opens stays open: coming back late finds it all waiting.
 */

/** Days since install in the learner's timezone; the install day is day 1. */
export const dayIndexOf = (installedOn: LocalDate, now: EpochMs, timezone: TimeZone): number =>
  Math.max(1, daysBetween(installedOn, localDateOf(now, timezone)) + 1);

/** The calendar day of a day index. */
export const dateOfDay = (installedOn: LocalDate, dayIndex: number): LocalDate =>
  addDays(installedOn, dayIndex - 1);

/** What the first week opens, day by day. */
export type WeekOneUnlock =
  | 'placement_chat'
  | 'residency_card'
  | 'linh_welcome'
  | 'letter_under_door'
  | 'week_view'
  | 'episode_call'
  | 'pip_story'
  | 'linh_postcard'
  | 'real_week_call'
  | 'practice_call'
  | 'voicemail'
  | 'season_map'
  | 'plus_offer'
  | 'next_episode_peek';

/** Who a knock is from: a character, or the app itself (for news about Pip, not from Pip). */
export type KnockSender = CharacterId | 'yapling';

export interface KnockPlan {
  /** The i18n key of the knock's body (`@yapling/i18n`, the knocks catalogue). */
  readonly key: string;
  readonly from: KnockSender;
  /** The face on the notification. */
  readonly face: CharacterId;
  /** The wanted local time, before quiet hours move it. */
  readonly time: LocalTime;
}

export interface WeekOneDay {
  readonly day: number;
  readonly unlocks: readonly WeekOneUnlock[];
  /** The morning knock; day 1 has none (the learner is in the app, moving in). */
  readonly knock: KnockPlan | null;
  /** Day 8's knock for a learner who has been away three days or more. */
  readonly knockAfterAway?: KnockPlan;
}

/** The first week, day 1 (moving in) to day 8 (coming back). */
export const WEEK_ONE_PLAN: readonly WeekOneDay[] = [
  {
    day: 1,
    unlocks: ['placement_chat', 'residency_card', 'linh_welcome', 'letter_under_door'],
    knock: null,
  },
  {
    day: 2,
    unlocks: ['week_view', 'episode_call'],
    knock: { key: 'knocks.day2', from: 'pip', face: 'pip', time: '08:12' },
  },
  {
    day: 3,
    unlocks: ['pip_story', 'linh_postcard'],
    knock: { key: 'knocks.day3', from: 'yapling', face: 'pip', time: '12:40' },
  },
  {
    day: 4,
    unlocks: ['real_week_call'],
    knock: { key: 'knocks.day4', from: 'pip', face: 'pip', time: '08:05' },
  },
  {
    day: 5,
    unlocks: ['practice_call'],
    knock: { key: 'knocks.day5', from: 'bea', face: 'bea', time: '08:30' },
  },
  {
    day: 6,
    unlocks: ['voicemail', 'season_map'],
    knock: { key: 'knocks.day6', from: 'yapling', face: 'pip', time: '19:20' },
  },
  {
    day: 7,
    unlocks: ['plus_offer'],
    knock: { key: 'knocks.day7', from: 'yapling', face: 'pip', time: '10:02' },
  },
  {
    day: 8,
    unlocks: ['next_episode_peek'],
    knock: { key: 'knocks.day8', from: 'pip', face: 'pip', time: '08:15' },
    knockAfterAway: { key: 'knocks.day8_back', from: 'pip', face: 'pip', time: '08:40' },
  },
];

/** The free first week's last day: the Plus offer shows; the weekly free allowance starts the next day. */
export const FREE_WEEK_ENDS_ON_DAY = 7;

/** Everything opened up to and including a day. Nothing ever closes again. */
export const weekOneUnlocks = (dayIndex: number): ReadonlySet<WeekOneUnlock> =>
  new Set(WEEK_ONE_PLAN.filter((d) => d.day <= dayIndex).flatMap((d) => d.unlocks));

/** Days without opening the app that make a "back after a few days" welcome. */
export const AWAY_DAYS = 3;

export interface ScheduledKnock extends KnockSlot {
  readonly day: number;
  readonly key: string;
  readonly from: KnockSender;
  readonly face: CharacterId;
}

export interface KnockPlanContext {
  readonly installedOn: LocalDate;
  readonly timezone: TimeZone;
  readonly now: EpochMs;
  readonly notificationsAllowed: boolean;
  /** The learner's quiet hours; null for none; left out for the default (22:00–08:00). */
  readonly quietHours?: QuietHours | null;
  /** The last day the learner opened the app, for day 8's coming-back knock. */
  readonly lastOpenedOn: LocalDate | null;
}

/**
 * The first week's knocks still to come: each day's knock at its time, moved out of quiet hours,
 * at most one a day, none in the past, none without permission. Rebuilt whenever the app opens.
 */
export const planWeekOneKnocks = (ctx: KnockPlanContext): readonly ScheduledKnock[] => {
  if (!ctx.notificationsAllowed) return [];
  const quiet = ctx.quietHours === undefined ? DEFAULT_QUIET_HOURS : ctx.quietHours;
  const knocks = WEEK_ONE_PLAN.flatMap((d): ScheduledKnock[] => {
    const date = dateOfDay(ctx.installedOn, d.day);
    const away = ctx.lastOpenedOn !== null && daysBetween(ctx.lastOpenedOn, date) >= AWAY_DAYS;
    const plan = away && d.knockAfterAway !== undefined ? d.knockAfterAway : d.knock;
    if (plan === null) return [];
    const slot = placeKnock(date, plan.time, ctx.timezone, quiet);
    return [{ ...slot, day: d.day, key: plan.key, from: plan.from, face: plan.face }];
  });
  return oneKnockPerDay(knocks.filter((k) => k.at > ctx.now));
};

/** The recap line of an episode, told by Pip when the learner comes back (story content). */
export const recapKey = (episode: Season1EpisodeId): Id => `${episode}.recap`;

/**
 * The recap Pip tells a learner coming back: the story so far, which is the last episode they
 * finished. When the waiting episode is the finale, Pip tells the finale's own line instead ("I
 * waited… you're speaking"): the finale never happens without the learner. Null before the first
 * episode and after the season.
 */
export const recapFor = (completed: readonly Season1EpisodeId[]): Id | null => {
  const last = Math.max(...completed.map((e) => SEASON_1_EPISODES.indexOf(e)), -1);
  const finished = SEASON_1_EPISODES[last];
  const waiting = SEASON_1_EPISODES[last + 1];
  if (finished === undefined || waiting === undefined) return null;
  return waiting === 's1-e6' ? recapKey('s1-e6') : recapKey(finished);
};

export type Welcome =
  | { readonly kind: 'normal'; readonly daysAway: number }
  | {
      readonly kind: 'back_after_away';
      readonly daysAway: number;
      /** The recap line to play, or null when there is no story yet to recap. */
      readonly recapKey: Id | null;
    };

/**
 * How the burrow greets a learner opening the app. Three or more days without opening is a "back
 * after a few days" welcome: Pip is glad, tells the recap, and everything is exactly where it was
 * left. No guilt, no sad critter, nothing lost: absence never changes progress (no rule in the
 * learning model takes time away from the learner).
 */
export const welcomeFor = (input: {
  readonly lastOpenedAt: EpochMs | null;
  readonly now: EpochMs;
  readonly timezone: TimeZone;
  readonly completedEpisodes: readonly Season1EpisodeId[];
}): Welcome => {
  if (input.lastOpenedAt === null) return { kind: 'normal', daysAway: 0 };
  const daysAway = Math.max(
    0,
    daysBetween(
      localDateOf(input.lastOpenedAt, input.timezone),
      localDateOf(input.now, input.timezone),
    ),
  );
  return daysAway >= AWAY_DAYS
    ? { kind: 'back_after_away', daysAway, recapKey: recapFor(input.completedEpisodes) }
    : { kind: 'normal', daysAway };
};
