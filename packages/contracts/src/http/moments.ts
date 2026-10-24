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

export const STAGE_NAMES = [
  'visitor',
  'newcomer',
  'neighbour',
  'regular',
  'local',
  'voice',
] as const;

/** A moment ready to play: its id goes in the call's `hello` as `sceneId`, kind `moment`. */
export const MomentCard = z.object({
  id: OpaqueId,
  source: z.enum(['director', 'first', 'free']),
  place: z.string().min(1).max(32),
  variant: z.number().int().min(0).max(2),
  speaker: CharacterId,
  titleOpen: z.string().min(1).max(80),
  stage: z.enum(STAGE_NAMES),
});
export type MomentCard = z.infer<typeof MomentCard>;

export const NextMoment = z.object({
  moment: MomentCard.nullable(),
  /** The director is writing the next moment; ask again soon, or play Pip's free moment. */
  planning: z.boolean(),
  /** What the learner told the town their name is, once they have. */
  name: z.string().max(40).nullable(),
});
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
