import type { LineResult, LineTimings } from './line';

/*
 * One structured log line per learner turn (and one per generated line the narration guard
 * touched), for the Workers Logs dashboard: what the turn was judged, what the guard did, and
 * where the time went. No learner words are logged.
 */

export interface TurnLog {
  readonly callId: string;
  readonly turn: number;
  readonly beatId: string | null;
  readonly outcome: string | null;
  /** The runner event the outcome was applied as. */
  readonly applied: string | null;
  readonly result: LineResult;
  readonly timings: LineTimings;
  /** End of the learner's speech, or 0 for hold-to-talk without one. */
  readonly speechEndAt: number;
}

const since = (from: number | undefined, to: number | undefined): number | null =>
  from !== undefined && to !== undefined && from > 0 ? to - from : null;

export function logTurn(t: TurnLog): void {
  const { timings: s, result } = t;
  console.log({
    msg: 'call turn',
    callId: t.callId,
    turn: t.turn,
    beatId: t.beatId,
    outcome: t.outcome,
    applied: t.applied,
    guard: result.guard?.action ?? null,
    guardDropped: result.guard?.dropped ?? null,
    failed: result.failed,
    words: result.text === '' ? 0 : result.text.split(' ').length,
    audioMs: result.audioMs,
    ms: {
      llmFirstToken: since(s.start, s.llmFirstToken),
      ttsFirstAudio: since(s.ttsFirstText, s.ttsFirstAudio),
      firstAudioOut: since(s.start, s.firstAudioOut),
      speechEndToAudio: since(t.speechEndAt, s.firstAudioOut),
      total: since(s.start, s.done),
    },
  });
}

/** A generated line the runner asked for, logged when the narration guard changed it. */
export function logGuardedLine(callId: string, beatId: string | null, result: LineResult): void {
  if (result.guard === null) return;
  console.log({
    msg: 'call line guarded',
    callId,
    beatId,
    guard: result.guard.action,
    guardDropped: result.guard.dropped,
    spoken: result.text.slice(0, 200),
  });
}
