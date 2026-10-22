import { PRICES, tokenUsd, type Samples } from '../call/costs';
import type { Usage } from '../call/llm';

/*
 * Each call's cost record (`call_costs`): what the providers were used for, the estimated dollars
 * at list prices (`tech-decisions.md` §3: speech-to-text $0.39 an audio hour, text-to-speech $0.04
 * per 1,000 characters, Claude Haiku per token; Jev, the turn judge, per input token; the post-call
 * summary on Sonnet), and how fast the
 * call answered (end of learner speech → first reply audio, per turn, with P50 and P90).
 */

/** What the call record knows when the call ends. */
export interface CostInputs {
  readonly callId: string;
  readonly userId: string;
  readonly kind: string;
  readonly sceneId: string;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly endReason: string;
  readonly learnerSeconds: number;
  readonly characterSeconds: number;
  readonly sttSeconds: number;
  readonly ttsChars: number;
  readonly llm: Usage;
  /** Jev's input tokens (its output is free); 0 for a call before the turn judge. */
  readonly jevInputTokens?: number;
  /** Per-stage latency samples; missing from a call object older than the cost record. */
  readonly samples: Pick<Samples, 'replyOut' | 'phoneLag'> | null;
}

export interface CostRecord {
  readonly callId: string;
  readonly userId: string;
  readonly kind: string;
  readonly sceneId: string;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly endReason: string;
  readonly learnerSeconds: number;
  readonly characterSeconds: number;
  readonly turns: number;
  readonly sttSeconds: number;
  readonly ttsChars: number;
  readonly llm: Usage;
  readonly jevInputTokens: number;
  readonly usd: {
    readonly stt: number;
    readonly tts: number;
    readonly llm: number;
    /** Jev, the turn judge. */
    readonly judge: number;
    readonly summary: number;
    readonly total: number;
  };
  readonly replyMs: readonly number[];
  readonly replyP50Ms: number | null;
  readonly replyP90Ms: number | null;
  readonly phoneMs: readonly number[];
}

const num = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** The provider usage in a call record's `cost` (`callCost`); zeros for anything missing. */
export function usageOf(cost: unknown): {
  sttSeconds: number;
  ttsChars: number;
  llm: Usage;
  jevInputTokens: number;
} {
  const c = (typeof cost === 'object' && cost !== null ? cost : {}) as Record<string, unknown>;
  const llm = (typeof c['llm'] === 'object' && c['llm'] !== null ? c['llm'] : {}) as Record<
    string,
    unknown
  >;
  return {
    sttSeconds: num(c['sttSeconds']),
    ttsChars: num(c['ttsChars']),
    llm: {
      input: num(llm['input']),
      cacheRead: num(llm['cacheRead']),
      cacheWrite: num(llm['cacheWrite']),
      output: num(llm['output']),
    },
    jevInputTokens: num(c['jevInputTokens']),
  };
}

/** Dollars kept to a hundredth of a cent's hundredth, as the call record keeps them. */
export const roundUsd = (usd: number) => Math.round(usd * 100_000) / 100_000;

/** The nearest-rank percentile (`p` in 0–100) of some samples; null for none. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return Math.round(sorted[rank - 1] ?? 0);
}

const sttUsd = (seconds: number) => (seconds / 3_600) * PRICES.sttPerHour;
const ttsUsd = (chars: number) => (chars / 1_000) * PRICES.ttsPerThousandChars;
const judgeUsd = (tokens: number) => (tokens / 1_000_000) * PRICES.jevInputPerMillion;

export function costRecordOf(call: CostInputs, summaryUsd = 0): CostRecord {
  const replyMs = (call.samples?.replyOut ?? []).map(Math.round);
  const stt = roundUsd(sttUsd(call.sttSeconds));
  const tts = roundUsd(ttsUsd(call.ttsChars));
  const llm = roundUsd(tokenUsd(call.llm, PRICES.haiku));
  const jevInputTokens = call.jevInputTokens ?? 0;
  const judge = roundUsd(judgeUsd(jevInputTokens));
  return {
    callId: call.callId,
    userId: call.userId,
    kind: call.kind,
    sceneId: call.sceneId,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
    endReason: call.endReason,
    learnerSeconds: call.learnerSeconds,
    characterSeconds: call.characterSeconds,
    turns: replyMs.length,
    sttSeconds: Math.round(call.sttSeconds * 10) / 10,
    ttsChars: call.ttsChars,
    llm: call.llm,
    jevInputTokens,
    usd: {
      stt,
      tts,
      llm,
      judge,
      summary: summaryUsd,
      total: roundUsd(stt + tts + llm + judge + summaryUsd),
    },
    replyMs,
    replyP50Ms: percentile(replyMs, 50),
    replyP90Ms: percentile(replyMs, 90),
    phoneMs: (call.samples?.phoneLag ?? []).map(Math.round),
  };
}

export async function insertCallCost(db: D1Database, record: CostRecord): Promise<void> {
  await db
    .prepare(
      `INSERT INTO call_costs (call_id, user_id, kind, scene_id, started_at, ended_at, end_reason,
         learner_seconds, character_seconds, turns, stt_seconds, tts_chars, llm_input_tokens,
         llm_cache_read_tokens, llm_cache_write_tokens, llm_output_tokens, stt_usd, tts_usd,
         llm_usd, summary_usd, reply_ms, reply_p50_ms, reply_p90_ms, phone_ms,
         judge_input_tokens, judge_usd)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18,
         ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26)
       ON CONFLICT (call_id) DO NOTHING`,
    )
    .bind(
      record.callId,
      record.userId,
      record.kind,
      record.sceneId,
      record.startedAt,
      record.endedAt,
      record.endReason,
      record.learnerSeconds,
      record.characterSeconds,
      record.turns,
      record.sttSeconds,
      record.ttsChars,
      record.llm.input,
      record.llm.cacheRead,
      record.llm.cacheWrite,
      record.llm.output,
      record.usd.stt,
      record.usd.tts,
      record.usd.llm,
      record.usd.summary,
      JSON.stringify(record.replyMs),
      record.replyP50Ms,
      record.replyP90Ms,
      JSON.stringify(record.phoneMs),
      record.jevInputTokens,
      record.usd.judge,
    )
    .run();
}

/** The post-call summary's cost, once it is written. */
export async function addSummaryCost(
  db: D1Database,
  userId: string,
  callId: string,
  usd: number,
): Promise<void> {
  await db
    .prepare('UPDATE call_costs SET summary_usd = ?3 WHERE call_id = ?1 AND user_id = ?2')
    .bind(callId, userId, roundUsd(usd))
    .run();
}

interface CostRow {
  call_id: string;
  user_id: string;
  kind: string;
  scene_id: string;
  started_at: number;
  ended_at: number;
  end_reason: string;
  learner_seconds: number;
  character_seconds: number;
  turns: number;
  stt_seconds: number;
  tts_chars: number;
  llm_input_tokens: number;
  llm_cache_read_tokens: number;
  llm_cache_write_tokens: number;
  llm_output_tokens: number;
  stt_usd: number;
  tts_usd: number;
  llm_usd: number;
  summary_usd: number;
  reply_ms: string;
  reply_p50_ms: number | null;
  reply_p90_ms: number | null;
  phone_ms: string;
  judge_input_tokens: number;
  judge_usd: number;
}

const numbers = (raw: string): number[] => {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
};

const recordOfRow = (row: CostRow): CostRecord => ({
  callId: row.call_id,
  userId: row.user_id,
  kind: row.kind,
  sceneId: row.scene_id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  endReason: row.end_reason,
  learnerSeconds: row.learner_seconds,
  characterSeconds: row.character_seconds,
  turns: row.turns,
  sttSeconds: row.stt_seconds,
  ttsChars: row.tts_chars,
  llm: {
    input: row.llm_input_tokens,
    cacheRead: row.llm_cache_read_tokens,
    cacheWrite: row.llm_cache_write_tokens,
    output: row.llm_output_tokens,
  },
  jevInputTokens: row.judge_input_tokens,
  usd: {
    stt: row.stt_usd,
    tts: row.tts_usd,
    llm: row.llm_usd,
    judge: row.judge_usd,
    summary: row.summary_usd,
    total: roundUsd(row.stt_usd + row.tts_usd + row.llm_usd + row.judge_usd + row.summary_usd),
  },
  replyMs: numbers(row.reply_ms),
  replyP50Ms: row.reply_p50_ms,
  replyP90Ms: row.reply_p90_ms,
  phoneMs: numbers(row.phone_ms),
});

/** A learner's most recent calls' cost records, newest first. */
export async function listCallCosts(
  db: D1Database,
  userId: string,
  limit: number,
): Promise<CostRecord[]> {
  const { results } = await db
    .prepare(
      'SELECT * FROM call_costs WHERE user_id = ? ORDER BY started_at DESC, rowid DESC LIMIT ?',
    )
    .bind(userId, limit)
    .all<CostRow>();
  return results.map(recordOfRow);
}

export interface CostTotals {
  readonly calls: number;
  /** Wall-clock minutes of the calls. */
  readonly minutes: number;
  readonly learnerMinutes: number;
  readonly usd: number;
  /** Dollars per wall-clock minute; null without minutes. */
  readonly usdPerMinute: number | null;
  readonly turns: number;
  /** Over every turn of these calls. */
  readonly replyP50Ms: number | null;
  readonly replyP90Ms: number | null;
  readonly phoneP50Ms: number | null;
  readonly phoneP90Ms: number | null;
}

export function totalsOf(records: readonly CostRecord[]): CostTotals {
  const seconds = records.reduce((s, r) => s + Math.max(0, r.endedAt - r.startedAt) / 1_000, 0);
  const usd = roundUsd(records.reduce((s, r) => s + r.usd.total, 0));
  const reply = records.flatMap((r) => r.replyMs);
  const phone = records.flatMap((r) => r.phoneMs);
  const minutes = Math.round((seconds / 60) * 10) / 10;
  return {
    calls: records.length,
    minutes,
    learnerMinutes: Math.round((records.reduce((s, r) => s + r.learnerSeconds, 0) / 60) * 10) / 10,
    usd,
    usdPerMinute: seconds > 0 ? roundUsd(usd / (seconds / 60)) : null,
    turns: reply.length,
    replyP50Ms: percentile(reply, 50),
    replyP90Ms: percentile(reply, 90),
    phoneP50Ms: percentile(phone, 50),
    phoneP90Ms: percentile(phone, 90),
  };
}
