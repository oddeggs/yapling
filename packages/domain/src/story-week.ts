import {
  RING_SLOT_KINDS,
  type CharacterId,
  type Id,
  type LocalDate,
  type RingSlot,
  type RingSlotKind,
  type WeekRing,
} from '@yapling/contracts';

import { dateOfDay } from './day-clock';
import {
  DAYS_PER_WEEK,
  LATER_WEEK_SLOT_OPENS,
  WEEK_ONE_SLOT_OPENS,
  firstDayOfWeek,
  isRingFull,
  ringWeeks,
  weekOfDay,
  type SceneFor,
  type SlotOpensOn,
} from './ring';

/*
 * The story week: what each week of the season opens, day by day, and which week the learner is
 * on. A week is read from its `week` slots (the day each scene arrives) the same way for every
 * week, so a hand-written episode and a later week pack fill it alike. Days count from the story's
 * start: week 2 is story days 8–14.
 *
 * The learner's week follows the story, not only the calendar: it is the week of the next episode
 * they haven't played, and never ahead of the calendar. A learner who misses week 3 comes back in
 * week 4 to Episode 3, which fills ring 3; ring 4 waits its turn. Open calls from earlier weeks are
 * listed as waiting. Nothing here expires and nothing reads the clock.
 */

/** A scene as a week names it. `@yapling/story`'s `Scene` fits this shape. */
export interface WeekSceneShape {
  readonly id: Id;
  /** Its kind: `episode`, `real_week` and `practice` are ring calls; the rest play on the phone. */
  readonly kind: string;
  /** Who is in it, the first being who it's from (a knock's sender). */
  readonly cast?: readonly CharacterId[];
}

/** Which day of the week (1–7) a scene arrives. `@yapling/story`'s `WeekSlot` fits this shape. */
export interface WeekSlotShape {
  readonly day: number;
  readonly scene: Id;
}

/**
 * One week of the season: an episode's week, or a week without an episode (the festival). Its
 * `week` slots name scenes in `scenes`. `@yapling/story`'s `Episode` fits this shape, so a season's
 * `episodes` (with any closing week after them) is a list of weeks, week 1 first.
 */
export interface StoryWeekShape {
  readonly id: Id;
  readonly week: readonly WeekSlotShape[];
  readonly scenes: readonly WeekSceneShape[];
}

/** The season's weeks, week 1 first. Weeks past the end have nothing of their own. */
export type SeasonWeeks = readonly StoryWeekShape[];

/** One thing a week opens on one of its days. */
export interface WeekOpening {
  /** 1–7 within the week. */
  readonly day: number;
  /** The scene; null for a ring call the story hasn't named (it takes any call of its kind). */
  readonly scene: Id | null;
  readonly kind: string;
  /** The ring slot it fills, for the three ring calls. */
  readonly ring: RingSlotKind | null;
  readonly cast: readonly CharacterId[];
}

export interface StoryWeekDay {
  readonly day: number;
  readonly opens: readonly WeekOpening[];
}

const isRingKind = (kind: string): kind is RingSlotKind =>
  (RING_SLOT_KINDS as readonly string[]).includes(kind);

const clampDay = (day: number): number =>
  Math.min(DAYS_PER_WEEK, Math.max(1, Math.round(Number.isFinite(day) ? day : 1)));

/** The week's slots as openings, in day order (a slot naming no known scene is left out). */
const slotOpenings = (shape: StoryWeekShape | undefined): readonly WeekOpening[] => {
  if (shape === undefined) return [];
  const scenes = new Map(shape.scenes.map((s) => [s.id, s]));
  return shape.week
    .flatMap((slot): WeekOpening[] => {
      const scene = scenes.get(slot.scene);
      if (scene === undefined) return [];
      const ring = isRingKind(scene.kind) ? scene.kind : null;
      return [
        {
          day: clampDay(slot.day),
          scene: scene.id,
          kind: scene.kind,
          ring,
          cast: scene.cast ?? [],
        },
      ];
    })
    .sort((a, b) => a.day - b.day);
};

/** The week's scene for a ring slot: the first slot of that kind; null when the week has none. */
export const ringSceneOf = (shape: StoryWeekShape | undefined, kind: RingSlotKind): Id | null =>
  slotOpenings(shape).find((o) => o.ring === kind)?.scene ?? null;

/**
 * The day of the week (1–7) a ring slot opens. Week 1 keeps the first week's plan. From week 2 a
 * slot opens on the day of its scene, or on `LATER_WEEK_SLOT_OPENS`'s day when the week names none.
 */
export const ringOpensOnDayOfWeek = (
  shape: StoryWeekShape | undefined,
  week: number,
  kind: RingSlotKind,
): number => {
  if (week === 1) return WEEK_ONE_SLOT_OPENS[kind];
  return slotOpenings(shape).find((o) => o.ring === kind)?.day ?? LATER_WEEK_SLOT_OPENS[kind];
};

/**
 * What a week opens on each of its days 1–7: its slots on their days, and each ring call on the
 * day it opens (a ring call the week names no scene for, on its fallback day, with no scene).
 */
export const storyWeekPlan = (
  shape: StoryWeekShape | undefined,
  week: number,
): readonly StoryWeekDay[] => {
  const openings = slotOpenings(shape);
  const rings = RING_SLOT_KINDS.map((kind): WeekOpening => {
    const own = openings.find((o) => o.ring === kind);
    const day = ringOpensOnDayOfWeek(shape, week, kind);
    return own === undefined ? { day, scene: null, kind, ring: kind, cast: [] } : { ...own, day };
  });
  // Within a day the ring call comes first, then the rest as the week lists them.
  const all = [...rings, ...openings.filter((o) => o.ring === null)];
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) => ({
    day: i + 1,
    opens: all.filter((o) => o.day === i + 1),
  }));
};

/** The story day a season week's ring slot opens on. */
export const seasonSlotOpensOn =
  (season: SeasonWeeks): SlotOpensOn =>
  (week, kind) =>
    firstDayOfWeek(week) - 1 + ringOpensOnDayOfWeek(season[week - 1], week, kind);

/** The scene a season week's ring slot plays; null for a week or slot the story doesn't name. */
export const seasonSceneFor =
  (season: SeasonWeeks): SceneFor =>
  (week, kind) =>
    ringSceneOf(season[week - 1], kind);

/** The rings up to `dayIndex`, opened on the season's days and tied to the season's scenes. */
export const seasonRingWeeks = (
  weeks: readonly WeekRing[],
  dayIndex: number,
  season: SeasonWeeks,
): readonly WeekRing[] =>
  ringWeeks(weeks, dayIndex, seasonSceneFor(season), seasonSlotOpensOn(season));

/** Whether a week of the season is an episode's week (it has an episode call). */
export const isEpisodeWeek = (shape: StoryWeekShape | undefined): boolean =>
  ringSceneOf(shape, 'episode') !== null;

/** Whether week `week`'s episode has been played: its ring's episode slot is done. */
export const episodeDoneInWeek = (weeks: readonly WeekRing[], week: number): boolean =>
  weeks[week - 1]?.slots.find((s) => s.kind === 'episode')?.status === 'done';

/** The week of the first episode not yet played; null once every episode is. */
export const nextEpisodeWeek = (season: SeasonWeeks, weeks: readonly WeekRing[]): number | null => {
  const index = season.findIndex(
    (shape, i) => isEpisodeWeek(shape) && !episodeDoneInWeek(weeks, i + 1),
  );
  return index === -1 ? null : index + 1;
};

/**
 * The week the learner is on: the week of the next episode they haven't played, never ahead of
 * the calendar; the calendar's week once the season's episodes are all played.
 */
export const storyWeekOf = (
  season: SeasonWeeks,
  weeks: readonly WeekRing[],
  dayIndex: number,
): number => {
  const calendar = weekOfDay(dayIndex);
  const next = nextEpisodeWeek(season, weeks);
  return next === null ? calendar : Math.min(next, calendar);
};

/** A ring slot of the story week, with the day it opens. */
export interface StoryWeekSlot extends RingSlot {
  readonly opensOnDay: number;
  readonly opensOn: LocalDate;
}

/** An open call from a week before the story week, still waiting. */
export interface WaitingSlot {
  readonly week: number;
  readonly kind: RingSlotKind;
  readonly sceneId: Id | null;
  readonly opensOn: LocalDate;
}

export interface StoryWeekInput {
  readonly season: SeasonWeeks;
  /** The rings as progress has them. */
  readonly weeks: readonly WeekRing[];
  /** Today's story day (day 1 is the story's first day). */
  readonly dayIndex: number;
  /** The story's first day (`storyStartOn`), for dates. */
  readonly startedOn: LocalDate;
}

export interface StoryWeek {
  /** The week the learner is on. */
  readonly week: number;
  /** The calendar's week (never behind the story week). */
  readonly calendarWeek: number;
  /** The story week is a week the calendar has passed: every one of its days has come. */
  readonly behind: boolean;
  /** How far into the story week the learner is, 1–7: today's day of it, or 7 when behind. */
  readonly dayOfWeek: number;
  /** The week's plan, day by day. */
  readonly days: readonly StoryWeekDay[];
  /** What the week has opened so far, in day order. */
  readonly opened: readonly WeekOpening[];
  /** What the week opens today: the new things. Empty when behind. */
  readonly today: readonly WeekOpening[];
  readonly ring: readonly StoryWeekSlot[];
  readonly full: boolean;
  /** Open calls from earlier weeks, oldest first. */
  readonly waiting: readonly WaitingSlot[];
  /** Every ring, opened to today. */
  readonly weeks: readonly WeekRing[];
}

/** The learner's week: the story week's plan and ring, with earlier open calls waiting. */
export const storyWeek = (input: StoryWeekInput): StoryWeek => {
  const { season, dayIndex, startedOn } = input;
  const opensOn = seasonSlotOpensOn(season);
  const weeks = seasonRingWeeks(input.weeks, dayIndex, season);
  const calendarWeek = weekOfDay(dayIndex);
  const week = storyWeekOf(season, weeks, dayIndex);
  const behind = week < calendarWeek;
  const dayOfWeek = behind ? DAYS_PER_WEEK : dayIndex - firstDayOfWeek(week) + 1;
  const days = storyWeekPlan(season[week - 1], week);
  const opened = days.filter((d) => d.day <= dayOfWeek).flatMap((d) => d.opens);
  const today = behind ? [] : (days[dayOfWeek - 1]?.opens ?? []);
  const ringOf = weeks[week - 1] ?? { week, slots: [] };
  const ring = ringOf.slots.map((slot): StoryWeekSlot => {
    const day = opensOn(week, slot.kind);
    return { ...slot, opensOnDay: day, opensOn: dateOfDay(startedOn, day) };
  });
  const waiting = weeks
    .filter((w) => w.week < week)
    .flatMap((w) =>
      w.slots
        .filter((s) => s.status === 'open')
        .map((s): WaitingSlot => ({
          week: w.week,
          kind: s.kind,
          sceneId: s.sceneId,
          opensOn: dateOfDay(startedOn, opensOn(w.week, s.kind)),
        })),
    );
  return {
    week,
    calendarWeek,
    behind,
    dayOfWeek,
    days,
    opened,
    today,
    ring,
    full: isRingFull(ringOf),
    waiting,
    weeks,
  };
};

export type SeasonEpisodeState = 'done' | 'current' | 'upcoming';

/** One episode on the season map. */
export interface SeasonEpisode {
  /** The episode's week (episode N plays in week N). */
  readonly week: number;
  /** The week's id (the episode's). */
  readonly id: Id;
  /** The episode call's scene. */
  readonly sceneId: Id;
  /** Done; the next one to play; or still ahead. */
  readonly state: SeasonEpisodeState;
  /** The story day it opens, and its date, counted from the story's start like the week. */
  readonly opensOnDay: number;
  readonly opensOn: LocalDate;
  /** Its day has come. */
  readonly open: boolean;
}

/**
 * The season's episodes for the map, dated the way the week is: from the story's start, on the
 * day each episode's ring slot opens. The current one is the next to play, the same episode the
 * story week is on once its day has come.
 */
export const seasonEpisodes = (input: StoryWeekInput): readonly SeasonEpisode[] => {
  const { season, dayIndex, startedOn } = input;
  const weeks = seasonRingWeeks(input.weeks, dayIndex, season);
  const next = nextEpisodeWeek(season, weeks);
  const opensOn = seasonSlotOpensOn(season);
  return season.flatMap((shape, i): SeasonEpisode[] => {
    const week = i + 1;
    const sceneId = ringSceneOf(shape, 'episode');
    if (sceneId === null) return [];
    const day = opensOn(week, 'episode');
    const state: SeasonEpisodeState = episodeDoneInWeek(weeks, week)
      ? 'done'
      : week === next
        ? 'current'
        : 'upcoming';
    return [
      {
        week,
        id: shape.id,
        sceneId,
        state,
        opensOnDay: day,
        opensOn: dateOfDay(startedOn, day),
        open: dayIndex >= day,
      },
    ];
  });
};
