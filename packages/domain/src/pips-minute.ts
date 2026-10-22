import type { EpochMs, Id, PhraseEventKind, TimeZone } from '@yapling/contracts';

import {
  duePhrases,
  markPipReuse,
  pickPipReuse,
  recordPhraseUse,
  type PhraseRecord,
  type PhraseUse,
} from './phrases';
import type { Rng } from './rng';

/*
 * Pip's minute: about a minute in the burrow with Pip, on any day a phrase is due. Turn one: Pip
 * sets up a small moment where one due phrase fits and the learner says it. Turn two, when one
 * fits: Pip says another of the learner's phrases slightly wrong and the learner fixes it. Both
 * are prompted uses, so Pip's minute grows a seed to a sprout and a sprout to a leaf on a new day,
 * and never makes a bloom (blooms come from saying a phrase unprompted in a live call).
 *
 * It costs no live minutes (see `UNMETERED_CALL_KINDS` in the ledger) and is never a ring slot.
 * When nothing is due it simply isn't offered.
 */

/** The story lines a phrase has for Pip's minute; left out, every phrase has both. */
export interface PipsMinuteLines {
  /** The phrase has a set-up line ("Mei looks sad again. What do I ask her?"). */
  readonly hasSetUp?: (phraseId: Id) => boolean;
  /** The phrase has a slightly-wrong line for Pip ("Can I helping?"). */
  readonly hasWrongLine?: (phraseId: Id) => boolean;
}

/** Today's Pip's minute: the phrase to set up, and the one Pip says wrong (null: one turn only). */
export interface PipsMinute {
  readonly due: PhraseRecord;
  readonly reuse: PhraseRecord | null;
}

const always = (): boolean => true;

/** The phrase Pip sets up today: the most overdue phrase with a set-up line; null when none is. */
const duePhraseFor = (
  phrases: readonly PhraseRecord[],
  now: EpochMs,
  timezone: TimeZone,
  lines: PipsMinuteLines,
): PhraseRecord | null => {
  const hasSetUp = lines.hasSetUp ?? always;
  return (
    duePhrases(
      phrases.filter((p) => hasSetUp(p.id)),
      now,
      timezone,
      { limit: 1 },
    )[0] ?? null
  );
};

/** Whether Pip's minute has a phrase today (the burrow's chip). */
export const hasPipsMinute = (
  phrases: readonly PhraseRecord[],
  now: EpochMs,
  timezone: TimeZone,
  lines: PipsMinuteLines = {},
): boolean => duePhraseFor(phrases, now, timezone, lines) !== null;

/**
 * Today's Pip's minute: one due phrase (`duePhrases`, the longest overdue first, from any week,
 * Settling in's included) and one other phrase for Pip to reuse slightly wrong (`pickPipReuse`,
 * when one has a wrong line). Null when nothing is due.
 */
export const pipsMinuteFor = (
  phrases: readonly PhraseRecord[],
  now: EpochMs,
  timezone: TimeZone,
  rng: Rng,
  lines: PipsMinuteLines = {},
): PipsMinute | null => {
  const due = duePhraseFor(phrases, now, timezone, lines);
  if (due === null) return null;
  const hasWrongLine = lines.hasWrongLine ?? always;
  const others = phrases.filter((p) => p.id !== due.id && hasWrongLine(p.id));
  return { due, reuse: pickPipReuse(others, now, timezone, rng) };
};

/** How the two turns went, from the turn log (words matched on the card, as card turns pass). */
export interface PipsMinuteOutcome {
  readonly at: EpochMs;
  /** The Pip's-minute scene, the phrase use's context. */
  readonly sceneId: Id;
  /** The learner said the due phrase. */
  readonly dueSaid: boolean;
  /** The learner fixed Pip's version; null when turn two wasn't played. */
  readonly reuseFixed: boolean | null;
}

/** A phrase said in Pip's minute: always prompted, so it never blooms. */
export const pipsMinuteUse = (at: EpochMs, sceneId: Id, correct: boolean): PhraseUse => ({
  at,
  correct,
  prompted: true,
  contextId: sceneId,
});

export interface PipsMinuteResult {
  readonly phrases: readonly PhraseRecord[];
  /** What happened to each phrase, for the small after-call card. */
  readonly events: readonly {
    readonly phraseId: Id;
    readonly events: readonly PhraseEventKind[];
  }[];
}

/**
 * Applies a Pip's minute to the learner's phrases: the due phrase's use, then the fix of Pip's
 * version as a use of that phrase, which Pip has now reused (so it rests a week before Pip tries
 * it again). A turn not passed changes nothing for its phrase.
 */
export const recordPipsMinute = (
  phrases: readonly PhraseRecord[],
  minute: PipsMinute,
  outcome: PipsMinuteOutcome,
  timezone: TimeZone,
): PipsMinuteResult => {
  const due = recordPhraseUse(
    phrases,
    minute.due,
    pipsMinuteUse(outcome.at, outcome.sceneId, outcome.dueSaid),
    timezone,
  );
  const events = [{ phraseId: minute.due.id, events: due.events }];
  const reuse = minute.reuse;
  if (reuse === null || outcome.reuseFixed === null) return { phrases: due.phrases, events };
  const fixed = recordPhraseUse(
    due.phrases,
    reuse,
    pipsMinuteUse(outcome.at, outcome.sceneId, outcome.reuseFixed),
    timezone,
  );
  return {
    phrases: fixed.phrases.map((p) => (p.id === reuse.id ? markPipReuse(p, outcome.at) : p)),
    events: [...events, { phraseId: reuse.id, events: fixed.events }],
  };
};
