import type {
  EpochMs,
  LocalDate,
  Profile,
  Progress,
  QuietHours,
  TimeZone,
} from '@yapling/contracts';
import { SEASON_1_EPISODES, type Season1EpisodeId } from '@yapling/domain';

/**
 * What the knocks need to know about the learner, from their profile and progress. The app's data
 * layer provides it; null until there is a profile (nothing is scheduled before onboarding asks).
 */
export interface KnockInputs {
  /** Day 1, in the learner's timezone. */
  readonly installedOn: LocalDate;
  readonly timezone: TimeZone;
  /** The learner's quiet hours; null for none; left out for the default (22:00–08:00). */
  readonly quietHours?: QuietHours | null;
  /** The learner said yes to knocks (onboarding, Me); the system permission is checked too. */
  readonly notificationsAllowed: boolean;
  /** When the app was last opened before this open; null on the first open. */
  readonly lastOpenedAt: EpochMs | null;
  readonly completedEpisodes: readonly Season1EpisodeId[];
  /** The roommate's name, which titles its knocks and fills `{name}`. */
  readonly roommateName: string;
}

/** Week N's episode is Episode N: the episodes whose ring slot is done, in order. */
export const completedEpisodesOf = (progress: Pick<Progress, 'weeks'>): Season1EpisodeId[] =>
  progress.weeks.flatMap((week, i) => {
    const id = SEASON_1_EPISODES[i];
    return week.slots[0]?.status === 'done' && id !== undefined ? [id] : [];
  });

/** The knocks' inputs from the learner's profile, progress and last open; null without a profile. */
export function knockInputsOf(
  profile: Profile | null,
  progress: Progress | null,
  lastOpenedAt: EpochMs | null,
): KnockInputs | null {
  if (profile === null || progress === null) return null;
  return {
    installedOn: progress.installedOn,
    timezone: profile.timezone,
    quietHours: profile.quietHours,
    notificationsAllowed: profile.notificationsAllowed,
    lastOpenedAt,
    completedEpisodes: completedEpisodesOf(progress),
    roommateName: profile.roommate.name,
  };
}
