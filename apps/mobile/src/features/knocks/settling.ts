import {
  SETTLING_CHAPTER_COUNT,
  type EpochMs,
  type LocalDate,
  type LocalTime,
  type Profile,
  type QuietHours,
  type SettlingChapterDone,
  type TimeZone,
} from '@yapling/contracts';
import {
  DEFAULT_QUIET_HOURS,
  addDays,
  daysBetween,
  localDateOf,
  placeKnock,
  settlingSceneId,
  type KnockSlot,
  type SettlingChapter,
} from '@yapling/domain';

import { letterDayOf as burrowLetterDayOf, nextChapter } from '../burrow/settling';

/*
 * Settling in's knocks: a Visitor's mornings before the story starts. Each one is from Yapling, in
 * the learner's language, and announces the chapter that waits; tapping it opens that chapter's
 * call. Chapter 1 has none (Linh knocks in the app on day 1), and none come once the letter has.
 *
 * One knock at a time: the next settling morning (tomorrow when a chapter was finished today),
 * planned again on every open. A learner who stays away hears one knock, not one every day; the
 * chapter simply waits. Pure, so the schedule is tested without a phone.
 */

/** The chapters a knock announces: 2 to 6. */
export type KnockedChapter = Exclude<SettlingChapter, 1>;

export interface SettlingKnockPlan {
  /** The i18n key of the knock's body (the knocks catalogue). */
  readonly key: `knocks.settling.${KnockedChapter}`;
  /** The wanted local time, before quiet hours move it. */
  readonly time: LocalTime;
}

/** The five knocks, by the chapter each announces. Morning times, a little apart. */
export const SETTLING_KNOCKS: Readonly<Record<KnockedChapter, SettlingKnockPlan>> = {
  2: { key: 'knocks.settling.2', time: '08:20' },
  3: { key: 'knocks.settling.3', time: '08:10' },
  4: { key: 'knocks.settling.4', time: '08:40' },
  5: { key: 'knocks.settling.5', time: '08:30' },
  6: { key: 'knocks.settling.6', time: '08:15' },
};

export const isKnockedChapter = (chapter: number): chapter is KnockedChapter =>
  Number.isInteger(chapter) && chapter >= 2 && chapter <= SETTLING_CHAPTER_COUNT;

/** Where the learner is with Settling in, from the profile and progress. */
export interface SettlingState {
  /** Started with Linh: onboarding's "just starting", placement's Visitor, or "too hard". */
  readonly visitorPath: boolean;
  /** The chapters done, in the order they were finished. */
  readonly chapters: readonly SettlingChapterDone[];
  /** The story's start (the letter's day), or null when it isn't recorded. */
  readonly storyStartedOn: LocalDate | null;
}

/** Started with Linh: onboarding's "just starting", or a Visitor by placement or "too hard". */
export const isVisitorPath = (profile: Pick<Profile, 'startPath' | 'stage'>): boolean =>
  profile.startPath === 'visitor' || profile.stage === 'visitor';

/** The lowest chapter not done yet, or null when all six are (the burrow's rule). */
export const nextSettlingChapter = (
  chapters: readonly SettlingChapterDone[],
): SettlingChapter | null => nextChapter(chapters);

/**
 * The letter's day, which is week 1's day 1: the story's start when it is recorded, otherwise the
 * day Chapter 6 was finished, otherwise none yet (the burrow's rule).
 */
export const letterDayOf = (
  state: Pick<SettlingState, 'chapters' | 'storyStartedOn'>,
): LocalDate | null => burrowLetterDayOf(state.chapters, state.storyStartedOn);

/** Still settling in: a Visitor whose letter hasn't come. */
export const isSettlingIn = (state: SettlingState): boolean =>
  state.visitorPath && letterDayOf(state) === null;

/**
 * The day week 1's days count from: the letter's day for a Visitor, the install day for everyone
 * else (and for a profile from before the story's start was kept). Null while settling in.
 */
export const storyDayOneOf = (state: SettlingState, installedOn: LocalDate): LocalDate | null => {
  if (!state.visitorPath) return state.storyStartedOn ?? installedOn;
  return letterDayOf(state);
};

/** The scene a chapter's knock opens. */
export const settlingCallPath = (chapter: SettlingChapter): string =>
  `/(call)/${settlingSceneId(chapter)}`;

export interface SettlingKnock extends KnockSlot {
  readonly chapter: KnockedChapter;
  readonly key: SettlingKnockPlan['key'];
  /** The settling day it rings on, counted from the install day (day 1). */
  readonly day: number;
}

export interface SettlingKnockContext {
  readonly state: SettlingState;
  readonly installedOn: LocalDate;
  readonly timezone: TimeZone;
  readonly now: EpochMs;
  readonly notificationsAllowed: boolean;
  /** The learner's quiet hours; null for none; left out for the default (22:00–08:00). */
  readonly quietHours?: QuietHours | null;
}

/**
 * The next Settling-in knock, or null: none without permission, outside Settling in, for Chapter 1
 * or after the letter. It rings this morning when no chapter was finished today and its time (out
 * of quiet hours) is still ahead, otherwise the next morning. Never on the install day.
 */
export const planSettlingKnock = (ctx: SettlingKnockContext): SettlingKnock | null => {
  if (!ctx.notificationsAllowed || !isSettlingIn(ctx.state)) return null;
  const chapter = nextSettlingChapter(ctx.state.chapters);
  if (chapter === null || !isKnockedChapter(chapter)) return null;
  const plan = SETTLING_KNOCKS[chapter];
  const quiet = ctx.quietHours === undefined ? DEFAULT_QUIET_HOURS : ctx.quietHours;
  const today = localDateOf(ctx.now, ctx.timezone);
  const doneToday = ctx.state.chapters.some((c) => c.doneOn === today);
  const first = doneToday || today <= ctx.installedOn ? addDays(today, 1) : today;
  let slot = placeKnock(first, plan.time, ctx.timezone, quiet);
  if (slot.at <= ctx.now) slot = placeKnock(addDays(first, 1), plan.time, ctx.timezone, quiet);
  return {
    ...slot,
    chapter,
    key: plan.key,
    day: daysBetween(ctx.installedOn, slot.date) + 1,
  };
};
