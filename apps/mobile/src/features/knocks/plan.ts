import type { EpochMs, Id, LocalDate, TimeZone } from '@yapling/contracts';
import {
  AWAY_DAYS,
  DAY_MS,
  DEFAULT_QUIET_HOURS,
  WEEK_ONE_PLAN,
  dateOfDay,
  localDateOf,
  placeKnock,
  LATER_WEEK_KNOCK_KINDS,
  LATER_WEEK_KNOCK_TIMES,
  firstDayOfWeek,
  oneKnockPerDay,
  planWeekOneKnocks,
  welcomeFor,
  type KnockPlan,
  type KnockSender,
  type LaterWeekKnockKind,
  type ScheduledKnock,
  type Season1EpisodeId,
  type SeasonWeeks,
  type WeekOneUnlock,
} from '@yapling/domain';
import { t, type Language, type StringKey } from '@yapling/i18n';
import { CAST } from '@yapling/story';
import type { Href } from 'expo-router';

import { SEASON_WEEKS } from '../../data/season';
import { settlingStateOf, type KnockInputs } from './inputs';
import {
  planWeekKnocks,
  weekEpisodeDone,
  weekKnockDays,
  weekKnockKey,
  weekKnockPath,
  weekKnockSender,
  type WeekKnock,
} from './later-weeks';
import {
  SETTLING_KNOCKS,
  isKnockedChapter,
  isSettlingIn,
  nextSettlingChapter,
  planSettlingKnock,
  settlingCallPath,
  storyDayOneOf,
  type KnockedChapter,
} from './settling';

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
  /** The Settling-in chapter it announces (its call is `url`); left out for the first week's. */
  readonly chapter?: number;
  /** A later week's knock: its week and what it announces (its place is `url`). */
  readonly week?: number;
  readonly announces?: LaterWeekKnockKind;
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
  const chapter = d['chapter'];
  const week = d['week'];
  const announces = d['announces'];
  const later =
    typeof week === 'number' &&
    Number.isInteger(week) &&
    week >= 2 &&
    typeof announces === 'string' &&
    (LATER_WEEK_KNOCK_KINDS as readonly string[]).includes(announces);
  return {
    kind: 'knock',
    day: d['day'],
    url: d['url'],
    ...(typeof chapter === 'number' && isKnockedChapter(chapter) ? { chapter } : {}),
    ...(later ? { week, announces: announces as LaterWeekKnockKind } : {}),
    test: d['test'] === true,
  };
};

/**
 * Where a tapped knock goes. A Settling-in knock opens its chapter's call, unless the learner has
 * finished that chapter since or left Settling in (then the burrow, which shows what's next). A
 * later week's knock opens what it announced: the episode's call (the burrow once that episode has
 * been played since), the story or the voicemail. A first-week knock opens the burrow on its day.
 * `inputs` null: not known yet, so the knock's own place.
 */
export const knockTarget = (knock: KnockData, inputs: KnockInputs | null): Href => {
  if (knock.week !== undefined && knock.announces !== undefined) {
    const played =
      knock.announces === 'episode' &&
      inputs !== null &&
      knock.test !== true &&
      weekEpisodeDone(inputs.weeks ?? [], knock.week);
    return played ? '/' : knock.url;
  }
  if (knock.chapter === undefined) return knockHref(knock.day);
  // A test knock from the test menu always opens what it shows.
  if (inputs !== null && knock.test !== true) {
    const state = settlingStateOf(inputs);
    if (!isSettlingIn(state) || nextSettlingChapter(state.chapters) !== knock.chapter) {
      return '/';
    }
  }
  return knock.url;
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
  /** The test menu's "came back after N days". */
  readonly cameBackAfterAway: boolean;
  /** How many days away when `cameBackAfterAway`; left out for three. */
  readonly awayDays?: number;
}

/** The days away the test menu's return stands for. */
const awayDaysOf = (clock: Pick<KnockClock, 'awayDays'>): number =>
  clock.awayDays !== undefined && clock.awayDays >= AWAY_DAYS ? clock.awayDays : AWAY_DAYS;

/** The last day the learner opened the app, as the knock plan sees it: today, or N days ago. */
const lastOpenedOn = (clock: KnockClock, timezone: TimeZone): LocalDate =>
  localDateOf(
    clock.cameBackAfterAway ? clock.now - awayDaysOf(clock) * DAY_MS : clock.now,
    timezone,
  );

/** A Settling-in knock's content: from Yapling, in the app's language, opening its chapter. */
export const settlingKnockContent = (
  chapter: KnockedChapter,
  day: number,
  language: Language,
  roommateName: string,
): KnockContent => ({
  title: knockTitle('yapling', language, roommateName),
  body: knockBody(SETTLING_KNOCKS[chapter].key, language, roommateName),
  data: { kind: 'knock', day, url: settlingCallPath(chapter), chapter },
});

/** A later week's knock: from its character or from Yapling, opening what it announces. */
export const weekKnockContent = (
  knock: Pick<WeekKnock, 'week' | 'dayOfWeek' | 'kind' | 'scene' | 'day'>,
  language: Language,
  roommateName: string,
  atVisitor: boolean,
  season: SeasonWeeks = SEASON_WEEKS,
): KnockContent => ({
  title: knockTitle(weekKnockSender(knock.week, knock.kind, atVisitor), language, roommateName),
  body: knockBody(weekKnockKey(knock.week, knock.kind, atVisitor), language, roommateName),
  data: {
    kind: 'knock',
    day: knock.day,
    url: weekKnockPath(season, knock),
    week: knock.week,
    announces: knock.kind,
  },
});

/** Later weeks' knocks carry this identifier, by week and what each announces. */
export const weekKnockId = (week: number, kind: LaterWeekKnockKind): string =>
  `${KNOCK_ID_PREFIX}week${week}-${kind}`;

const isWeekKnock = (knock: ScheduledKnock | WeekKnock): knock is WeekKnock => 'week' in knock;

/** Settling-in knocks carry this identifier, by chapter. */
export const settlingKnockId = (chapter: KnockedChapter): string =>
  `${KNOCK_ID_PREFIX}settling-${chapter}`;

/**
 * The knocks to schedule now. While a Visitor settles in: the next Settling-in knock, if any.
 * Otherwise the week-one plan and the later weeks' from the app's time on, their days counted from
 * the story's start, moved out of quiet hours, at most one a day, none past 14 days from this
 * open. None when the learner said no. Planned on each open, with today as the last day opened,
 * so day 8 says "you're back" only to a learner who then stays away three days, and a learner who
 * stays away two weeks simply stops hearing from us.
 */
export const planKnockRequests = (
  inputs: KnockInputs,
  language: Language,
  clock: KnockClock,
  season: SeasonWeeks = SEASON_WEEKS,
): readonly KnockRequest[] => {
  const state = settlingStateOf(inputs);
  const quiet = inputs.quietHours === undefined ? {} : { quietHours: inputs.quietHours };
  if (isSettlingIn(state)) {
    const knock = planSettlingKnock({
      state,
      installedOn: inputs.installedOn,
      timezone: inputs.timezone,
      now: clock.now,
      notificationsAllowed: inputs.notificationsAllowed,
      ...quiet,
    });
    if (knock === null) return [];
    return [
      {
        ...settlingKnockContent(knock.chapter, knock.day, language, inputs.roommateName),
        identifier: settlingKnockId(knock.chapter),
        day: knock.day,
        date: knock.date,
        time: knock.time,
        fireAt: knock.at - clock.offsetMs,
      },
    ];
  }
  const context = {
    installedOn: inputs.installedOn,
    storyStartedOn: storyDayOneOf(state, inputs.installedOn),
    timezone: inputs.timezone,
    now: clock.now,
    notificationsAllowed: inputs.notificationsAllowed,
    ...quiet,
    lastOpenedOn: lastOpenedOn(clock, inputs.timezone),
  };
  const knocks = oneKnockPerDay<ScheduledKnock | WeekKnock>([
    ...planWeekOneKnocks(context),
    ...planWeekKnocks({ ...context, season, weeks: inputs.weeks ?? [] }),
  ]);
  return knocks.map((knock) => ({
    ...(isWeekKnock(knock)
      ? weekKnockContent(knock, language, inputs.roommateName, inputs.atVisitor === true, season)
      : knockContent(knock.day, knock, language, inputs.roommateName)),
    identifier: isWeekKnock(knock)
      ? weekKnockId(knock.week, knock.kind)
      : `${KNOCK_ID_PREFIX}day-${knock.day}`,
    day: knock.day,
    date: knock.date,
    time: knock.time,
    fireAt: knock.at - clock.offsetMs,
  }));
};

/** The knock a day of the first week rings with (day 8's "you're back" after days away). */
export const knockPlanOfDay = (day: number, cameBackAfterAway: boolean): KnockPlan | null => {
  const entry = WEEK_ONE_PLAN.find((d) => d.day === day);
  if (entry === undefined) return null;
  return cameBackAfterAway && entry.knockAfterAway !== undefined
    ? entry.knockAfterAway
    : entry.knock;
};

/**
 * A day's knock where it lands in the learner's day, for previews: null on day 1. `storyDayOne`
 * is the day week 1's days count from (the install day when left out).
 */
export const knockOfDay = (
  day: number,
  inputs: Pick<KnockInputs, 'installedOn' | 'timezone' | 'quietHours' | 'roommateName'> & {
    readonly storyDayOne?: LocalDate;
  },
  language: Language,
  cameBackAfterAway: boolean,
): (KnockContent & { readonly date: LocalDate; readonly time: string }) | null => {
  const plan = knockPlanOfDay(day, cameBackAfterAway);
  if (plan === null) return null;
  const slot = placeKnock(
    dateOfDay(inputs.storyDayOne ?? inputs.installedOn, day),
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

/** A later week's knock as previewed: where it lands, and its day within the week. */
export type WeekKnockPreview = KnockContent & {
  readonly date: LocalDate;
  readonly time: string;
  readonly dayOfWeek: number;
};

/**
 * A later week's knock where it lands in the learner's day, for previews: null when that week has
 * nothing of that kind to announce. Days count from `storyDayOne`.
 */
export const weekKnockOf = (
  week: number,
  kind: LaterWeekKnockKind,
  inputs: Pick<KnockInputs, 'timezone' | 'quietHours' | 'roommateName'> & {
    readonly storyDayOne: LocalDate;
    readonly atVisitor?: boolean;
  },
  language: Language,
  season: SeasonWeeks = SEASON_WEEKS,
): WeekKnockPreview | null => {
  const found = weekKnockDays(season, week).find((d) => d.kind === kind);
  if (found === undefined) return null;
  const day = firstDayOfWeek(week) - 1 + found.dayOfWeek;
  const slot = placeKnock(
    dateOfDay(inputs.storyDayOne, day),
    LATER_WEEK_KNOCK_TIMES[kind],
    inputs.timezone,
    inputs.quietHours === undefined ? DEFAULT_QUIET_HOURS : inputs.quietHours,
  );
  const knock = { week, kind, day, dayOfWeek: found.dayOfWeek, scene: found.scene };
  return {
    ...weekKnockContent(knock, language, inputs.roommateName, inputs.atVisitor === true, season),
    date: slot.date,
    time: slot.time,
    dayOfWeek: found.dayOfWeek,
  };
};

/**
 * A Settling-in knock where it lands when its chapter is next on settling day N (as the test
 * menu's chapter jump leaves it: chapter N on day N), for previews.
 */
export const settlingKnockOf = (
  chapter: KnockedChapter,
  inputs: Pick<KnockInputs, 'installedOn' | 'timezone' | 'quietHours' | 'roommateName'>,
  language: Language,
): KnockContent & { readonly date: LocalDate; readonly time: string } => {
  const slot = placeKnock(
    dateOfDay(inputs.installedOn, chapter),
    SETTLING_KNOCKS[chapter].time,
    inputs.timezone,
    inputs.quietHours === undefined ? DEFAULT_QUIET_HOURS : inputs.quietHours,
  );
  return {
    ...settlingKnockContent(chapter, chapter, language, inputs.roommateName),
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
  /** How many days away the test menu's return stands for; left out for three. */
  readonly awayDays?: number;
}): ReturnState => {
  const away = input.now - awayDaysOf(input) * DAY_MS;
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
