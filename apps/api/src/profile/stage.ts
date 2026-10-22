import type { Profile, Stage, StageRequest, StageRequestReason } from '@yapling/contracts';
import { placementStage, resolveStageRequest } from '@yapling/domain';

import { readProfile } from './store';

/*
 * Stage changes on `stage_changes`: the learner's own requests (`POST /api/me/stage`) and the
 * placement call's. Each change and its record land in one batch, over the stage it was decided
 * from, so a change racing another is decided again. Every change is also logged for the Workers
 * Logs dashboard (no user id, like the turn log).
 */

/** Why a stage changed: a learner's request, or the placement call's end. */
export type StageChangeReason = StageRequestReason | 'placement';

interface StageChange {
  readonly id: string;
  readonly reason: StageChangeReason;
  readonly from: Stage;
  readonly to: Stage;
  readonly callId: string | null;
}

/**
 * Writes the change and its record over `from`. False when the stage is no longer `from`, or when
 * a record with the same id is there already.
 */
async function writeChange(
  db: D1Database,
  userId: string,
  change: StageChange,
  now: number,
): Promise<boolean> {
  const record = db
    .prepare(
      `INSERT INTO stage_changes (id, user_id, reason, from_stage, to_stage, call_id, created_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
       WHERE (SELECT stage FROM profiles WHERE user_id = ?2) = ?4
       ON CONFLICT (id) DO NOTHING`,
    )
    .bind(change.id, userId, change.reason, change.from, change.to, change.callId, now);
  // A stay changes nothing but the record; the profile's revision stays.
  const move = db
    .prepare(
      `UPDATE profiles SET stage = ?3, revision = revision + 1, updated_at = ?4
       WHERE user_id = ?1 AND stage = ?2 AND ?2 <> ?3
         AND EXISTS (SELECT 1 FROM stage_changes WHERE id = ?5 AND created_at = ?4)`,
    )
    .bind(userId, change.from, change.to, now, change.id);
  const [inserted] = await db.batch([record, move]);
  const written = (inserted?.meta.changes ?? 0) === 1;
  if (written) {
    console.log({
      msg: 'stage change',
      reason: change.reason,
      from: change.from,
      to: change.to,
      callId: change.callId,
    });
  }
  return written;
}

export type StageRequestOutcome =
  | { readonly ok: true; readonly profile: Profile }
  | { readonly ok: false; readonly error: 'no_profile' | 'stage_conflict' };

/**
 * `POST /api/me/stage`: the move the learner asked for, when `resolveStageRequest` allows it from
 * their stage; recorded with its reason, from and to (a stay too).
 */
export async function requestStage(
  db: D1Database,
  userId: string,
  request: StageRequest,
  now: number,
): Promise<StageRequestOutcome> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await readProfile(db, userId);
    if (current === null) return { ok: false, error: 'no_profile' };
    const to = resolveStageRequest(current.stage, request);
    if (to === null) return { ok: false, error: 'stage_conflict' };
    const id = `stg_${crypto.randomUUID()}`;
    const change = { id, reason: request.reason, from: current.stage, to, callId: null };
    if (await writeChange(db, userId, change, now)) {
      const profile = await readProfile(db, userId);
      if (profile === null) return { ok: false, error: 'no_profile' };
      return { ok: true, profile };
    }
  }
  throw new Error('the stage kept changing under the request');
}

/** The placement record's id: one per learner. */
const placementId = (userId: string): string => `placement_${userId}`;

export type PlacementOutcome =
  /** The stage the placement rule set (Newcomer may be the stage the learner had). */
  | { readonly applied: true; readonly stage: 'visitor' | 'newcomer' }
  /**
   * Nothing changed. `no_profile`: not onboarded. `not_placement_path`: the learner didn't choose
   * the placement call at onboarding (an older app, or "Mình mới bắt đầu"). `placed`: a placement
   * was applied already. `moved_on`: the learner's stage is past Newcomer.
   */
  | {
      readonly applied: false;
      readonly reason: 'no_profile' | 'not_placement_path' | 'placed' | 'moved_on';
      readonly stage: Stage | null;
    };

/**
 * The end of a placement call: sets the stage by the placement rule (`placementStage`, Visitor
 * when at most one of the three open boxes was fine) and records it with the call id. Applied once
 * per learner, so a retry with the same call, or a later placement call, changes nothing; and only
 * for a learner who chose the placement path at onboarding and is still at Visitor or Newcomer.
 * `openBoxesFine` is one flag per open box played, in order (the warm-up box never in it).
 */
export async function applyPlacement(
  db: D1Database,
  userId: string,
  input: { readonly callId: string; readonly openBoxesFine: readonly boolean[] },
  now: number,
): Promise<PlacementOutcome> {
  const to = placementStage(input.openBoxesFine);
  const id = placementId(userId);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await readProfile(db, userId);
    if (current === null) return { applied: false, reason: 'no_profile', stage: null };
    const stage = current.stage;
    if (current.startPath !== 'placement') {
      return { applied: false, reason: 'not_placement_path', stage };
    }
    if (await placed(db, id)) return { applied: false, reason: 'placed', stage };
    if (stage !== 'visitor' && stage !== 'newcomer') {
      return { applied: false, reason: 'moved_on', stage };
    }
    const change = { id, reason: 'placement' as const, from: stage, to, callId: input.callId };
    if (await writeChange(db, userId, change, now)) return { applied: true, stage: to };
  }
  throw new Error('the stage kept changing under the placement');
}

async function placed(db: D1Database, id: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS one FROM stage_changes WHERE id = ?').bind(id).first();
  return row !== null;
}

/** A recorded stage change, for support and tests. */
export interface StageChangeRecord {
  readonly reason: StageChangeReason;
  readonly from: Stage;
  readonly to: Stage;
  readonly callId: string | null;
  readonly at: number;
}

/** The learner's recorded stage changes, oldest first. */
export async function stageChanges(db: D1Database, userId: string): Promise<StageChangeRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT reason, from_stage, to_stage, call_id, created_at FROM stage_changes
       WHERE user_id = ? ORDER BY created_at, rowid`,
    )
    .bind(userId)
    .all<{
      reason: StageChangeReason;
      from_stage: Stage;
      to_stage: Stage;
      call_id: string | null;
      created_at: number;
    }>();
  return results.map((r) => ({
    reason: r.reason,
    from: r.from_stage,
    to: r.to_stage,
    callId: r.call_id,
    at: r.created_at,
  }));
}
