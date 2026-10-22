import type { LocalDate, TimeZone } from '@yapling/contracts';
import { dayIndexOf, localDateOf, type Season1EpisodeId } from '@yapling/domain';
import { CAST } from '@yapling/story';

import type { KnockInputs } from '../knocks/inputs';
import { settlingStateOf } from '../knocks/inputs';
import { isSettlingIn, storyDayOneOf, type SettlingState } from '../knocks/settling';

/** The phone's timezone. */
export const deviceTimeZone = (): TimeZone => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** What the test menu needs from the learner. */
export type TestLearner = Pick<
  KnockInputs,
  | 'installedOn'
  | 'timezone'
  | 'quietHours'
  | 'roommateName'
  | 'notificationsAllowed'
  | 'weeks'
  | 'atVisitor'
> & {
  readonly completedEpisodes: readonly Season1EpisodeId[];
  readonly settling: SettlingState;
  /** The day week 1's days count from; null while settling in. */
  readonly storyDayOne: LocalDate | null;
  /** A profile exists (onboarding is done). */
  readonly known: boolean;
};

/**
 * The learner the test menu works on: the profile's, or before there is one a learner on their
 * first day (installed today, on the phone's timezone, the roommate still called Pip), which is
 * what a fresh install is.
 */
export const testLearnerOf = (inputs: KnockInputs | null, realNow: number): TestLearner => {
  if (inputs !== null) {
    const settling = settlingStateOf(inputs);
    return {
      ...inputs,
      settling,
      storyDayOne: storyDayOneOf(settling, inputs.installedOn),
      known: true,
    };
  }
  const timezone = deviceTimeZone();
  const installedOn = localDateOf(realNow, timezone);
  return {
    installedOn,
    timezone,
    roommateName: CAST.pip.name,
    notificationsAllowed: true,
    completedEpisodes: [],
    settling: { visitorPath: false, chapters: [], storyStartedOn: null },
    storyDayOne: installedOn,
    known: false,
  };
};

/**
 * The day the app is on: week 1's day (from the story's start), or while settling in the day
 * since install (day 1 is the install day).
 */
export const dayOf = (learner: TestLearner, appNow: number): number =>
  dayIndexOf(learner.storyDayOne ?? learner.installedOn, appNow, learner.timezone);

/** Still settling in with Linh. */
export const settlingOf = (learner: TestLearner): boolean => isSettlingIn(learner.settling);
