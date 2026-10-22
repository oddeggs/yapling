import { z } from 'zod';

import { CharacterId, Id, LIMITS, Ms, OpaqueId, Phrase, Seconds, Text, Token } from '../primitives';
import { TtsCodec, TtsSampleRateHz } from './audio';
import { Seq, tolerant } from './common';

/*
 * Frames the call sends to the phone. TTS audio is not here: it comes down as binary `tts_pcm16`
 * or `tts_mp3` frames (see `audio.ts`) that share this sender's `seq` counter.
 *
 * Times on the learner's side (`heard` words) are milliseconds on the call's mic clock: 0 is the
 * first sample of the first mic chunk of this socket. Times in `alignment` are milliseconds from
 * the first sample of their TTS stream.
 */

/** A TTS stream or recorded line: 1 and up, unique within a call. */
export const StreamId = z.int().min(1).max(0xffff_ffff);
export type StreamId = z.infer<typeof StreamId>;

/** The answer to `hello`: the call is live. */
export const ReadyFrame = z.object({
  type: z.literal('ready'),
  seq: Seq,
  sessionId: OpaqueId,
  /** Live seconds left on the learner's ledger (shown as minutes). */
  secondsLeft: Seconds,
  /** Where recorded lines not in the app bundle download from (`<base>/<lineId>.mp3`). */
  recordedLineBaseUrl: z.url({ protocol: /^https$/ }).nullable(),
  /** Send this in the next `hello` if the socket drops, to resume the beat. */
  resumeToken: Token,
  /** True when this socket resumed a dropped call. */
  resumed: z.boolean(),
});
export type ReadyFrame = z.infer<typeof ReadyFrame>;

/** The learner's turn so far, while they speak. Replaces the previous partial. */
export const PartialFrame = z.object({
  type: z.literal('partial'),
  seq: Seq,
  text: z.string().max(LIMITS.textMax),
});
export type PartialFrame = z.infer<typeof PartialFrame>;

/** One recognised word with its place on the mic clock. */
export const HeardWord = z
  .object({ word: z.string().min(1).max(64), startMs: Ms, endMs: Ms })
  .refine((w) => w.endMs >= w.startMs, { message: 'A word ends after it starts' });
export type HeardWord = z.infer<typeof HeardWord>;

/** The learner's final turn: the text and word timings for fluency and feedback. */
export const HeardFrame = z.object({
  type: z.literal('heard'),
  seq: Seq,
  /** The learner's turn number in this call: 1, 2, 3… */
  turn: z.int().min(1),
  text: z.string().max(LIMITS.textMax),
  words: z.array(HeardWord).max(LIMITS.wordsMax),
});
export type HeardFrame = z.infer<typeof HeardFrame>;

/** A character starts a generated line; its audio follows on `streamId`. */
export const SayStartFrame = z.object({
  type: z.literal('say_start'),
  seq: Seq,
  streamId: StreamId,
  character: CharacterId,
  codec: TtsCodec,
  sampleRateHz: TtsSampleRateHz,
});
export type SayStartFrame = z.infer<typeof SayStartFrame>;

/**
 * Captions and mouth shapes for a TTS stream: each character with its start and end, from the
 * stream's first sample. The arrays are the same length; frames for one stream arrive in order.
 */
export const AlignmentFrame = z
  .object({
    type: z.literal('alignment'),
    seq: Seq,
    streamId: StreamId,
    chars: z.array(z.string().min(1).max(8)).min(1).max(LIMITS.alignmentCharsMax),
    startMs: z.array(Ms).max(LIMITS.alignmentCharsMax),
    endMs: z.array(Ms).max(LIMITS.alignmentCharsMax),
  })
  .refine((a) => a.startMs.length === a.chars.length && a.endMs.length === a.chars.length, {
    message: 'One start and one end per character',
  })
  .refine((a) => a.startMs.every((start, i) => (a.endMs[i] ?? start) >= start), {
    message: 'A character ends after it starts',
  });
export type AlignmentFrame = z.infer<typeof AlignmentFrame>;

/** The line's audio is all sent; `text` is the whole spoken line. */
export const SayEndFrame = z.object({
  type: z.literal('say_end'),
  seq: Seq,
  streamId: StreamId,
  character: CharacterId,
  text: Text,
});
export type SayEndFrame = z.infer<typeof SayEndFrame>;

/**
 * Play a recorded line from the story (`s1-e1-03`): audio and timing come from the app bundle, or
 * `recordedLineBaseUrl`. The phone answers `played` with the same `streamId`.
 */
export const PlayRecFrame = z.object({
  type: z.literal('play_rec'),
  seq: Seq,
  streamId: StreamId,
  lineId: Id,
  character: CharacterId,
});
export type PlayRecFrame = z.infer<typeof PlayRecFrame>;

/** The scene moved to a beat; `progress` runs 0 to 1 across the scene. */
export const BeatFrame = z.object({
  type: z.literal('beat'),
  seq: Seq,
  beatId: Id,
  progress: z.number().min(0).max(1),
});
export type BeatFrame = z.infer<typeof BeatFrame>;

// --- Say-this cards (beginner path): choices, a model line, a card that stays. ---

/** One card the learner can read aloud, with its gloss (null for `other`). */
export const HintChoice = z.object({ phrase: Phrase, gloss: Phrase.nullable() });
export type HintChoice = z.infer<typeof HintChoice>;

/** At most two cards side by side. */
export const HINT_CHOICES_MAX = 2;

/**
 * A phrase to try, with its gloss in the learner's first language (null for `other`).
 *
 * Optional, left out by older calls (and ignored by older apps):
 * - `choices`: one or two cards to read aloud instead of the single phrase (`phrase` is still the
 *   first card's, for apps that show only one).
 * - `modelLineId`: the recorded line that says the answer, for the card's tap-to-hear.
 * - `persistent`: the card stays up for the whole turn, shown from the start, instead of sliding
 *   away.
 */
export const HintFrame = z.object({
  type: z.literal('hint'),
  seq: Seq,
  phrase: Phrase,
  gloss: Phrase.nullable(),
  choices: z.array(HintChoice).min(1).max(HINT_CHOICES_MAX).optional(),
  modelLineId: Id.optional(),
  persistent: z.boolean().optional(),
});
export type HintFrame = z.infer<typeof HintFrame>;

/**
 * A target error came up: the character asks it back as a question (`prompt`) and waits. The
 * learner's next try resolves it.
 */
export const CorrectionFrame = z.object({
  type: z.literal('correction'),
  seq: Seq,
  targetId: Id,
  /** What the learner said. */
  original: Text,
  /** The character's question back ("He fix it… every day? Or yesterday?"). */
  prompt: Text,
});
export type CorrectionFrame = z.infer<typeof CorrectionFrame>;

/** The learner's second try at a correction: fixed or not (never shown as a failure). */
export const CorrectionResolvedFrame = z.object({
  type: z.literal('correction_resolved'),
  seq: Seq,
  targetId: Id,
  fixed: z.boolean(),
});
export type CorrectionResolvedFrame = z.infer<typeof CorrectionResolvedFrame>;

/**
 * The answer to `meaning_request`: a simple English explanation, shown first, and the gloss in the
 * learner's first language, sent now but shown only on a further tap (null for `other`).
 */
export const MeaningFrame = z.object({
  type: z.literal('meaning'),
  seq: Seq,
  /** The line or phrase explained. */
  about: Text,
  simple: Text,
  gloss: Text.nullable(),
});
export type MeaningFrame = z.infer<typeof MeaningFrame>;

/** Live seconds left; `wrappingUp` from 60 s left, while the character closes the scene kindly. */
export const MinutesFrame = z.object({
  type: z.literal('minutes'),
  seq: Seq,
  secondsLeft: Seconds,
  wrappingUp: z.boolean(),
});
export type MinutesFrame = z.infer<typeof MinutesFrame>;

export const SAFETY_KINDS = ['crisis', 'break_reminder', 'ai_disclosure'] as const;
export const SafetyKind = z.enum(SAFETY_KINDS);
export type SafetyKind = z.infer<typeof SafetyKind>;

/**
 * Out of character. `crisis` ends the scene and opens the safety sheet with the resources for
 * `resourcesKey` (a country's numbers, e.g. `crisis.vn`); the other kinds carry no resources.
 */
export const SafetyFrame = z
  .object({
    type: z.literal('safety'),
    seq: Seq,
    kind: SafetyKind,
    resourcesKey: Id.nullable(),
  })
  .refine((s) => (s.kind === 'crisis') === (s.resourcesKey !== null), {
    message: 'A crisis carries a resources key; nothing else does',
  });
export type SafetyFrame = z.infer<typeof SafetyFrame>;

/** The character is thinking (the head tilt over a wait of 600 ms or more). */
export const ThinkingFrame = z.object({
  type: z.literal('thinking'),
  seq: Seq,
  state: z.enum(['start', 'stop']),
});
export type ThinkingFrame = z.infer<typeof ThinkingFrame>;

/**
 * Something failed. `no_connection` is raised by the phone itself when the socket is gone.
 * `update_required`: the app's protocol is too old. `unknown_scene`: the call asked for a scene
 * this server doesn't have (or can't call). `fatal`: the call ends (an `ended` follows
 * when a call was running).
 */
export const CALL_ERROR_CODES = [
  'no_connection',
  'stt_failed',
  'llm_failed',
  'tts_failed',
  'minutes_exhausted',
  'unauthorized',
  'update_required',
  'unknown_scene',
] as const;
export const CallErrorCode = z.enum(CALL_ERROR_CODES);
export type CallErrorCode = z.infer<typeof CallErrorCode>;

export const ErrorFrame = z.object({
  type: z.literal('error'),
  seq: Seq,
  code: CallErrorCode,
  fatal: z.boolean(),
});
export type ErrorFrame = z.infer<typeof ErrorFrame>;

/**
 * Why a call ended. `idle`: no speech for too long. `replaced`: another socket took the call.
 * `too_hard`: the learner left from the exit sheet's "Khó quá" (`hangup` with that reason).
 */
export const CALL_END_REASONS = [
  'hangup',
  'scene_complete',
  'minutes_exhausted',
  'safety',
  'error',
  'idle',
  'replaced',
  'too_hard',
] as const;
export const CallEndReason = z.enum(CALL_END_REASONS);
export type CallEndReason = z.infer<typeof CallEndReason>;

/** The last frame before the call closes the socket. */
export const EndedFrame = z.object({
  type: z.literal('ended'),
  seq: Seq,
  reason: CallEndReason,
  /** The post-call summary is still being written; poll `GET /api/calls/:id`. */
  summaryPending: z.boolean(),
  callRecordId: OpaqueId,
});
export type EndedFrame = z.infer<typeof EndedFrame>;

export const CALL_SERVER_FRAME_TYPES = [
  'ready',
  'partial',
  'heard',
  'say_start',
  'alignment',
  'say_end',
  'play_rec',
  'beat',
  'hint',
  'correction',
  'correction_resolved',
  'meaning',
  'minutes',
  'safety',
  'thinking',
  'error',
  'ended',
] as const;
export type CallServerFrameType = (typeof CALL_SERVER_FRAME_TYPES)[number];

const callServerFrames = z.discriminatedUnion('type', [
  ReadyFrame,
  PartialFrame,
  HeardFrame,
  SayStartFrame,
  AlignmentFrame,
  SayEndFrame,
  PlayRecFrame,
  BeatFrame,
  HintFrame,
  CorrectionFrame,
  CorrectionResolvedFrame,
  MeaningFrame,
  MinutesFrame,
  SafetyFrame,
  ThinkingFrame,
  ErrorFrame,
  EndedFrame,
]);

/** Any JSON frame the call sends to the phone; an unknown `type` parses as `unknown`. */
export const CallServerFrame = tolerant(callServerFrames, CALL_SERVER_FRAME_TYPES);
export type CallServerFrame = z.infer<typeof CallServerFrame>;
