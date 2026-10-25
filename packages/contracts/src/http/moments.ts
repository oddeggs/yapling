import { z } from 'zod';

import { CharacterId, EpochMs, FirstLanguage, LocalDate, OpaqueId, TimeZone } from '../primitives';

/*
 * The story director's routes: the next moment to play, Pip's free moment while the director is
 * still writing, and the wall of kept paintings.
 */

/** `POST /api/me/moments/next` and `/free`: who the learner is, from the phone. */
export const MomentRequest = z.object({
  firstLanguage: FirstLanguage,
  /** ISO 3166 code from the device region, when the phone has one. */
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
  timezone: TimeZone,
});
export type MomentRequest = z.infer<typeof MomentRequest>;

/** `POST /api/me/moments/visit`: the learner chose a place from the menu. */
export const VisitRequest = MomentRequest.extend({
  place: z.string().min(1).max(32),
  variant: z.number().int().min(0).max(2),
});
export type VisitRequest = z.infer<typeof VisitRequest>;

export const STAGE_NAMES = [
  'visitor',
  'newcomer',
  'neighbour',
  'regular',
  'local',
  'voice',
] as const;

/**
 * The way into a moment: a caption over the new place while Pip, walking with the learner, says
 * why they are going there (or, after a long gap, what happened last time).
 */
export const MomentBridge = z.object({
  /** "Later that morning · the harbour". */
  card: z.string().min(1).max(80),
  /** The story and how far into it: "The Crate With No Name · 2 of 5". */
  chapter: z.string().max(80).nullable(),
  /**
   * The chapter card before the scene, shown on black: two or three short, plain sentences (what
   * happened, where they are going, why). Empty for none.
   */
  lines: z.array(z.string().max(200)).max(4).default([]),
  /** The card in the learner's own language, or null. */
  gloss: z.string().max(800).nullable().default(null),
});
export type MomentBridge = z.infer<typeof MomentBridge>;

/** A moment ready to play: its id goes in the call's `hello` as `sceneId`, kind `moment`. */
export const MomentCard = z.object({
  id: OpaqueId,
  source: z.enum(['director', 'first', 'free']),
  place: z.string().min(1).max(32),
  variant: z.number().int().min(0).max(2),
  speaker: CharacterId,
  titleOpen: z.string().min(1).max(80),
  stage: z.enum(STAGE_NAMES),
  bridge: MomentBridge.nullable().default(null),
});
export type MomentCard = z.infer<typeof MomentCard>;

export const NextMoment = z.object({
  moment: MomentCard.nullable(),
  /** The director is writing the next moment; ask again soon, or play Pip's free moment. */
  planning: z.boolean(),
  /** What the learner told the town their name is, once they have. */
  name: z.string().max(40).nullable(),
  /** The learner hasn't arrived yet (no `PUT /api/me/arrival`): show the arrival first. */
  arrived: z.boolean().default(true),
});

// --- Arriving: what the learner tells the town before the first conversation. ---

/** Why English, right now (one to three). */
export const ARRIVAL_WHY = [
  'work',
  'interview',
  'travel',
  'study',
  'exam',
  'move',
  'friends',
  'media',
  'family',
  'me',
] as const;
/** What they love (up to six): the stories are made of these. */
export const ARRIVAL_INTERESTS = [
  'food',
  'music',
  'films',
  'games',
  'sport',
  'travel',
  'tech',
  'books',
  'fitness',
  'pets',
  'fashion',
  'nature',
  'art',
  'business',
  'photos',
  'cars',
] as const;
/** Where English gets hard (up to three): the stories rehearse these. */
export const ARRIVAL_HARD = [
  'meetings',
  'small_talk',
  'phone',
  'fast_speech',
  'words',
  'pronunciation',
  'interviews',
  'nerves',
] as const;
export const ARRIVAL_DOING = ['work', 'study', 'both', 'neither'] as const;

/**
 * `PUT /api/me/arrival`: the learner's arrival in Natterwick. `level` is their own feel for their
 * spoken English, 1 ("a few words") to 5 ("fluent, I want to sound natural"); the conversations
 * correct it from how they really talk.
 */
export const Arrival = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[^\p{Cc}]+$/u),
  why: z.array(z.enum(ARRIVAL_WHY)).min(1).max(3),
  doing: z.enum(ARRIVAL_DOING),
  /** Their work or study in their own words ("nurse", "marketing at a bank"), or null. */
  field: z.string().trim().max(80).nullable(),
  interests: z.array(z.enum(ARRIVAL_INTERESTS)).max(6),
  hard: z.array(z.enum(ARRIVAL_HARD)).max(3),
  level: z.number().int().min(1).max(5),
  /** They confirmed they are 18 or over. */
  adult: z.literal(true),
  firstLanguage: FirstLanguage,
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
  timezone: TimeZone,
});
export type Arrival = z.infer<typeof Arrival>;
export type NextMoment = z.infer<typeof NextMoment>;

export const PaintingWord = z.object({ phrase: z.string().max(200), line: z.string().max(1000) });
export type PaintingWord = z.infer<typeof PaintingWord>;

/** A kept painting: re-painted on the phone from its place, variant, hour and weather. */
export const Painting = z.object({
  id: OpaqueId,
  callId: OpaqueId,
  place: z.string().min(1).max(32),
  variant: z.number().int().min(0).max(2),
  hour: z.number().min(0).max(24),
  localDate: LocalDate,
  weather: z.string().max(16),
  speaker: CharacterId,
  titleOpen: z.string().max(80),
  title: z.string().max(80),
  keptAt: EpochMs,
  /** `judging` until the notes are in, a few seconds after the moment ends. */
  status: z.enum(['judging', 'done', 'failed']),
  cut: z.boolean(),
  canDos: z.array(z.string().max(300)).max(4),
  words: z.array(PaintingWord).max(8),
  learned: z.string().max(300).nullable(),
});
export type Painting = z.infer<typeof Painting>;

export const PaintingList = z.object({ items: z.array(Painting) });
export type PaintingList = z.infer<typeof PaintingList>;

/** `GET /api/me/paintings/:id/lines`: the conversation, for replay. */
export const PaintingLines = z.object({
  lines: z.array(z.object({ who: z.enum(['learner', 'character']), text: z.string().max(2000) })),
});
export type PaintingLines = z.infer<typeof PaintingLines>;
