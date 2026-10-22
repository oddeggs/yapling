import { z } from 'zod';

/*
 * Shared building blocks for the call socket and the HTTP bodies.
 *
 * Wire naming: frame `type`s and enum values are snake_case; field names are camelCase (they map
 * straight onto TypeScript). Instants are epoch milliseconds; calendar days in the learner's own
 * timezone are `YYYY-MM-DD` strings.
 */

/**
 * The call-socket protocol version this package speaks, sent in `hello`. Bumped only on a breaking
 * frame change; the call answers `error { code: 'update_required' }` to an app it can't serve.
 */
export const PROTOCOL_VERSION = 1;

/** Limits the docs set; schemas use them. */
export const LIMITS = {
  /** Display names and roommate names. */
  nameMin: 1,
  nameMax: 24,
  /** Ids and slugs. */
  idMax: 64,
  /** One learner turn, one character line, one memory item. */
  textMax: 2_000,
  /** A short phrase or chunk ("Could we push that to Friday?"). */
  phraseMax: 200,
  /** Error targets active at once. */
  activeTargets: 2,
  /** Words in one heard turn, characters in one alignment frame. */
  wordsMax: 1_000,
  alignmentCharsMax: 4_000,
  /** Socket and session tokens. */
  tokenMin: 16,
  tokenMax: 2_048,
  /** "Chờ chút" pauses turn detection for 10 s by default, never longer than this. */
  holdSecondsMax: 30,
  /** Days kept per phrase (its most recent uses) and per error target (self-corrections). */
  usedDaysMax: 30,
  /** Contexts (scene ids) kept per phrase, the most recent. */
  phraseContextsMax: 20,
  /** Memory items one learner keeps; call records one list answers. */
  memoryItemsMax: 1_000,
  callsListMax: 100,
} as const;

/** A lowercase slug id: scene, beat, phrase, can-do, error target, keepsake. */
export const Id = z
  .string()
  .min(1)
  .max(LIMITS.idMax)
  .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'A lowercase slug');
export type Id = z.infer<typeof Id>;

/** A server-made opaque id (users, sessions, call records, memory items). */
export const OpaqueId = z
  .string()
  .min(1)
  .max(LIMITS.idMax)
  .regex(/^[A-Za-z0-9_-]+$/, 'Letters, digits, - and _');
export type OpaqueId = z.infer<typeof OpaqueId>;

/** A bearer token (session or socket). */
export const Token = z.string().min(LIMITS.tokenMin).max(LIMITS.tokenMax);
export type Token = z.infer<typeof Token>;

/** Milliseconds since the Unix epoch. */
export const EpochMs = z.int().min(0);
export type EpochMs = z.infer<typeof EpochMs>;

/** A calendar day in the learner's timezone. */
export const LocalDate = z.iso.date();
export type LocalDate = z.infer<typeof LocalDate>;

/** A wall-clock time in the learner's timezone, `HH:MM` (24 h). */
export const LocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM, 24 h');
export type LocalTime = z.infer<typeof LocalTime>;

/** An IANA timezone name, e.g. `Asia/Ho_Chi_Minh`. */
export const TimeZone = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$|^UTC$/, 'An IANA timezone');
export type TimeZone = z.infer<typeof TimeZone>;

/** An app version, `major.minor.patch`, optionally with a build (`1.0.0+42`). */
export const ClientVersion = z.string().regex(/^\d+\.\d+\.\d+(\+\d+)?$/, 'major.minor.patch');
export type ClientVersion = z.infer<typeof ClientVersion>;

/** Non-negative whole milliseconds (offsets and durations). */
export const Ms = z.int().min(0);
export type Ms = z.infer<typeof Ms>;

/** Non-negative whole seconds. */
export const Seconds = z.int().min(0);
export type Seconds = z.infer<typeof Seconds>;

/** Short text: a phrase, a gloss, a hint. */
export const Phrase = z.string().min(1).max(LIMITS.phraseMax);
export const Text = z.string().min(1).max(LIMITS.textMax);

/** Who speaks. `pip` is the roommate, drawn as the learner's chosen species. */
export const CHARACTER_IDS = [
  'pip',
  'linh',
  'mei',
  'sol',
  'hank',
  'nell',
  'bea',
  'dex',
  'arjun',
  'mags',
  'office',
] as const;
export const CharacterId = z.enum(CHARACTER_IDS);
export type CharacterId = z.infer<typeof CharacterId>;

/** The roommate's species. Cosmetic only. */
export const ROOMMATE_SPECIES = ['redpanda', 'capybara', 'cat'] as const;
export const RoommateSpecies = z.enum(ROOMMATE_SPECIES);
export type RoommateSpecies = z.infer<typeof RoommateSpecies>;

/**
 * The stages, lowest first: Visitor (settling in, before the story) and the five residency stages,
 * Newcomer to Voice of Natterwick. A profile starts at Newcomer (`DEFAULT_STAGE`); Visitor is
 * chosen or placed, never a default. Index arithmetic that means "the residency stages" counts from
 * Newcomer (`RESIDENCY_STAGES`).
 */
export const STAGES = ['visitor', 'newcomer', 'neighbour', 'regular', 'local', 'voice'] as const;
export const Stage = z.enum(STAGES);
export type Stage = z.infer<typeof Stage>;

/** Where every profile starts until placement or the learner moves it. */
export const DEFAULT_STAGE = 'newcomer' satisfies Stage;

/** The five numbered residency stages ("Chặng N/5"), Newcomer first; Visitor is not one. */
export const RESIDENCY_STAGES = [
  'newcomer',
  'neighbour',
  'regular',
  'local',
  'voice',
] as const satisfies readonly Stage[];
export type ResidencyStage = (typeof RESIDENCY_STAGES)[number];

/** Life, Work or both. */
export const TRACKS = ['life', 'work', 'both'] as const;
export const Track = z.enum(TRACKS);
export type Track = z.infer<typeof Track>;

/**
 * The pace the learner asked for ("Too hard" / "Too easy" on the residency card): the town talks a
 * little slower with hints sooner, or a little faster with hints later. None keeps the stage's.
 */
export const PACES = ['slower', 'faster'] as const;
export const Pace = z.enum(PACES);
export type Pace = z.infer<typeof Pace>;

/**
 * The first languages offered at onboarding (ISO 639-1), plus `other`: Tiếng Việt, Bahasa
 * Indonesia, ไทย, Português, Español, 日本語, 한국어, Türkçe.
 */
export const FIRST_LANGUAGES = ['vi', 'id', 'th', 'pt', 'es', 'ja', 'ko', 'tr', 'other'] as const;
export const FirstLanguage = z.enum(FIRST_LANGUAGES);
export type FirstLanguage = z.infer<typeof FirstLanguage>;

/**
 * What a call is for. `voicemail_reply` answers a character's voicemail. `settling`: a Settling-in
 * chapter with Linh, before the story starts.
 */
export const CALL_KINDS = [
  'placement',
  'episode',
  'real_week',
  'practice',
  'voicemail_reply',
  'settling',
] as const;
export const CallKind = z.enum(CALL_KINDS);
export type CallKind = z.infer<typeof CallKind>;

/** The three calls of the weekly ring. */
export const RING_SLOT_KINDS = ['episode', 'real_week', 'practice'] as const;
export const RingSlotKind = z.enum(RING_SLOT_KINDS);
export type RingSlotKind = z.infer<typeof RingSlotKind>;

/** The phrase lifecycle: seed (met) → sprout → leaf → bloom. Phrases never wilt. */
export const PHRASE_STATES = ['seed', 'sprout', 'leaf', 'bloom'] as const;
export const PhraseState = z.enum(PHRASE_STATES);
export type PhraseState = z.infer<typeof PhraseState>;

/** Yapling Plus or free. */
export const PLANS = ['free', 'plus'] as const;
export const Plan = z.enum(PLANS);
export type Plan = z.infer<typeof Plan>;
