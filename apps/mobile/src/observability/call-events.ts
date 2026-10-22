import type { CallEndReason, CallErrorCode, TurnMode } from '@yapling/contracts';

import type { CallProblem } from './events';

/*
 * What a call's analytics hear, from the call screen's state as it changes: the call answering,
 * each problem the learner meets (as they see it), and the end. Pure, so each transition is tested.
 */

/** A live reply later than this (the P90 budget, end of speech → first reply audio) is slow. */
export const SLOW_REPLY_MS = 2_200;

/** The parts of the call screen's state the analytics read. */
export interface CallSnapshot {
  /** The screen's mode: `ringing`, `live`, or an error sheet (`error_net`, `error_mic`). */
  readonly mode: string;
  readonly connected: boolean;
  readonly error: CallErrorCode | null;
  readonly warning: CallErrorCode | null;
  readonly endReason: CallEndReason | null;
  readonly learnerFinal: boolean;
  readonly learnerText: string;
  /** Hold to talk or hands-free; left out when the screen doesn't say. */
  readonly turnMode?: TurnMode;
  /** Lag samples, oldest first; only the last few are kept. */
  readonly latency: readonly {
    readonly streamId: number;
    readonly kind: 'recorded' | 'live';
    readonly lagMs: number;
  }[];
}

export type CallAnalyticsEvent =
  | { readonly type: 'started' }
  | { readonly type: 'problem'; readonly problem: CallProblem; readonly code: string | null }
  | { readonly type: 'turn_mode'; readonly to: TurnMode }
  | { readonly type: 'ended'; readonly reason: CallEndReason };

const newSamples = (prev: CallSnapshot | null, next: CallSnapshot) => {
  const seen = new Set(prev?.latency.map((s) => s.streamId) ?? []);
  return next.latency.filter((s) => !seen.has(s.streamId));
};

/** The events between two states of one call (`prev` is null for the first). */
export function callEventsBetween(
  prev: CallSnapshot | null,
  next: CallSnapshot,
  started: boolean,
): CallAnalyticsEvent[] {
  const events: CallAnalyticsEvent[] = [];
  if (!started && next.connected) events.push({ type: 'started' });
  if (next.mode === 'error_net' && prev?.mode !== 'error_net') {
    events.push({ type: 'problem', problem: 'no_connection', code: next.error });
  }
  if (next.mode === 'error_mic' && prev?.mode !== 'error_mic') {
    events.push({ type: 'problem', problem: 'mic_denied', code: null });
  }
  const heardNow = next.learnerFinal && !(prev?.learnerFinal ?? false);
  if (heardNow && next.learnerText.trim() === '') {
    events.push({ type: 'problem', problem: 'not_heard', code: null });
  }
  for (const sample of newSamples(prev, next)) {
    if (sample.kind === 'live' && sample.lagMs > SLOW_REPLY_MS) {
      events.push({ type: 'problem', problem: 'slow_reply', code: String(sample.lagMs) });
    }
  }
  if (next.warning !== null && next.warning !== prev?.warning) {
    events.push({ type: 'problem', problem: 'reply_failed', code: next.warning });
  }
  const switched =
    started && prev?.turnMode !== undefined && next.turnMode !== undefined
      ? prev.turnMode !== next.turnMode
      : false;
  if (switched && next.turnMode !== undefined)
    events.push({ type: 'turn_mode', to: next.turnMode });
  if (next.endReason !== null && (prev?.endReason ?? null) === null) {
    events.push({ type: 'ended', reason: next.endReason });
  }
  return events;
}
