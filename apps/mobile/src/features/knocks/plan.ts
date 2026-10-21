import type { EpochMs, Id, LocalDate, TimeZone } from '@yapling/contracts';
import {
  AWAY_DAYS,
  DAY_MS,
  DEFAULT_QUIET_HOURS,
  WEEK_ONE_PLAN,
  dateOfDay,
  localDateOf,
  placeKnock,
  planWeekOneKnocks,
  welcomeFor,
  type KnockPlan,
  type KnockSender,
  type Season1EpisodeId,
  type WeekOneUnlock,
} from '@yapling/domain';
import { t, type Language, type StringKey } from '@yapling/i18n';
import { CAST } from '@yapling/story';
import type { Href } from 'expo-router';

import type { KnockInputs } from './inputs';

/*
 * From the day clock's week-one plan to the notifications the phone schedules: the copy in the
 * learner's language, who it is from, when it rings on the phone's clock, and where tapping it
 * goes. Pure, so the schedule is tested without a phone.
 */

/** Scheduled knocks carry this identifier prefix; anything else scheduled is not ours to touch. */
export const KNOCK_ID_PREFIX = 'knock-';

/** What each day's knock announces: the screen tapping it should bring forward. */
export const KNOCK_FOCUS: Readonly<Record<number, WeekOneUnlock>> = {
  2: 'episode_call',
  3: 'pip_story',
  4: 'real_week_call',
  5: 'practice_call',
  6: 'voicemail',
  7: 'plus_offer',
  8: 'next_episode_peek',
};

/**
 * Where a knock opens the app: the burrow, on the knock's day, with what it announced in focus
 * (`/?day=3&focus=pip_story`). The burrow reads the params; until it does, the burrow opens.
 */
export const knockPath = (day: number): string => {
  const focus = KNOCK_FOCUS[day];
  return focus === undefined ? `/?day=${day}` : `/?day=${day}&focus=${focus}`;
};

/** Where the app goes when a knock of a day is tapped (the route behind `knockPath`). */
export const knockHref = (day: number): Href => {
  const focus = KNOCK_FOCUS[day];
  return {
    pathname: '/',
    params: focus === undefined ? { day: String(day) } : { day: String(day), focus },
  };
};

/** The payload a knock carries to the tap handler. */
export interface KnockData {
  readonly kind: 'knock';
  readonly day: number;
  readonly url: string;
  /** Fired from the test menu: shown even with the app open. */
  readonly test?: boolean;
  /** When a scheduled knock rings, on the phone's clock. */
  readonly fireAt?: number;
}

/** Reads a notification's payload; null for anything that is not a knock. */
export const knockDataOf = (data: unknown): KnockData | null => {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d['kind'] !== 'knock' || typeof d['day'] !== 'number' || typeof d['url'] !== 'string') {
    return null;
  }
  // Only paths inside the app: a payload never sends the learner somewhere else.
  if (!d['url'].startsWith('/')) return null;
  return { kind: 'knock', day: d['day'], url: d['url'], test: d['test'] === true };
};

/** Who a knock is from, as its title: the roommate by its name, a neighbour by theirs, or the app. */
export const knockTitle = (from: KnockSender, language: Language, roommateName: string): string => {
  if (from === 'yapling') return t(language, 'knocks.from.yapling');
  if (from === 'pip') return roommateName;
  return CAST[from].name;
};

/**
 * A knock's line in the app's language. The catalogue keeps a character's own line in English in
 * every language and translates the app's; `{name}` is the roommate.
 */
export const knockBody = (key: string, language: Language, roommateName: string): string =>
  (t as (l: Language, k: StringKey, p: { name: string }) => string)(language, key as StringKey, {
    name: roommateName,
  });

export interface KnockContent {
  readonly title: string;
  readonly body: string;
  readonly data: KnockData;
}

export const knockContent = (
  day: number,
  plan: KnockPlan,
  language: Language,
  roommateName: string,
): KnockContent => ({
  title: knockTitle(plan.from, language, roommateName),
  body: knockBody(plan.key, language, roommateName),
  data: { kind: 'knock', day, url: knockPath(day) },
});

export interface KnockRequest extends KnockContent {
  readonly identifier: string;
  readonly day: number;
  /** When it rings in the learner's day (after quiet hours). */
  readonly date: LocalDate;
  readonly time: string;
  /** When it rings on the phone's clock (the app's time minus the debug offset). */
  readonly fireAt: EpochMs;
}

/** The app's time and the test menu's adjustments. */
export interface KnockClock {
  /** The app's time (`now()`). */
  readonly now: EpochMs;
  /** App time minus phone time; 0 outside the test builds. */
  readonly offsetMs: number;
  /** The test menu's "came back after 3 days". */
  readonly cameBackAfterAway: boolean;
}

/** The last day the learner opened the app, as the knock plan sees it: today, or three days ago. */
const lastOpenedOn = (clock: KnockClock, timezone: TimeZone): LocalDate =>
  localDateOf(clock.cameBackAfterAway ? clock.now - AWAY_DAYS * DAY_MS : clock.now, timezone);

/**
 * The knocks to schedule now: the week-one plan from the app's time on, moved out of quiet hours,
 * at most one a day, none when the learner said no. Planned on each open, with today as the last
 * day opened, so day 8 says "you're back" only to a learner who then stays away three days.
 */
export const planKnockRequests = (
  inputs: KnockInputs,
  language: Language,
  clock: KnockClock,
): readonly KnockRequest[] =>
  planWeekOneKnocks({
    installedOn: inputs.installedOn,
    timezone: inputs.timezone,
    now: clock.now,
    notificationsAllowed: inputs.notificationsAllowed,
    ...(inputs.quietHours === undefined ? {} : { quietHours: inputs.quietHours }),
    lastOpenedOn: lastOpenedOn(clock, inputs.timezone),
  }).map((knock) => ({
    ...knockContent(knock.day, knock, language, inputs.roommateName),
    identifier: `${KNOCK_ID_PREFIX}day-${knock.day}`,
    day: knock.day,
    date: knock.date,
    time: knock.time,
    fireAt: knock.at - clock.offsetMs,
  }));

/** The knock a day of the first week rings with (day 8's "you're back" after days away). */
export const knockPlanOfDay = (day: number, cameBackAfterAway: boolean): KnockPlan | null => {
  const entry = WEEK_ONE_PLAN.find((d) => d.day === day);
  if (entry === undefined) return null;
  return cameBackAfterAway && entry.knockAfterAway !== undefined
    ? entry.knockAfterAway
    : entry.knock;
};

/** A day's knock where it lands in the learner's day, for previews: null on day 1. */
export const knockOfDay = (
  day: number,
  inputs: Pick<KnockInputs, 'installedOn' | 'timezone' | 'quietHours' | 'roommateName'>,
  language: Language,
  cameBackAfterAway: boolean,
): (KnockContent & { readonly date: LocalDate; readonly time: string }) | null => {
  const plan = knockPlanOfDay(day, cameBackAfterAway);
  if (plan === null) return null;
  const slot = placeKnock(
    dateOfDay(inputs.installedOn, day),
    plan.time,
    inputs.timezone,
    inputs.quietHours === undefined ? DEFAULT_QUIET_HOURS : inputs.quietHours,
  );
  return {
    ...knockContent(day, plan, language, inputs.roommateName),
    date: slot.date,
    time: slot.time,
  };
};

/** How the burrow greets this open. */
export interface ReturnState {
  /** Three or more days since the last open. */
  readonly away: boolean;
  readonly days: number;
  /** The story so far, for Pip to tell; null before the first episode. */
  readonly recapKey: Id | null;
}

export const NOT_AWAY: ReturnState = { away: false, days: 0, recapKey: null };

/** The welcome for this open, from the day clock's rule (three days away). */
export const returnStateOf = (input: {
  readonly lastOpenedAt: EpochMs | null;
  readonly now: EpochMs;
  readonly timezone: TimeZone;
  readonly completedEpisodes: readonly Season1EpisodeId[];
  readonly cameBackAfterAway: boolean;
}): ReturnState => {
  const away = input.now - AWAY_DAYS * DAY_MS;
  const lastOpenedAt = input.cameBackAfterAway
    ? Math.min(input.lastOpenedAt ?? away, away)
    : input.lastOpenedAt;
  const welcome = welcomeFor({
    lastOpenedAt,
    now: input.now,
    timezone: input.timezone,
    completedEpisodes: input.completedEpisodes,
  });
  return welcome.kind === 'back_after_away'
    ? { away: true, days: welcome.daysAway, recapKey: welcome.recapKey }
    : { away: false, days: welcome.daysAway, recapKey: null };
};
