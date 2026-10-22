import type { EpochMs, Progress, TimeZone } from '@yapling/contracts';
import { fromPhraseProgress, hasPipsMinute, type PipsMinuteLines } from '@yapling/domain';

import { PIPS_MINUTE_LINES } from './season';

/*
 * Whether Pip's minute has a phrase today: the learning model's choice over the learner's phrases
 * as progress has them (one due phrase with a set-up line, the longest overdue first). When nothing
 * is due it isn't offered.
 */

export function pipsMinuteToday(
  progress: Progress,
  now: EpochMs,
  timezone: TimeZone,
  lines: PipsMinuteLines = PIPS_MINUTE_LINES,
): boolean {
  return hasPipsMinute(progress.phrases.map(fromPhraseProgress), now, timezone, lines);
}
