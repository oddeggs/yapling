import type { CharacterId, Id, Keepsake, LocalDate, TimeZone, WeekRing } from '@yapling/contracts';

import { isEpisodeWeek, nextEpisodeWeek, type SeasonWeeks } from './story-week';
import { localDateOf } from './time';

/*
 * The season keepsake: once every episode of a season is played, the roommate draws the café's
 * little sign and Mei signs it. It is kept in progress (a `season` keepsake), so the burrow wall
 * hangs it on every phone the learner signs in on. Nothing here reads the clock.
 */

/** Who signs a season keepsake: Mei, whose café the season saved. */
export const SEASON_KEEPSAKE_WITNESS: CharacterId = 'mei';

/** The season keepsake's id in progress: `season-1` for Season One. */
export const seasonKeepsakeId = (season: number): Id => `season-${season}`;

/**
 * The day a season ended, in the learner's timezone: when its last episode's slot was done. Null
 * while any episode of the season is still to play.
 */
export function seasonEndedOn(
  season: SeasonWeeks,
  weeks: readonly WeekRing[],
  timezone: TimeZone,
): LocalDate | null {
  if (nextEpisodeWeek(season, weeks) !== null) return null;
  let last = -1;
  season.forEach((shape, i) => {
    if (isEpisodeWeek(shape)) last = i;
  });
  if (last < 0) return null;
  const doneAt = weeks[last]?.slots.find((s) => s.kind === 'episode')?.doneAt ?? null;
  return doneAt === null ? null : localDateOf(doneAt, timezone);
}

/** The season keepsake as progress keeps it, or null before the season's end. */
export function seasonKeepsakeOf(
  number: number,
  season: SeasonWeeks,
  weeks: readonly WeekRing[],
  timezone: TimeZone,
): Keepsake | null {
  const earnedOn = seasonEndedOn(season, weeks, timezone);
  if (earnedOn === null) return null;
  return {
    id: seasonKeepsakeId(number),
    kind: 'season',
    canDoId: null,
    signedBy: SEASON_KEEPSAKE_WITNESS,
    earnedOn,
  };
}

/**
 * Progress's keepsakes with the season's added, once: the first one kept wins (the day it was
 * earned never moves). The same list back when the season isn't over or it is already there.
 */
export function withSeasonKeepsake(
  keepsakes: readonly Keepsake[],
  keepsake: Keepsake,
): readonly Keepsake[] {
  return keepsakes.some((k) => k.id === keepsake.id) ? keepsakes : [...keepsakes, keepsake];
}
