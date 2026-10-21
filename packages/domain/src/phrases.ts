import type {
  EpochMs,
  Id,
  LocalDate,
  PhraseEventKind,
  PhraseProgress,
  PhraseState,
  TimeZone,
} from '@yapling/contracts';

import { pick, type Rng } from './rng';
import { addDays, daysBetween, localDateOf } from './time';

/*
 * The phrase (chunk) lifecycle, mirrored by the phrase's object in the burrow:
 *
 * - seed (met): heard in an episode or story, or tapped for a gloss.
 * - sprout: used once, correctly.
 * - leaf: used correctly again on a different calendar day (the learner's timezone).
 * - bloom: used correctly, unprompted, in a context it hasn't been used in before, 14 or more days
 *   after it was met.
 *
 * A phrase moves at most one state per use, and never back. Phrases never wilt: one not used for a
 * while stays where it is and becomes due, so Pip or a neighbour drops it into a story to give the
 * learner a chance to use it again. Chances are spaced about 1, 3 and then 7 days apart.
 */

export interface PhraseRecord {
  readonly id: Id;
  readonly text: string;
  readonly state: PhraseState;
  readonly seedAt: EpochMs;
  readonly sproutAt: EpochMs | null;
  readonly leafAt: EpochMs | null;
  readonly bloomAt: EpochMs | null;
  readonly lastUsedAt: EpochMs | null;
  /** The distinct days with a correct use, oldest first. */
  readonly useDays: readonly LocalDate[];
  /** The contexts (scene ids) it has been used in correctly. */
  readonly contexts: readonly Id[];
  /** When Pip last reused it slightly wrong for the learner to fix. */
  readonly pipReusedAt: EpochMs | null;
}

/** One time the learner said the phrase in a call, as the post-call job judged it. */
export interface PhraseUse {
  readonly at: EpochMs;
  readonly correct: boolean;
  /** True when the character set it up (a hint, a "can you ask her…?", fixing Pip's version). */
  readonly prompted: boolean;
  /** Where it was said: the scene id. */
  readonly contextId: Id;
}

/** Days between chances to use a phrase, by how many days it has been used on: 1, 2, 3+. */
export const PHRASE_SPACING_DAYS = [1, 3, 7] as const;
/** A phrase can bloom this many days after it was met. */
export const BLOOM_AFTER_DAYS = 14;
/** Pip reuses a phrase slightly wrong at most once in this many days. */
export const PIP_REUSE_REST_DAYS = 7;

const STATE_ORDER: readonly PhraseState[] = ['seed', 'sprout', 'leaf', 'bloom'];

/** A newly met phrase: a seed packet on the shelf. */
export const seedPhrase = (id: Id, text: string, at: EpochMs): PhraseRecord => ({
  id,
  text,
  state: 'seed',
  seedAt: at,
  sproutAt: null,
  leafAt: null,
  bloomAt: null,
  lastUsedAt: null,
  useDays: [],
  contexts: [],
  pipReusedAt: null,
});

/**
 * The learner meets a phrase (heard it, or tapped a line for its gloss): a seed, if it is new.
 * Meeting a phrase again changes nothing; tapping for a gloss is never a penalty.
 */
export const meetPhrase = (
  phrases: readonly PhraseRecord[],
  phrase: { readonly id: Id; readonly text: string; readonly at: EpochMs },
): { readonly phrases: readonly PhraseRecord[]; readonly met: boolean } =>
  phrases.some((p) => p.id === phrase.id)
    ? { phrases, met: false }
    : { phrases: [...phrases, seedPhrase(phrase.id, phrase.text, phrase.at)], met: true };

export interface PhraseUseResult {
  readonly phrase: PhraseRecord;
  /** What happened, for the post-call summary: `used`, plus the state it reached if it moved. */
  readonly events: readonly PhraseEventKind[];
}

/** One use of a phrase. An incorrect use changes nothing (it is recast, never counted against). */
export const usePhrase = (
  phrase: PhraseRecord,
  use: PhraseUse,
  timezone: TimeZone,
): PhraseUseResult => {
  if (!use.correct) return { phrase, events: [] };
  const day = localDateOf(use.at, timezone);
  const newDay = !phrase.useDays.includes(day);
  const newContext = !phrase.contexts.includes(use.contextId);
  const used: PhraseRecord = {
    ...phrase,
    lastUsedAt: Math.max(phrase.lastUsedAt ?? use.at, use.at),
    useDays: newDay ? [...phrase.useDays, day].sort() : phrase.useDays,
    contexts: newContext ? [...phrase.contexts, use.contextId] : phrase.contexts,
  };
  switch (phrase.state) {
    case 'seed':
      return {
        phrase: { ...used, state: 'sprout', sproutAt: use.at },
        events: ['used', 'sprouted'],
      };
    case 'sprout':
      return newDay
        ? { phrase: { ...used, state: 'leaf', leafAt: use.at }, events: ['used', 'leafed'] }
        : { phrase: used, events: ['used'] };
    case 'leaf': {
      const seedDay = localDateOf(phrase.seedAt, timezone);
      const blooms = !use.prompted && newContext && daysBetween(seedDay, day) >= BLOOM_AFTER_DAYS;
      return blooms
        ? { phrase: { ...used, state: 'bloom', bloomAt: use.at }, events: ['used', 'bloomed'] }
        : { phrase: used, events: ['used'] };
    }
    case 'bloom':
      return { phrase: used, events: ['used'] };
  }
};

/**
 * A use of a phrase by id; a phrase the learner uses before ever meeting it is met at that moment
 * (and sprouts from the same use).
 */
export const recordPhraseUse = (
  phrases: readonly PhraseRecord[],
  phrase: { readonly id: Id; readonly text: string },
  use: PhraseUse,
  timezone: TimeZone,
): { readonly phrases: readonly PhraseRecord[]; readonly events: readonly PhraseEventKind[] } => {
  const existing = phrases.find((p) => p.id === phrase.id);
  if (existing === undefined && !use.correct) return { phrases, events: [] };
  const base = existing ?? seedPhrase(phrase.id, phrase.text, use.at);
  const result = usePhrase(base, use, timezone);
  const events: readonly PhraseEventKind[] =
    existing === undefined ? ['met', ...result.events] : result.events;
  return {
    phrases:
      existing === undefined
        ? [...phrases, result.phrase]
        : phrases.map((p) => (p.id === phrase.id ? result.phrase : p)),
    events,
  };
};

/**
 * The day a phrase next deserves a chance in a call. A seed is due at once; a used phrase is due
 * 1, 3 and then 7 days after the last day it was used; a bloom is never due again.
 */
export const nextDueOn = (phrase: PhraseRecord, timezone: TimeZone): LocalDate | null => {
  if (phrase.state === 'bloom') return null;
  const lastDay = phrase.useDays[phrase.useDays.length - 1];
  if (lastDay === undefined) return localDateOf(phrase.seedAt, timezone);
  const step = Math.min(phrase.useDays.length, PHRASE_SPACING_DAYS.length) - 1;
  return addDays(lastDay, PHRASE_SPACING_DAYS[step] ?? 7);
};

/** How many due phrases one call gets chances to use, by default. */
export const DUE_PHRASES_PER_CALL = 3;

/**
 * The phrases a call should give chances to use: those due today or earlier, the longest overdue
 * first, then the least grown, then the oldest. `always` (the week's own phrases) come first.
 */
export const duePhrases = (
  phrases: readonly PhraseRecord[],
  now: EpochMs,
  timezone: TimeZone,
  options: { readonly limit?: number; readonly always?: readonly Id[] } = {},
): readonly PhraseRecord[] => {
  const today = localDateOf(now, timezone);
  const always = options.always ?? [];
  const due = phrases
    .map((phrase) => ({ phrase, dueOn: nextDueOn(phrase, timezone) }))
    .filter(
      (d): d is { phrase: PhraseRecord; dueOn: LocalDate } =>
        d.dueOn !== null && (d.dueOn <= today || always.includes(d.phrase.id)),
    )
    .sort(
      (a, b) =>
        Number(always.includes(b.phrase.id)) - Number(always.includes(a.phrase.id)) ||
        a.dueOn.localeCompare(b.dueOn) ||
        STATE_ORDER.indexOf(a.phrase.state) - STATE_ORDER.indexOf(b.phrase.state) ||
        a.phrase.seedAt - b.phrase.seedAt ||
        a.phrase.id.localeCompare(b.phrase.id),
    );
  return due.slice(0, options.limit ?? DUE_PHRASES_PER_CALL).map((d) => d.phrase);
};

/**
 * The phrase Pip reuses slightly wrong ("Could we *pull* that to Friday?") for the learner to fix:
 * one the learner has already used (sprout or leaf), last used on an earlier day, and not reused by
 * Pip in the last week. Null when none fits. The wrong version itself is story content.
 */
export const pickPipReuse = (
  phrases: readonly PhraseRecord[],
  now: EpochMs,
  timezone: TimeZone,
  rng: Rng,
): PhraseRecord | null => {
  const today = localDateOf(now, timezone);
  const candidates = phrases
    .filter((p) => p.state === 'sprout' || p.state === 'leaf')
    .filter((p) => p.lastUsedAt !== null && localDateOf(p.lastUsedAt, timezone) < today)
    .filter(
      (p) =>
        p.pipReusedAt === null ||
        daysBetween(localDateOf(p.pipReusedAt, timezone), today) >= PIP_REUSE_REST_DAYS,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  return pick(candidates, rng) ?? null;
};

/** Pip reused the phrase slightly wrong at `at`. */
export const markPipReuse = (phrase: PhraseRecord, at: EpochMs): PhraseRecord => ({
  ...phrase,
  pipReusedAt: at,
});

/** The phrase as the progress body carries it. */
export const toPhraseProgress = (phrase: PhraseRecord): PhraseProgress => ({
  id: phrase.id,
  text: phrase.text,
  state: phrase.state,
  seedAt: phrase.seedAt,
  sproutAt: phrase.sproutAt,
  leafAt: phrase.leafAt,
  bloomAt: phrase.bloomAt,
  lastUsedAt: phrase.lastUsedAt,
});
