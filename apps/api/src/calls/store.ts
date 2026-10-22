import {
  CallRecord,
  CallSummary,
  LIMITS,
  type CallEndReason,
  type CallKind,
  type CharacterId,
} from '@yapling/contracts';

import type { Samples } from '../call/costs';
import { costRecordOf, insertCallCost, usageOf, addSummaryCost } from './costs';

/** Reads and writes on `calls`, always within one learner's calls. */

export interface CallRow {
  id: string;
  user_id: string;
  kind: string;
  scene_id: string;
  character: string;
  stage: string;
  started_at: number;
  ended_at: number;
  learner_seconds: number;
  character_seconds: number;
  end_reason: string;
  summary_pending: number;
  summary: string | null;
  scene_state: string | null;
  safety_flag: string | null;
  cost: string;
  timings: string;
  transcript_key: string;
}

export interface NewCall {
  readonly id: string;
  readonly userId: string;
  readonly kind: CallKind;
  readonly sceneId: string;
  readonly character: CharacterId;
  readonly stage: string;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly learnerSeconds: number;
  readonly characterSeconds: number;
  readonly endReason: CallEndReason;
  readonly summaryPending: boolean;
  readonly sceneState: unknown;
  readonly safetyFlag: string | null;
  /** Provider usage and the estimated cost (`callCost`). */
  readonly cost: unknown;
  readonly timings: unknown;
  readonly transcriptKey: string;
  /** Per-stage latency samples, for the cost record's percentiles. */
  readonly samples?: Pick<Samples, 'replyOut' | 'phoneLag'>;
}

export function recordOf(row: CallRow): CallRecord {
  const summary = row.summary === null ? null : CallSummary.safeParse(JSON.parse(row.summary));
  return CallRecord.parse({
    id: row.id,
    kind: row.kind,
    sceneId: row.scene_id,
    character: row.character,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    learnerSeconds: row.learner_seconds,
    characterSeconds: row.character_seconds,
    endReason: row.end_reason,
    summaryPending: row.summary_pending === 1,
    summary: summary?.success === true ? summary.data : null,
  });
}

export async function insertCall(db: D1Database, call: NewCall): Promise<void> {
  await db
    .prepare(
      `INSERT INTO calls (id, user_id, kind, scene_id, character, stage, started_at, ended_at,
         learner_seconds, character_seconds, end_reason, summary_pending, summary, scene_state,
         safety_flag, cost, timings, transcript_key)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, NULL, ?13, ?14, ?15, ?16, ?17)
       ON CONFLICT (id) DO NOTHING`,
    )
    .bind(
      call.id,
      call.userId,
      call.kind,
      call.sceneId,
      call.character,
      call.stage,
      call.startedAt,
      call.endedAt,
      call.learnerSeconds,
      call.characterSeconds,
      call.endReason,
      call.summaryPending ? 1 : 0,
      call.sceneState === null ? null : JSON.stringify(call.sceneState),
      call.safetyFlag,
      JSON.stringify(call.cost),
      JSON.stringify(call.timings),
      call.transcriptKey,
    )
    .run();
  await saveCost(db, call);
}

/** The call's cost record. A failure is logged and never loses the call record above. */
async function saveCost(db: D1Database, call: NewCall): Promise<void> {
  try {
    await insertCallCost(
      db,
      costRecordOf({
        callId: call.id,
        userId: call.userId,
        kind: call.kind,
        sceneId: call.sceneId,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        endReason: call.endReason,
        learnerSeconds: call.learnerSeconds,
        characterSeconds: call.characterSeconds,
        ...usageOf(call.cost),
        samples: call.samples ?? null,
      }),
    );
  } catch (error) {
    // The one place a cost record fails; an error reporter (Sentry, Toucan) can hook in here.
    console.error('call cost not saved', { callId: call.id, error: String(error) });
  }
}

export async function listCalls(db: D1Database, userId: string): Promise<CallRecord[]> {
  const { results } = await db
    .prepare(`SELECT * FROM calls WHERE user_id = ? ORDER BY started_at DESC, rowid DESC LIMIT ?`)
    .bind(userId, LIMITS.callsListMax)
    .all<CallRow>();
  return results.map(recordOf);
}

export async function getCallRow(
  db: D1Database,
  userId: string,
  id: string,
): Promise<CallRow | null> {
  return db
    .prepare('SELECT * FROM calls WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<CallRow>();
}

/** The post-call summary is in: stored, and the record no longer pending. */
export async function storeSummary(
  db: D1Database,
  userId: string,
  id: string,
  summary: CallSummary | null,
  summaryCost: unknown,
): Promise<void> {
  await db
    .prepare(
      `UPDATE calls SET summary = ?3, summary_pending = 0,
         cost = json_set(cost, '$.summary', json(?4))
       WHERE id = ?1 AND user_id = ?2`,
    )
    .bind(
      id,
      userId,
      summary === null ? null : JSON.stringify(summary),
      JSON.stringify(summaryCost),
    )
    .run();
  const usd = (summaryCost as { usd?: unknown } | null)?.usd;
  if (typeof usd === 'number') await addSummaryCost(db, userId, id, usd);
}

/**
 * The saved place of a scene the learner's minutes ran out in, if their last call of it stopped
 * there (and was not finished since).
 */
export async function savedSceneState(
  db: D1Database,
  userId: string,
  sceneId: string,
): Promise<unknown> {
  const row = await db
    .prepare(
      `SELECT scene_state FROM calls WHERE user_id = ? AND scene_id = ?
       ORDER BY ended_at DESC LIMIT 1`,
    )
    .bind(userId, sceneId)
    .first<{ scene_state: string | null }>();
  return row?.scene_state ? (JSON.parse(row.scene_state) as unknown) : null;
}

/** Seconds of live calls so far, and the start of the current run of back-to-back calls. */
export async function callTime(
  db: D1Database,
  userId: string,
  now: number,
  gapMs: number,
): Promise<{ totalSeconds: number; continuousSince: number }> {
  const total = await db
    .prepare(
      'SELECT COALESCE(SUM((ended_at - started_at) / 1000), 0) AS seconds FROM calls WHERE user_id = ?',
    )
    .bind(userId)
    .first<{ seconds: number }>();
  const { results } = await db
    .prepare(
      `SELECT started_at, ended_at FROM calls WHERE user_id = ? AND ended_at > ?
       ORDER BY ended_at DESC LIMIT 50`,
    )
    .bind(userId, now - 6 * 60 * 60_000)
    .all<{ started_at: number; ended_at: number }>();
  let since = now;
  for (const call of results) {
    if (since - call.ended_at > gapMs) break;
    since = Math.min(since, call.started_at);
  }
  return { totalSeconds: Math.round(total?.seconds ?? 0), continuousSince: since };
}
