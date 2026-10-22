import type { CharacterId, Id, LocalDate, WeekRing } from '@yapling/contracts';
import {
  DEFAULT_QUIET_HOURS,
  KNOCK_HORIZON_DAYS,
  LATER_WEEK_KNOCK_KINDS,
  LATER_WEEK_KNOCK_TIMES,
  WEEK_ONE_PLAN,
  addDays,
  dateOfDay,
  daysBetween,
  firstDayOfWeek,
  isEpisodeWeek,
  laterWeekKnockKey,
  localDateOf,
  nextEpisodeWeek,
  oneKnockPerDay,
  placeKnock,
  planLaterWeekKnocks,
  seasonRingWeeks,
  storyStartOn,
  storyWeekPlan,
  weekOfDay,
  type KnockSender,
  type LaterWeekKnockContext,
  type LaterWeekKnockKind,
  type ScheduledKnock,
  type SeasonWeeks,
} from '@yapling/domain';

/*
 * The knocks of the weeks after the first: the learning model's plan (each week's new episode,
 * Pip's story and the voicemail, new things only, at most one a day, out of quiet hours, no further
 * than 14 days past the last open), with who each is from, its copy and where tapping it goes. A
 * week without an episode of its own (the festival) knocks once on its first day instead, from
 * Yapling, once the season's episodes are all played. Pure, so the schedule is tested without a
 * phone.
 */

/** Who each week's episode knock is from, as the script writes them; the rest are from Yapling. */
export const EPISODE_KNOCK_FROM: Readonly<Record<number, CharacterId>> = {
  2: 'pip',
  3: 'mei',
  4: 'nell',
  5: 'bea',
  6: 'mei',
};

/**
 * A knock whose copy announces something else that opens the same day, by week: week 6's day 2
 * is the stack of six postcards, the bigger event that day, so its knock opens them.
 */
export const KNOCK_OPENS_INSTEAD: Readonly<
  Record<number, Partial<Record<LaterWeekKnockKind, string>>>
> = {
  6: { story: 'postcard' },
};

/** A later week's knock, planned. `scene` is null for a festival week's first day (the burrow). */
export interface WeekKnock extends ScheduledKnock {
  readonly week: number;
  /** 1–7 within the week. */
  readonly dayOfWeek: number;
  readonly kind: LaterWeekKnockKind;
  readonly scene: Id | null;
}

/** Who a later week's knock is from: at Visitor always Yapling, in the learner's language. */
export const weekKnockSender = (
  week: number,
  kind: LaterWeekKnockKind,
  atVisitor: boolean,
): KnockSender => {
  if (atVisitor || kind !== 'episode') return 'yapling';
  return EPISODE_KNOCK_FROM[week] ?? 'yapling';
};

/**
 * The catalogue key of a later week's knock. A character's line has a Visitor version from
 * Yapling (`knocks.week3_episode_visitor`), since a Visitor can't yet read the character's English
 * on the lock screen.
 */
export const weekKnockKey = (
  week: number,
  kind: LaterWeekKnockKind,
  atVisitor: boolean,
): string => {
  const key = laterWeekKnockKey(week, kind);
  return atVisitor && weekKnockSender(week, kind, false) !== 'yapling' ? `${key}_visitor` : key;
};

/** The scene a knock opens: its own, or what its copy announces that day instead. */
export const weekKnockScene = (
  season: SeasonWeeks,
  knock: Pick<WeekKnock, 'week' | 'dayOfWeek' | 'kind' | 'scene'>,
): Id | null => {
  const instead = KNOCK_OPENS_INSTEAD[knock.week]?.[knock.kind];
  if (instead === undefined) return knock.scene;
  const day = storyWeekPlan(season[knock.week - 1], knock.week).find(
    (d) => d.day === knock.dayOfWeek,
  );
  return day?.opens.find((o) => o.kind === instead && o.scene !== null)?.scene ?? knock.scene;
};

/**
 * Where a later week's knock opens the app: the episode's call, the story or voicemail to listen
 * to, or the burrow for a week without a scene to open.
 */
export const weekKnockPath = (
  season: SeasonWeeks,
  knock: Pick<WeekKnock, 'week' | 'dayOfWeek' | 'kind' | 'scene'>,
): string => {
  const scene = weekKnockScene(season, knock);
  if (scene === null) return '/';
  return knock.kind === 'episode' ? `/(call)/${scene}` : `/listen/${scene}`;
};

/** The last story day week one's own plan knocks for; later weeks' knocks start after it. */
const WEEK_ONE_LAST_DAY = Math.max(...WEEK_ONE_PLAN.map((d) => d.day));

/**
 * The things of a week that knock, by day, before the calendar and the rules place them (week 2's
 * first day is week one's day 8, which keeps its own knock).
 */
export const weekKnockDays = (
  season: SeasonWeeks,
  week: number,
): readonly {
  readonly dayOfWeek: number;
  readonly kind: LaterWeekKnockKind;
  readonly scene: Id | null;
  readonly face: CharacterId;
}[] => {
  const shape = season[week - 1];
  if (week < 2 || shape === undefined) return [];
  const days = storyWeekPlan(shape, week).flatMap(({ day, opens }) => {
    for (const kind of LATER_WEEK_KNOCK_KINDS) {
      const opening = opens.find((o) => o.kind === kind && o.scene !== null);
      if (opening !== undefined) {
        return [{ dayOfWeek: day, kind, scene: opening.scene, face: opening.cast[0] ?? 'pip' }];
      }
    }
    return [];
  });
  const all =
    isEpisodeWeek(shape) || days.some((d) => d.dayOfWeek === 1)
      ? days
      : [{ dayOfWeek: 1, kind: 'episode' as const, scene: null, face: 'pip' as const }, ...days];
  return all.filter((d) => firstDayOfWeek(week) - 1 + d.dayOfWeek > WEEK_ONE_LAST_DAY);
};

/**
 * The first-day knocks of weeks without an episode (the festival): only once every episode is
 * played, under the same rules as the rest (the 14-day horizon, quiet hours, nothing past).
 */
const festivalOpenings = (ctx: LaterWeekKnockContext): readonly WeekKnock[] => {
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
  const rings = seasonRingWeeks(ctx.weeks, todayIndex, ctx.season);
  if (nextEpisodeWeek(ctx.season, rings) !== null) return [];
  const lastWeek = Math.min(weekOfDay(daysBetween(dayOne, horizon) + 1), ctx.season.length);
  const knocks: WeekKnock[] = [];
  for (let week = 2; week <= lastWeek; week++) {
    if (isEpisodeWeek(ctx.season[week - 1])) continue;
    const storyDay = firstDayOfWeek(week);
    const date = dateOfDay(dayOne, storyDay);
    if (storyDay <= WEEK_ONE_LAST_DAY || date > horizon) continue;
    const slot = placeKnock(date, LATER_WEEK_KNOCK_TIMES.episode, ctx.timezone, quiet);
    knocks.push({
      ...slot,
      day: storyDay,
      week,
      dayOfWeek: 1,
      kind: 'episode',
      scene: null,
      key: laterWeekKnockKey(week, 'episode'),
      from: 'yapling',
      face: 'pip',
    });
  }
  return knocks.filter((k) => k.at > ctx.now);
};

/**
 * The later weeks' knocks still to come: the learning model's plan and the festival's first day,
 * at most one a day.
 */
export const planWeekKnocks = (ctx: LaterWeekKnockContext): readonly WeekKnock[] =>
  oneKnockPerDay<WeekKnock>([...planLaterWeekKnocks(ctx), ...festivalOpenings(ctx)]);

/** Whether week `week`'s episode has been played (its ring's episode slot is done). */
export const weekEpisodeDone = (weeks: readonly WeekRing[], week: number): boolean =>
  weeks[week - 1]?.slots.find((s) => s.kind === 'episode')?.status === 'done';
