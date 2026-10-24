import type { Usage } from './llm';

/*
 * What a call cost, from public list prices (October 2026, as in the voice spike report): Scribe
 * v2 Realtime $0.39 an audio hour; Flash TTS $0.04 per 1,000 characters; Claude Haiku 5.5 $0.10 per
 * million input tokens, $0.01 cache reads, $0.125 cache writes, $0.50 output. Hedged turns pay
 * for the losing request's input too, which the counts include. Jev, the turn judge, $0.042 per
 * million input tokens, output free (the turn judge spike report).
 */

export const PRICES = {
  sttPerHour: 0.39,
  ttsPerThousandChars: 0.04,
  haiku: { input: 0.1, cacheRead: 0.01, cacheWrite: 0.125, output: 0.5 },
  sonnet: { input: 2, cacheRead: 0.2, cacheWrite: 2.5, output: 10 },
  jevInputPerMillion: 0.042,
} as const;

export interface CallCost {
  readonly sttSeconds: number;
  readonly ttsChars: number;
  readonly llm: Usage;
  /** Jev's input tokens (the turn judge); its output is free. */
  readonly jevInputTokens: number;
  readonly usd: number;
}

const perMillion = (tokens: number, price: number) => (tokens / 1_000_000) * price;

export function tokenUsd(usage: Usage, prices: typeof PRICES.haiku | typeof PRICES.sonnet): number {
  return (
    perMillion(usage.input, prices.input) +
    perMillion(usage.cacheRead, prices.cacheRead) +
    perMillion(usage.cacheWrite, prices.cacheWrite) +
    perMillion(usage.output, prices.output)
  );
}

export function callCost(
  sttSeconds: number,
  ttsChars: number,
  llm: Usage,
  jevInputTokens = 0,
  prices: typeof PRICES.haiku | typeof PRICES.sonnet = PRICES.haiku,
): CallCost {
  const usd =
    (sttSeconds / 3_600) * PRICES.sttPerHour +
    (ttsChars / 1_000) * PRICES.ttsPerThousandChars +
    tokenUsd(llm, prices) +
    perMillion(jevInputTokens, PRICES.jevInputPerMillion);
  return {
    sttSeconds: Math.round(sttSeconds * 10) / 10,
    ttsChars,
    llm,
    jevInputTokens,
    usd: Math.round(usd * 100_000) / 100_000,
  };
}

/** Per-stage latency samples (ms) and their medians. */
export const STAGES = [
  // End of learner speech → segment committed (the speculative wait).
  'endpoint',
  // Commit → final transcript from Scribe.
  'sttFinal',
  // Model request → first token.
  'llmFirstToken',
  // First text to TTS → first audio.
  'ttsFirstAudio',
  // End of learner speech → first reply audio sent (call clock).
  'replyOut',
  // End of learner speech → first character audio heard (the reaction, else the reply), measured
  // on the phone.
  'phoneLag',
  // End of learner speech → the recorded reaction heard, measured on the phone.
  'phoneReaction',
  // End of learner speech → the generated reply's first audio heard, measured on the phone.
  'phoneReply',
  // Turn judge request → Jev's answer (answered requests only).
  'judge',
  // A card turn: end of learner speech → the turn decided by its words (no model), call clock.
  'cardOut',
] as const;
export type Stage = (typeof STAGES)[number];

export type Samples = Record<Stage, number[]>;

export const noSamples = (): Samples =>
  Object.fromEntries(STAGES.map((s) => [s, []])) as unknown as Samples;

/** Adds a sample (a call object saved before a stage existed has no list for it yet). */
export function addSample(samples: Samples, stage: Stage, ms: number): void {
  (samples[stage] ??= []).push(Math.round(ms));
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const value =
    sorted.length % 2 === 1 ? sorted[mid] : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  return Math.round(value ?? 0);
}

export function medians(samples: Samples): Record<Stage, number | null> & { turns: number } {
  const out = Object.fromEntries(STAGES.map((s) => [s, median(samples[s] ?? [])])) as Record<
    Stage,
    number | null
  >;
  return { ...out, turns: samples.replyOut.length };
}
