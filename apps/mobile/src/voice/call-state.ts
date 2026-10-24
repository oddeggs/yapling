import type {
  BeatFrame,
  CallEndReason,
  CallErrorCode,
  CharacterId,
  CorrectionFrame,
  HintFrame,
  MeaningFrame,
  SafetyKind,
  TurnMode,
} from '@yapling/contracts';

/*
 * What the call screen shows, as one immutable state. The phase is derived from a few facts
 * (connected, a line playing, the learner speaking, a reply awaited) so it can't drift.
 */

export const CALL_PHASES = [
  'idle',
  'connecting',
  'character_speaking',
  'your_turn',
  'listening',
  'thinking',
  'ended',
  'error',
] as const;
export type CallPhase = (typeof CALL_PHASES)[number];

/** The line the caption shows: its text so far comes from the lipsync track. */
export interface CaptionLine {
  readonly streamId: number;
  readonly character: CharacterId;
  readonly source: 'live' | 'recorded';
  /** The whole caption known so far (a live line grows as alignment arrives). */
  readonly text: string;
}

export interface LatencySample {
  readonly streamId: number;
  readonly kind: 'recorded' | 'live';
  /** End of the learner's speech → first audible sample of this line. */
  readonly lagMs: number;
}

export type CallNotice = 'didnt_catch' | 'hold_longer' | 'not_heard';

export interface CallState {
  readonly phase: CallPhase;
  readonly turnMode: TurnMode;
  readonly connected: boolean;
  /** The socket dropped and the phone is trying again. */
  readonly reconnecting: boolean;
  readonly sessionId: string | null;
  readonly secondsLeft: number | null;
  readonly wrappingUp: boolean;
  readonly playing: boolean;
  readonly learnerSpeaking: boolean;
  /** Hands-free: the learner has spoken and the call still hears the pause after it. */
  readonly turnOpen: boolean;
  readonly talkHeld: boolean;
  readonly awaitingReply: boolean;
  readonly serverThinking: boolean;
  /** "Chờ chút": turn detection is paused. */
  readonly onHold: boolean;
  /** A phone call or Siri took the audio. */
  readonly interrupted: boolean;
  readonly caption: CaptionLine | null;
  /** The learner's own language under a line, once it was written (a planned moment's). */
  readonly gloss: { readonly streamId: number; readonly text: string } | null;
  /** The learner's words: the partial while speaking, then the final. */
  readonly learnerText: string;
  readonly learnerFinal: boolean;
  readonly beat: BeatFrame | null;
  readonly hint: HintFrame | null;
  readonly correction: CorrectionFrame | null;
  readonly meaning: MeaningFrame | null;
  readonly safety: SafetyKind | null;
  readonly safetyResourcesKey: string | null;
  /** A fatal error: the call is over. */
  readonly error: CallErrorCode | null;
  /** The last non-fatal error (a failed reply the call recovers from). */
  readonly warning: CallErrorCode | null;
  /**
   * Why the learner has the turn back with nothing answered, cleared by the next press or line:
   * - `didnt_catch`: no answer came (the reply failed): the character says it didn't catch that.
   * - `hold_longer`: a tap shorter than a turn, sent nowhere: the tip to hold while talking.
   * - `not_heard`: a hold with no real words in it: the tip to hold and say it again.
   */
  readonly notice: CallNotice | null;
  readonly endReason: CallEndReason | null;
  readonly summaryPending: boolean;
  readonly callRecordId: string | null;
  readonly latency: readonly LatencySample[];
}

export const initialCallState = (turnMode: TurnMode): CallState => ({
  phase: 'idle',
  turnMode,
  connected: false,
  reconnecting: false,
  sessionId: null,
  secondsLeft: null,
  wrappingUp: false,
  playing: false,
  learnerSpeaking: false,
  turnOpen: false,
  talkHeld: false,
  awaitingReply: false,
  serverThinking: false,
  onHold: false,
  interrupted: false,
  caption: null,
  gloss: null,
  learnerText: '',
  learnerFinal: false,
  beat: null,
  hint: null,
  correction: null,
  meaning: null,
  safety: null,
  safetyResourcesKey: null,
  error: null,
  warning: null,
  notice: null,
  endReason: null,
  summaryPending: false,
  callRecordId: null,
  latency: [],
});

/** The phase from the facts. Terminal phases stick. */
export function phaseOf(s: Omit<CallState, 'phase'> & { readonly phase?: CallPhase }): CallPhase {
  if (s.endReason !== null) return 'ended';
  if (s.error !== null) return 'error';
  if (!s.connected) return s.phase === 'idle' ? 'idle' : 'connecting';
  if (s.playing) return 'character_speaking';
  // Hold-to-talk listens only while the button is held: talking without holding sends nothing.
  // Hands-free listens through the pause after speech too, until the call answers or it ends.
  const handsFree = s.turnMode === 'hands_free' && (s.learnerSpeaking || s.turnOpen);
  if (s.talkHeld || handsFree) return 'listening';
  if (s.serverThinking || s.awaitingReply) return 'thinking';
  return 'your_turn';
}

/** Applies a change and re-derives the phase. */
export function update(state: CallState, patch: Partial<CallState>): CallState {
  if (state.phase === 'ended' && patch.phase !== 'idle') return state;
  const next = { ...state, ...patch };
  return { ...next, phase: patch.phase === 'idle' ? 'idle' : phaseOf(next) };
}

/** Keeps the last few latency samples for the screen and the dev lab. */
export function withLatency(state: CallState, sample: LatencySample, keep = 20): CallState {
  return { ...state, latency: [...state.latency, sample].slice(-keep) };
}
