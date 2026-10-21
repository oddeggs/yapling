import { z } from 'zod';

import {
  CallKind,
  ClientVersion,
  FirstLanguage,
  Id,
  LIMITS,
  Ms,
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
  /** The session token from `POST /v1/session/*`. */
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

/** The learner ended the call. The call answers `ended` and closes. */
export const HangupFrame = z.object({ type: z.literal('hangup'), seq: Seq });
export type HangupFrame = z.infer<typeof HangupFrame>;

export const CALL_CLIENT_FRAME_TYPES = [
  'hello',
  'end_turn',
  'hold',
  'hint_request',
  'meaning_request',
  'played',
  'hangup',
] as const;
export type CallClientFrameType = (typeof CALL_CLIENT_FRAME_TYPES)[number];

const callClientFrames = z.discriminatedUnion('type', [
  HelloFrame,
  EndTurnFrame,
  HoldFrame,
  HintRequestFrame,
  MeaningRequestFrame,
  PlayedFrame,
  HangupFrame,
]);

/** Any JSON frame the phone sends to the call; an unknown `type` parses as `unknown`. */
export const CallClientFrame = tolerant(callClientFrames, CALL_CLIENT_FRAME_TYPES);
export type CallClientFrame = z.infer<typeof CallClientFrame>;
