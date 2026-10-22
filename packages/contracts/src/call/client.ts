import { z } from 'zod';

import {
  CallKind,
  ClientVersion,
  FirstLanguage,
  Id,
  LIMITS,
  Ms,
  Pace,
  Phrase,
  Stage,
  Token,
} from '../primitives';
import { Seq, tolerant } from './common';

/*
 * Frames the phone sends to the call. Mic audio is not here: it goes up as binary `mic_pcm16`
 * frames (see `audio.ts`) that share this sender's `seq` counter.
 */

/** How the learner's turns end: holding the mic button, or the call's patient turn detection. */
export const TURN_MODES = ['hold_to_talk', 'hands_free'] as const;
export const TurnMode = z.enum(TURN_MODES);
export type TurnMode = z.infer<typeof TurnMode>;

/** Say hello once, first. */
export const HelloFrame = z.object({
  type: z.literal('hello'),
  seq: Seq,
  /** `PROTOCOL_VERSION` of the app's contracts. */
  protocol: z.int().min(1),
  /** The session token from `POST /api/session/*`. */
  token: Token,
  kind: CallKind,
  /** The scene to run (`s1-e1`, `placement`, a practice or voicemail id). */
  sceneId: Id,
  stage: Stage,
  firstLanguage: FirstLanguage,
  clientVersion: ClientVersion,
  turnMode: TurnMode,
  /** From the last `ready` of a dropped call, to resume its beat; null for a new call. */
  resumeToken: Token.nullable(),
  /** The pace from the learner's profile; left out or null for the stage's own. */
  pace: Pace.nullable().optional(),
});
export type HelloFrame = z.infer<typeof HelloFrame>;

/** Hold-to-talk: the learner let go of the mic. Ignored in hands-free. */
export const EndTurnFrame = z.object({ type: z.literal('end_turn'), seq: Seq });
export type EndTurnFrame = z.infer<typeof EndTurnFrame>;

/**
 * "Chờ chút" (give me a second): pause turn detection for `seconds` (10 by default in the app).
 * `0` resumes it at once. Speaking again also ends the hold.
 */
export const HoldFrame = z.object({
  type: z.literal('hold'),
  seq: Seq,
  seconds: z.int().min(0).max(LIMITS.holdSecondsMax),
});
export type HoldFrame = z.infer<typeof HoldFrame>;

/** The learner asked for a hint; the call answers `hint`. */
export const HintRequestFrame = z.object({ type: z.literal('hint_request'), seq: Seq });
export type HintRequestFrame = z.infer<typeof HintRequestFrame>;

/** What a meaning request is about: the character's last line, or a phrase the learner tapped. */
export const MeaningSubject = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('last_line') }),
  z.object({ kind: z.literal('phrase'), text: Phrase }),
]);
export type MeaningSubject = z.infer<typeof MeaningSubject>;

/** The "What does that mean?" chip; the call answers `meaning`. */
export const MeaningRequestFrame = z.object({
  type: z.literal('meaning_request'),
  seq: Seq,
  subject: MeaningSubject,
});
export type MeaningRequestFrame = z.infer<typeof MeaningRequestFrame>;

/**
 * A character line finished playing on the phone: a TTS stream after its last chunk, or a
 * recorded line. The call starts listening for the learner's turn from here, and uses `lagMs`
 * (end of the learner's speech → first character audio, measured on the phone) for the latency
 * budget. `interrupted`: the learner hung up or barged in before the end.
 */
export const PlayedFrame = z.object({
  type: z.literal('played'),
  seq: Seq,
  streamId: z.int().min(1),
  interrupted: z.boolean(),
  lagMs: Ms.nullable(),
});
export type PlayedFrame = z.infer<typeof PlayedFrame>;

/**
 * The phone's own voice activity detection (on the echo-cancelled mic): the learner started or
 * stopped speaking at `atMs` on the call's mic clock (milliseconds of mic audio sent on this
 * socket). When the phone sends these, the call times its turns by them; without them it falls
 * back to its own energy gate.
 */
export const SpeechFrame = z.object({
  type: z.literal('speech'),
  seq: Seq,
  state: z.enum(['start', 'end']),
  atMs: Ms,
});
export type SpeechFrame = z.infer<typeof SpeechFrame>;

/** Why the learner hung up, when the exit sheet says: `too_hard` is its "Khó quá". */
export const HANGUP_REASONS = ['too_hard'] as const;
export const HangupReason = z.enum(HANGUP_REASONS);
export type HangupReason = z.infer<typeof HangupReason>;

/**
 * The learner ended the call. The call answers `ended` and closes. `reason` is left out for a
 * plain hang-up (and by older apps); `too_hard` ends the call with that end reason.
 */
export const HangupFrame = z.object({
  type: z.literal('hangup'),
  seq: Seq,
  reason: HangupReason.optional(),
});
export type HangupFrame = z.infer<typeof HangupFrame>;

// --- Again and slowly (beginner path): replay the last line, change the pace mid-call. ---

/**
 * "Nói lại" / "Chậm thôi" (or "Sorry? Again, please" / "Slowly, please" said aloud, which the call
 * detects itself): the character says the last line again, one speed step slower with longer
 * breaks when `slower`. Never counts as a try. An older call ignores it.
 */
export const ReplayFrame = z.object({ type: z.literal('replay'), seq: Seq, slower: z.boolean() });
export type ReplayFrame = z.infer<typeof ReplayFrame>;

/**
 * The learner changed the pace during the call ("Khó quá" → slower): it applies from the next
 * line. Null goes back to the stage's own. An older call ignores it.
 */
export const PaceFrame = z.object({ type: z.literal('pace'), seq: Seq, pace: Pace.nullable() });
export type PaceFrame = z.infer<typeof PaceFrame>;

export const CALL_CLIENT_FRAME_TYPES = [
  'hello',
  'end_turn',
  'hold',
  'hint_request',
  'meaning_request',
  'played',
  'speech',
  'hangup',
  'replay',
  'pace',
] as const;
export type CallClientFrameType = (typeof CALL_CLIENT_FRAME_TYPES)[number];

const callClientFrames = z.discriminatedUnion('type', [
  HelloFrame,
  EndTurnFrame,
  HoldFrame,
  HintRequestFrame,
  MeaningRequestFrame,
  PlayedFrame,
  SpeechFrame,
  HangupFrame,
  ReplayFrame,
  PaceFrame,
]);

/** Any JSON frame the phone sends to the call; an unknown `type` parses as `unknown`. */
export const CallClientFrame = tolerant(callClientFrames, CALL_CLIENT_FRAME_TYPES);
export type CallClientFrame = z.infer<typeof CallClientFrame>;
