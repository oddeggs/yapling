import type { LineResult, LineTimings } from './line';

/*
 * One structured log line per learner turn (and one per generated line the narration guard
 * touched), for the Workers Logs dashboard: what the turn was judged and by whom, what the guard
 * did, and where the time went. No learner words are logged.
 */

/** Who judged a turn, and how Jev's case met the line's. */
export interface JudgeLog {
  /** `jev` when Jev's outcome was applied (or it asked for the replay), else the line's own. */
  readonly by: 'jev' | 'haiku';
  /** `late`: Jev answered after the line reached the phone; `failed`: no answer (see its warning). */
  readonly status: 'pending' | 'answered' | 'failed' | 'late';
  /** Request to answer or failure, in ms. */
  readonly ms: number | null;
  /** Jev's outcome, even a late one. */
  readonly outcome: string | null;
  /** The case the first line was written for (its leading tag). */
  readonly lineCase: string | null;
  /** Same runner event from both; null when not compared. */
  readonly agree: boolean | null;
  /** The line written for Jev's case was voiced instead of the first. */
  readonly switched: boolean;
  /** They asked to hear the last line again (`repeat`) or slower: it was said again. */
  readonly replay: 'repeat' | 'slower' | null;
}

export interface TurnLog {
  readonly callId: string;
  readonly turn: number;
  readonly beatId: string | null;
  readonly outcome: string | null;
  /** The runner event the outcome was applied as. */
  readonly applied: string | null;
  /** English attempt, Vietnamese or noise, by `speechKind`. */
  readonly speech: string;
  readonly judge: JudgeLog;
  /** The spoken line, or null when none was (a crisis seen before any reply). */
  readonly result: LineResult | null;
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
    speech: t.speech,
    judge: t.judge,
    guard: result?.guard?.action ?? null,
    guardDropped: result?.guard?.dropped ?? null,
    failed: result?.failed ?? null,
    words: !result?.text ? 0 : result.text.split(' ').length,
    audioMs: result?.audioMs ?? 0,
    ms: {
      judge: t.judge.ms,
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
