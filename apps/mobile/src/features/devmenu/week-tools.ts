import {
  RING_SLOT_KINDS,
  type EpochMs,
  type Id,
  type Keepsake,
  type LocalDate,
  type RingSlot,
  type TimeZone,
  type WeekRing,
} from '@yapling/contracts';
import {
  DAYS_PER_WEEK,
  dateOfDay,
  firstDayOfWeek,
  instantOf,
  isRingFull,
  localDateOf,
  seasonRingWeeks,
  seasonSlotOpensOn,
  weekKeepsakeId,
  weekKeepsakeToWire,
  type SeasonWeeks,
} from '@yapling/domain';

import { SEASON_WEEKS } from '../../data/season';

/*
 * The test menu's week tools: jump to any day of weeks 2 on, and fill a week's ring. A jump leaves
 * the learner as one who played every week before it in full (each call on the day it opened,
 * every story, postcard and voicemail heard, each ring's keepsake on the wall) and nothing of the
 * week itself yet: its ring as the calendar opens it on that day. So the burrow, the week view,
 * the season map and the knocks all see what a learner who kept up would. Weeks after it are
 * cleared, so a jump back is exact. The plans are pure; the effects write the learner's real
 * progress (the dev Worker in the test builds) and move the debug clock.
 */

/** The weeks the jumps reach: the season's weeks after the first. */
export const JUMP_WEEKS: readonly number[] = Array.from(
  { length: Math.max(0, SEASON_WEEKS.length - 1) },
  (_, i) => i + 2,
);

/** Days of a week, 1–7. */
export const JUMP_DAYS: readonly number[] = Array.from({ length: DAYS_PER_WEEK }, (_, i) => i + 1);

/** The story day of week `week`'s day `day`: week 3, day 2 is story day 16. */
export const storyDayOf = (week: number, day: number): number => firstDayOfWeek(week) - 1 + day;

/** A call the test menu marked done carries this id: there is no call record behind it. */
export const filledCallId = (week: number, kind: RingSlot['kind']): string =>
  `devmenu-fill-w${week}-${kind}`;

/** Whether a keepsake is a week's ring keepsake for week `from` or later. */
const ringKeepsakeFrom = (keepsake: Keepsake, from: number): boolean => {
  if (keepsake.kind !== 'week') return false;
  const week = Number(keepsake.id.replace(/^week-/, ''));
  return Number.isInteger(week) && week >= from;
};

/** Week `week`'s three calls done (those not done already), and its keepsake if it is new. */
const fillWeek = (
  weeks: readonly WeekRing[],
  keepsakes: readonly Keepsake[],
  week: number,
  doneAt: (slot: RingSlot) => EpochMs,
  timezone: TimeZone,
): { readonly weeks: WeekRing[]; readonly keepsakes: Keepsake[] } => {
  let earned: EpochMs = 0;
  const filled = weeks.map((ring): WeekRing => {
    if (ring.week !== week) return ring;
    return {
      week: ring.week,
      slots: ring.slots.map((slot): RingSlot => {
        if (slot.status === 'done') return slot;
        const at = doneAt(slot);
        earned = Math.max(earned, at);
        return { ...slot, status: 'done', callRecordId: filledCallId(week, slot.kind), doneAt: at };
      }),
    };
  });
  const ring = filled[week - 1];
  const id = weekKeepsakeId(week);
  const keep =
    ring !== undefined && isRingFull(ring) && earned > 0 && !keepsakes.some((k) => k.id === id)
      ? [...keepsakes, weekKeepsakeToWire({ id, week, earnedOn: localDateOf(earned, timezone) })]
      : [...keepsakes];
  return { weeks: filled, keepsakes: keep };
};

export interface WeekJumpInput {
  readonly week: number;
  /** 1–7 within the week. */
  readonly day: number;
  /** The rings and keepsakes as progress has them. */
  readonly weeks: readonly WeekRing[];
  readonly keepsakes: readonly Keepsake[];
  /** The story's first day (week 1's day 1). */
  readonly startedOn: LocalDate;
  readonly timezone: TimeZone;
  readonly season?: SeasonWeeks;
}

export interface WeekJump {
  /** The story day the clock goes to. */
  readonly storyDay: number;
  readonly weeks: WeekRing[];
  readonly keepsakes: Keepsake[];
}

/**
 * Week `week`, day `day`: every week before it full (calls done at noon on the day each opened,
 * real calls kept), its own ring opened to that day with nothing done, nothing after it.
 */
export const weekJumpPlan = (input: WeekJumpInput): WeekJump => {
  const season = input.season ?? SEASON_WEEKS;
  const week = Math.max(1, Math.round(input.week));
  const day = Math.min(DAYS_PER_WEEK, Math.max(1, Math.round(input.day)));
  const storyDay = storyDayOf(week, day);
  const opensOn = seasonSlotOpensOn(season);
  const noonOf = (w: number) => (slot: RingSlot) =>
    instantOf(dateOfDay(input.startedOn, opensOn(w, slot.kind)), '12:00', input.timezone);

  // The weeks before, every slot open (their days have all come), then each filled.
  let weeks: WeekRing[] = [
    ...seasonRingWeeks(input.weeks.slice(0, week - 1), firstDayOfWeek(week) - 1, season),
  ];
  let keepsakes = input.keepsakes.filter((k) => !ringKeepsakeFrom(k, week));
  for (let w = 1; w < week; w++) {
    ({ weeks, keepsakes } = fillWeek(weeks, keepsakes, w, noonOf(w), input.timezone));
  }
  // The week itself, fresh, as the calendar opens it on that day.
  return { storyDay, weeks: [...seasonRingWeeks(weeks, storyDay, season)], keepsakes };
};

export interface FillRingInput {
  readonly week: number;
  readonly weeks: readonly WeekRing[];
  readonly keepsakes: readonly Keepsake[];
  /** The app's time: when the calls count as done. */
  readonly now: EpochMs;
  readonly timezone: TimeZone;
  readonly season?: SeasonWeeks;
}

/**
 * Week `week`'s ring full: its calls not done yet marked done now (even those whose day hasn't
 * come), and its keepsake. The rings up to it are added first if progress doesn't have them yet.
 */
export const fillRingPlan = (
  input: FillRingInput,
): { readonly weeks: WeekRing[]; readonly keepsakes: Keepsake[] } => {
  const season = input.season ?? SEASON_WEEKS;
  const rings =
    input.weeks.length >= input.week
      ? input.weeks
      : seasonRingWeeks(input.weeks, firstDayOfWeek(input.week), season);
  return fillWeek(rings, input.keepsakes, input.week, () => input.now, input.timezone);
};

/** The between-call scenes (stories, postcards, voicemails) of the weeks before `week`. */
export const listeningScenesBefore = (
  week: number,
  season: SeasonWeeks = SEASON_WEEKS,
): readonly Id[] =>
  season.slice(0, Math.max(0, week - 1)).flatMap((shape) => {
    const scenes = new Map(shape.scenes.map((s) => [s.id, s]));
    return shape.week.flatMap((slot) => {
      const kind = scenes.get(slot.scene)?.kind;
      return kind === undefined || (RING_SLOT_KINDS as readonly string[]).includes(kind)
        ? []
        : [slot.scene];
    });
  });
