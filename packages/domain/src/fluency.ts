import type { CallMetrics, HeardWord } from '@yapling/contracts';

/*
 * The fluency mirror: Flow, Pace and Pauses, measured from the word timings of the learner's heard
 * turns (milliseconds on the call's mic clock). Only the learner's own speech counts: the time
 * before a turn starts and between turns (while a character talks) is never part of it.
 *
 * Definitions:
 *
 * - A turn's speaking time runs from its first word's start to its last word's end.
 * - A run is a stretch of words with no gap of 1 s or more between one word's end and the next
 *   word's start. A run's length is its first word's start to its last word's end.
 * - Flow (seconds): the longest run in the call. "48 s without stopping."
 * - Pace (words per minute): all words divided by all speaking time.
 * - Pauses (per minute): gaps of 0.7 s or more inside a sentence (the word before the gap doesn't
 *   end with . ? ! or …), divided by all speaking time.
 *
 * Shown as trends only, never as a level: these numbers can't separate adjacent levels.
 */

/** A gap this long or longer ends a run (Flow). */
export const RUN_BREAK_MS = 1_000;
/** A gap this long or longer inside a sentence is a pause (Pauses). */
export const PAUSE_MS = 700;

/** The contract's ranges for the metrics. */
const PACE_MAX = 400;
const PAUSES_MAX = 120;
const FLOW_MAX = 3_600;

const SENTENCE_END = /[.?!…]["'”’)]*$/;

export interface FluencyDetail extends CallMetrics {
  /** The mean run length in seconds (the research's "mean length of run"). */
  readonly meanRunSeconds: number;
  readonly speakingSeconds: number;
  readonly words: number;
  readonly pauses: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Flow, Pace and Pauses for a call, from its heard turns. Empty speech gives zeros. */
export const fluencyDetail = (turns: readonly (readonly HeardWord[])[]): FluencyDetail => {
  let speakingMs = 0;
  let words = 0;
  let pauses = 0;
  const runs: number[] = [];
  for (const turn of turns) {
    const sorted = [...turn].sort((a, b) => a.startMs - b.startMs);
    const first = sorted[0];
    if (first === undefined) continue;
    let runStart = first.startMs;
    let end = first.endMs;
    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1];
      const word = sorted[i];
      if (previous === undefined || word === undefined) continue;
      const gap = word.startMs - end;
      if (gap >= PAUSE_MS && !SENTENCE_END.test(previous.word)) pauses++;
      if (gap >= RUN_BREAK_MS) {
        runs.push(end - runStart);
        runStart = word.startMs;
      }
      end = Math.max(end, word.endMs);
    }
    runs.push(end - runStart);
    speakingMs += end - first.startMs;
    words += sorted.length;
  }
  const minutes = speakingMs / 60_000;
  const flowSeconds = runs.length > 0 ? Math.max(...runs) / 1_000 : 0;
  const meanRunSeconds =
    runs.length > 0 ? runs.reduce((a, b) => a + b, 0) / runs.length / 1_000 : 0;
  return {
    flowSeconds: Math.min(FLOW_MAX, round1(flowSeconds)),
    paceWpm: minutes > 0 ? Math.min(PACE_MAX, Math.round(words / minutes)) : 0,
    pausesPerMin: minutes > 0 ? Math.min(PAUSES_MAX, round1(pauses / minutes)) : 0,
    meanRunSeconds: round1(meanRunSeconds),
    speakingSeconds: round1(speakingMs / 1_000),
    words,
    pauses,
  };
};

/** The metrics as the post-call summary carries them. */
export const fluencyMetrics = (turns: readonly (readonly HeardWord[])[]): CallMetrics => {
  const { flowSeconds, paceWpm, pausesPerMin } = fluencyDetail(turns);
  return { flowSeconds, paceWpm, pausesPerMin };
};

export type TrendDirection = 'better' | 'same' | 'worse';

export interface MetricTrend {
  readonly from: number;
  readonly to: number;
  /** Whole percent change from `from` (null when `from` is zero). */
  readonly changePercent: number | null;
  readonly direction: TrendDirection;
}

const trendOf = (from: number, to: number, higherIsBetter: boolean): MetricTrend => {
  const changePercent = from === 0 ? null : Math.round(((to - from) / from) * 100);
  const delta = higherIsBetter ? to - from : from - to;
  return {
    from,
    to,
    changePercent,
    direction: delta > 0 ? 'better' : delta < 0 ? 'worse' : 'same',
  };
};

/**
 * How the learner changed between two calls ("48 s, up from 20 s"; "half as many pauses"). Longer
 * Flow and quicker Pace are better; fewer Pauses are better.
 */
export const fluencyTrend = (
  baseline: CallMetrics,
  latest: CallMetrics,
): { readonly flow: MetricTrend; readonly pace: MetricTrend; readonly pauses: MetricTrend } => ({
  flow: trendOf(baseline.flowSeconds, latest.flowSeconds, true),
  pace: trendOf(baseline.paceWpm, latest.paceWpm, true),
  pauses: trendOf(baseline.pausesPerMin, latest.pausesPerMin, false),
});
