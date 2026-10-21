import type { TimeZone } from '@yapling/contracts';
import { dayIndexOf, localDateOf, type Season1EpisodeId } from '@yapling/domain';
import { CAST } from '@yapling/story';

import type { KnockInputs } from '../knocks/inputs';

/** The phone's timezone. */
export const deviceTimeZone = (): TimeZone => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** What the test menu needs from the learner. */
export type TestLearner = Pick<
  KnockInputs,
  'installedOn' | 'timezone' | 'quietHours' | 'roommateName' | 'notificationsAllowed'
> & { readonly completedEpisodes: readonly Season1EpisodeId[] };

/**
 * The learner the test menu works on: the profile's, or before there is one a learner on their
 * first day (installed today, on the phone's timezone, the roommate still called Pip), which is
 * what a fresh install is.
 */
export const testLearnerOf = (inputs: KnockInputs | null, realNow: number): TestLearner => {
  if (inputs !== null) return inputs;
  const timezone = deviceTimeZone();
  return {
    installedOn: localDateOf(realNow, timezone),
    timezone,
    roommateName: CAST.pip.name,
    notificationsAllowed: true,
    completedEpisodes: [],
  };
};

/** The day of the first week the app is on. */
export const dayOf = (learner: TestLearner, appNow: number): number =>
  dayIndexOf(learner.installedOn, appNow, learner.timezone);
