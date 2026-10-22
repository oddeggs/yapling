import type { PipsMinuteLines, SeasonWeeks } from '@yapling/domain';
import { EPISODES } from '@yapling/story';

/*
 * The story the phone reads the learner's weeks from: the season's weeks, week 1 first (each one's
 * `week` slots say what opens on which day), the same weeks the server opens and fills the rings
 * from, so the phone and the server agree on every slot's day and scene.
 */

/** The season's weeks, week 1 first. */
export const SEASON_WEEKS: SeasonWeeks = EPISODES;

/**
 * Which phrases have Pip's-minute lines (a set-up, a slightly-wrong line). Left empty, every phrase
 * has both, until the story names them.
 */
export const PIPS_MINUTE_LINES: PipsMinuteLines = {};
