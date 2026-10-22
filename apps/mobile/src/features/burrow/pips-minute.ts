import type { EpochMs, Id, PhraseProgress, Stage, TimeZone } from '@yapling/contracts';
import { fromPhraseProgress, pipsMinuteFor, seededRng } from '@yapling/domain';
import { PIPS_MINUTE_LINES, PIPS_MINUTE_PREFIX, pipsMinuteSceneFor } from '@yapling/story';

/*
 * Today's Pip's minute, as the scene the burrow starts: the learning model's choice over the
 * learner's phrases (one due phrase, and one for Pip to say slightly wrong when one fits), built
 * by the story into a scene whose id names that choice. The choice is seeded by the story day, so
 * the burrow offers the same minute all day. Null when nothing is due: then it isn't offered.
 */

/** Whether the learner has had a Pip's minute before (a phrase was used in one). */
const hadOne = (phrases: readonly PhraseProgress[]): boolean =>
  phrases.some((p) => p.contexts.some((c) => c.startsWith(`${PIPS_MINUTE_PREFIX}.`)));

export function pipsMinuteSceneOf(input: {
  readonly phrases: readonly PhraseProgress[];
  readonly now: EpochMs;
  readonly timezone: TimeZone;
  /** The story day: the seed, and which of Pip's openers plays. */
  readonly day: number;
  readonly stage: Stage;
}): Id | null {
  const minute = pipsMinuteFor(
    input.phrases.map(fromPhraseProgress),
    input.now,
    input.timezone,
    seededRng(input.day),
    PIPS_MINUTE_LINES,
  );
  const intro = input.stage === 'visitor' && !hadOne(input.phrases);
  return pipsMinuteSceneFor(minute, { dayIndex: input.day, intro })?.id ?? null;
}
