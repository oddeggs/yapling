import type { Progress } from '@yapling/contracts';
import { seasonKeepsakeOf, withSeasonKeepsake, type SeasonWeeks } from '@yapling/domain';
import { SEASON_1, seasonWeeks } from '@yapling/story';

import { learnerTimeZone, readProgress, updateProgress } from './store';

/** A season keepsake asked for before the season's last episode was played. */
export const SEASON_NOT_FINISHED = 'season_not_finished';

/** The seasons there are, by number. */
const SEASONS: ReadonlyMap<number, SeasonWeeks> = new Map([
  [SEASON_1.number, seasonWeeks(SEASON_1)],
]);

export type SeasonKeepsakeOutcome =
  | { readonly ok: true; readonly progress: Progress }
  | { readonly ok: false; readonly error: 'no_season' | 'not_finished' };

/**
 * Keeps the season keepsake in the learner's progress once every episode of the season is played
 * (by the stored rings, never the phone's word), dated by the last episode's slot in the learner's
 * timezone. Asking again changes nothing.
 */
export async function keepSeasonKeepsake(
  db: D1Database,
  userId: string,
  number: number,
  now: number,
): Promise<SeasonKeepsakeOutcome> {
  const season = SEASONS.get(number);
  if (season === undefined) return { ok: false, error: 'no_season' };
  const timezone = await learnerTimeZone(db, userId);
  const current = await readProgress(db, userId, now);
  const keepsake = seasonKeepsakeOf(number, season, current.weeks, timezone);
  if (keepsake === null) return { ok: false, error: 'not_finished' };
  if (current.keepsakes.some((k) => k.id === keepsake.id)) return { ok: true, progress: current };
  const progress = await updateProgress(
    db,
    userId,
    (p) => {
      const kept = seasonKeepsakeOf(number, season, p.weeks, timezone) ?? keepsake;
      return { ...p, keepsakes: [...withSeasonKeepsake(p.keepsakes, kept)] };
    },
    now,
  );
  return { ok: true, progress };
}
