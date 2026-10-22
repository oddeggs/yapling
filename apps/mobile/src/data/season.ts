import type { PipsMinuteLines, SeasonWeeks } from '@yapling/domain';
import {
  PIPS_MINUTE_LINES as STORY_PIPS_MINUTE_LINES,
  SEASON_1,
  seasonWeeks,
} from '@yapling/story';

/*
 * The story the phone reads the learner's weeks from: the season's weeks, week 1 first (each one's
 * `week` slots say what opens on which day), the same weeks the server opens and fills the rings
 * from, so the phone and the server agree on every slot's day and scene.
 */

/** The season's weeks, week 1 first. */
export const SEASON_WEEKS: SeasonWeeks = seasonWeeks(SEASON_1);

/** Which phrases have Pip's-minute lines (a set-up, a slightly-wrong line). */
export const PIPS_MINUTE_LINES: PipsMinuteLines = STORY_PIPS_MINUTE_LINES;
