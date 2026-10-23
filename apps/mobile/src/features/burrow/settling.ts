import {
  SETTLING_CHAPTER_COUNT,
  type CallRecord,
  type EpochMs,
  type LocalDate,
  type SettlingChapterDone,
  type TimeZone,
} from '@yapling/contracts';
import { daysBetween, localDateOf, SETTLING_SCENES, type SettlingChapter } from '@yapling/domain';

/*
 * Settling in, as rules: which chapter is next, when the burrow suggests a rest, and when the
 * letter comes. A Visitor plays six short chapters with Linh before the story; each finished
 * chapter unpacks one box. The next chapter opens as soon as one is done; after two in a day the
 * button suggests "tomorrow", with "keep going" beside it. After Chapter 6 (or "start the story"
 * on the list) the letter slides under the café door, and that day is week 1's day 1.
 *
 * Nothing here reads the clock, the network or the phone: every state can be built and tested.
 */

/** Chapters a day before the burrow suggests a rest (the learner can always keep going). */
export const CHAPTERS_BEFORE_REST = 2;

/** About how long each chapter's call takes, in minutes, chapter 1 to 6. */
export const CHAPTER_MINUTES: Readonly<Record<SettlingChapter, number>> = {
  1: 2,
  2: 2,
  3: 2,
  4: 3,
  5: 3,
  6: 3,
};

export const SETTLING_CHAPTERS: readonly SettlingChapter[] = [1, 2, 3, 4, 5, 6];

/** The chapter a scene plays, or null for a scene outside Settling in. */
export function chapterOfScene(sceneId: string): SettlingChapter | null {
  const index = (SETTLING_SCENES as readonly string[]).indexOf(sceneId);
  return index < 0 ? null : ((index + 1) as SettlingChapter);
}

const byDay = (a: SettlingChapterDone, b: SettlingChapterDone) =>
  a.doneOn < b.doneOn ? -1 : a.doneOn > b.doneOn ? 1 : a.chapter - b.chapter;

/**
 * The chapters done, from several records of them, in the order the contract keeps them (by the
 * day each was first done). A chapter's first record wins, so list the most trusted source first
 * (the server, then the phone's own copy, then what the call records show).
 */
export function mergeChapters(
  ...sources: readonly (readonly SettlingChapterDone[])[]
): SettlingChapterDone[] {
  const first = new Map<number, SettlingChapterDone>();
  for (const source of sources) {
    for (const done of source) {
      if (done.chapter < 1 || done.chapter > SETTLING_CHAPTER_COUNT) continue;
      if (!first.has(done.chapter)) first.set(done.chapter, done);
    }
  }
  return [...first.values()].sort(byDay);
}

/**
 * The chapters the learner's calls finished: a Settling-in scene that ended complete. Replays
 * don't move a chapter's day: the earliest finished call counts. `dayOf` turns a call's end into
 * the learner's local day.
 */
export function chaptersFromCalls(
  calls: readonly Pick<CallRecord, 'id' | 'sceneId' | 'endReason' | 'endedAt'>[],
  dayOf: (at: number) => LocalDate,
): SettlingChapterDone[] {
  const finished = [...calls]
    .filter((c) => c.endReason === 'scene_complete' && chapterOfScene(c.sceneId) !== null)
    .sort((a, b) => a.endedAt - b.endedAt)
    .map((c): SettlingChapterDone => ({
      chapter: chapterOfScene(c.sceneId) ?? 1,
      doneOn: dayOf(c.endedAt),
      callRecordId: c.id,
    }));
  return mergeChapters(finished);
}

/**
 * A call's day on the app's clock, which the test menu may have moved: the instant it ended, moved
 * by the clock's offset read now (`appNow` and `realNow` taken together), in the learner's
 * timezone. Two chapters played on a moved day count as the same day, however long ago the clock
 * was moved.
 */
export const callDayOnAppClock =
  (appNow: EpochMs, realNow: EpochMs, timezone: TimeZone) =>
  (at: EpochMs): LocalDate =>
    localDateOf(at + (appNow - realNow), timezone);

/** Whether a chapter is done. */
export const isChapterDone = (
  chapters: readonly SettlingChapterDone[],
  chapter: SettlingChapter,
): boolean => chapters.some((c) => c.chapter === chapter);

/** The lowest chapter not done yet, or null when all six are. */
export function nextChapter(chapters: readonly SettlingChapterDone[]): SettlingChapter | null {
  return SETTLING_CHAPTERS.find((c) => !isChapterDone(chapters, c)) ?? null;
}

/** Chapters first finished on a day. */
export const chaptersDoneOn = (chapters: readonly SettlingChapterDone[], day: LocalDate): number =>
  chapters.filter((c) => c.doneOn === day).length;

/**
 * The letter's day, which is week 1's day 1: the story's start when it is recorded (or the learner
 * skipped ahead), otherwise the day Chapter 6 was finished, otherwise none yet.
 */
export function letterDayOf(
  chapters: readonly SettlingChapterDone[],
  storyStartedOn: LocalDate | null,
): LocalDate | null {
  if (storyStartedOn !== null) return storyStartedOn;
  if (nextChapter(chapters) !== null) return null;
  return chapters.find((c) => c.chapter === SETTLING_CHAPTER_COUNT)?.doneOn ?? null;
}

/**
 * Where a learner is: still settling in, on the letter's day (the burrow at dusk, week 1's day 1),
 * or in the story. A learner who didn't start with Linh is always in the story.
 */
export type SettlingPhase = 'settling' | 'letter' | 'story';

export function settlingPhase(input: {
  readonly visitorPath: boolean;
  readonly letterOn: LocalDate | null;
  readonly today: LocalDate;
}): SettlingPhase {
  if (!input.visitorPath) return 'story';
  if (input.letterOn === null || input.letterOn > input.today) return 'settling';
  return input.letterOn === input.today ? 'letter' : 'story';
}

/** The learner's days: since install (settling in counts these) and of the story (week 1's). */
export interface StoryClock {
  readonly today: LocalDate;
  /** Days since install, the install day being day 1. */
  readonly installDay: number;
  /** Week 1's day 1: the story's start (the letter's day), or the install day when not recorded. */
  readonly startedOn: LocalDate;
  /** The story's day, week 1's day 1 being 1; 1 while still settling in (nothing of week 1 opens). */
  readonly storyDay: number;
  readonly phase: SettlingPhase;
}

export function storyClockOf(input: {
  readonly installedOn: LocalDate;
  readonly today: LocalDate;
  readonly letterOn: LocalDate | null;
  readonly visitorPath: boolean;
}): StoryClock {
  const phase = settlingPhase(input);
  const startedOn = phase === 'settling' ? input.today : (input.letterOn ?? input.installedOn);
  return {
    today: input.today,
    installDay: Math.max(1, daysBetween(input.installedOn, input.today) + 1),
    startedOn,
    storyDay: Math.max(1, daysBetween(startedOn, input.today) + 1),
    phase,
  };
}

/** What the phone keeps of a learner's Settling-in day (rests and goodnights are this phone's). */
export interface SettlingDay {
  readonly chapters: readonly SettlingChapterDone[];
  readonly today: LocalDate;
  readonly letterOn: LocalDate | null;
  /** The day the learner chose "tomorrow" after two chapters. */
  readonly restedOn: LocalDate | null;
  /** The day the learner said good night to the letter. */
  readonly goodnightOn: LocalDate | null;
}

/** The burrow's Settling-in card for the day. */
export type SettlingPlan =
  /** The next chapter, ready now. */
  | { readonly kind: 'chapter'; readonly chapter: SettlingChapter; readonly done: number }
  /**
   * Two chapters done today: "tomorrow" first, "keep going" beside it. `rested`: the learner chose
   * tomorrow; the chapter still waits behind "keep going".
   */
  | {
      readonly kind: 'rest';
      readonly chapter: SettlingChapter;
      readonly done: number;
      readonly rested: boolean;
    }
  /** The letter under the café door. `goodnight`: the learner has said good night to it. */
  | { readonly kind: 'letter'; readonly done: number; readonly goodnight: boolean };

/** The day's plan while settling in, and on the letter's day. */
export function settlingPlan(day: SettlingDay): SettlingPlan {
  const done = day.chapters.length;
  const next = nextChapter(day.chapters);
  // A letter dated ahead of today (the test menu's clock went back, or the skip was made on a
  // moved day) waits for its day: the chapters carry on until the app's clock reaches it.
  const letterCame = day.letterOn !== null && day.letterOn <= day.today;
  if (letterCame || next === null) {
    return { kind: 'letter', done, goodnight: day.goodnightOn === day.today };
  }
  if (chaptersDoneOn(day.chapters, day.today) >= CHAPTERS_BEFORE_REST) {
    return { kind: 'rest', chapter: next, done, rested: day.restedOn === day.today };
  }
  return { kind: 'chapter', chapter: next, done };
}

/** A chapter on the Settling-in list: done (replay it), the next one, or later. */
export type ChapterStatus = 'done' | 'next' | 'later';

export function chapterStatuses(
  chapters: readonly SettlingChapterDone[],
): readonly { readonly chapter: SettlingChapter; readonly status: ChapterStatus }[] {
  const next = nextChapter(chapters);
  return SETTLING_CHAPTERS.map((chapter) => ({
    chapter,
    status: isChapterDone(chapters, chapter) ? 'done' : chapter === next ? 'next' : 'later',
  }));
}
