import { z } from 'zod';

import { CallEndReason } from '../call/server';
import {
  CallKind,
  CharacterId,
  EpochMs,
  Id,
  LIMITS,
  OpaqueId,
  Phrase,
  Seconds,
  Text,
} from '../primitives';

/** The post-call summary's shape version. */
export const CALL_SUMMARY_VERSION = 1;

/** The one fix: what the learner said and the better way, explained in one line. */
export const CallFix = z.object({
  from: Text,
  to: Text,
  /** The error target it belongs to, if any. */
  targetId: Id.nullable(),
  /** One line in the learner's first language (English from Regular up); null for `other`. */
  explanation: Text.nullable(),
});
export type CallFix = z.infer<typeof CallFix>;

export const PHRASE_EVENT_KINDS = ['met', 'used', 'sprouted', 'leafed', 'bloomed'] as const;
export const PhraseEventKind = z.enum(PHRASE_EVENT_KINDS);
export type PhraseEventKind = z.infer<typeof PhraseEventKind>;

/** Something that happened to a phrase in the call. */
export const PhraseEvent = z.object({ phraseId: Id, text: Phrase, event: PhraseEventKind });
export type PhraseEvent = z.infer<typeof PhraseEvent>;

/** A line that counts toward a can-do, and the neighbour who heard it. */
export const CallCanDoEvidence = z.object({ canDoId: Id, quote: Text, witness: CharacterId });
export type CallCanDoEvidence = z.infer<typeof CallCanDoEvidence>;

/**
 * Fluency, shown with friendly names: Flow (mean length of run, seconds), Pace (words per minute)
 * and Pauses (mid-clause pauses per minute). Trends only, never a level.
 */
export const CallMetrics = z.object({
  flowSeconds: z.number().min(0).max(3_600),
  paceWpm: z.number().min(0).max(400),
  pausesPerMin: z.number().min(0).max(120),
});
export type CallMetrics = z.infer<typeof CallMetrics>;

/** Written after the call: two wins, one fix, phrase and can-do events, new memory items. */
export const CallSummary = z.object({
  version: z.int().min(1),
  wins: z.array(Text).max(2),
  fix: CallFix.nullable(),
  phraseEvents: z.array(PhraseEvent).max(50),
  canDoEvidence: z.array(CallCanDoEvidence).max(20),
  metrics: CallMetrics,
  memoryItemIds: z.array(OpaqueId).max(20),
});
export type CallSummary = z.infer<typeof CallSummary>;

/** `GET /api/calls/:id`. `summary` is null while `summaryPending` (and for a call too short for one). */
/**
 * How the call's learner turns passed, counted (the turn log's pass kinds): `match` on their own
 * (the beat's word heard, or judged fine), `generous` on the second English try without it, `skip`
 * ("Bỏ qua"), `fallback` (the tries ran out and someone else said it).
 */
export const TurnPassCounts = z.object({
  match: z.int().min(0),
  generous: z.int().min(0),
  skip: z.int().min(0),
  fallback: z.int().min(0),
});
export type TurnPassCounts = z.infer<typeof TurnPassCounts>;

export const CallRecord = z
  .object({
    id: OpaqueId,
    kind: CallKind,
    sceneId: Id,
    /** The character who led the call. */
    character: CharacterId,
    startedAt: EpochMs,
    endedAt: EpochMs,
    learnerSeconds: Seconds,
    characterSeconds: Seconds,
    endReason: CallEndReason,
    summaryPending: z.boolean(),
    summary: CallSummary.nullable(),
    /** How its learner turns passed; left out by older calls (and for calls before it was kept). */
    turnPasses: TurnPassCounts.optional(),
  })
  .refine((c) => c.endedAt >= c.startedAt, { message: 'A call ends after it starts' })
  .refine((c) => !(c.summaryPending && c.summary !== null), {
    message: 'A pending summary is not there yet',
  });
export type CallRecord = z.infer<typeof CallRecord>;

/** `GET /api/calls`: the most recent calls, newest first. */
export const CallRecordList = z.object({ calls: z.array(CallRecord).max(LIMITS.callsListMax) });
export type CallRecordList = z.infer<typeof CallRecordList>;
