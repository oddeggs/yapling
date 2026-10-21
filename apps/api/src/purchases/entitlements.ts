import type { Plan } from '@yapling/contracts';

/*
 * The server's mirror of the Plus entitlement, one row per learner who ever bought it. RevenueCat's
 * webhook writes it; the learner object's ledger is set from it (`planOf`). Every write is guarded
 * by the event time, so an older event delivered late changes nothing.
 */

export type EntitlementState = 'active' | 'expired';

/** A Plus period as one event reports it. */
export interface PlusPeriod {
  readonly product: string | null;
  readonly store: string | null;
  readonly environment: string | null;
  readonly periodType: string | null;
  readonly periodStart: number;
  readonly expiresAt: number | null;
  readonly willRenew: boolean;
}

export interface PlusEntitlement extends PlusPeriod {
  readonly userId: string;
  readonly state: EntitlementState;
  readonly eventAt: number;
}

interface Row {
  user_id: string;
  state: EntitlementState;
  product: string | null;
  store: string | null;
  environment: string | null;
  period_type: string | null;
  period_start: number;
  expires_at: number | null;
  will_renew: number;
  event_at: number;
}

/** Writes the learner's entitlement as an event saw it, unless a newer event already wrote it. */
export function writeStatement(
  db: D1Database,
  userId: string,
  state: EntitlementState,
  period: PlusPeriod,
  eventAt: number,
  now: number,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO plus_entitlements
         (user_id, state, product, store, environment, period_type, period_start, expires_at,
          will_renew, event_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       ON CONFLICT (user_id) DO UPDATE SET
         state = excluded.state,
         product = coalesce(excluded.product, plus_entitlements.product),
         store = coalesce(excluded.store, plus_entitlements.store),
         environment = coalesce(excluded.environment, plus_entitlements.environment),
         period_type = coalesce(excluded.period_type, plus_entitlements.period_type),
         period_start = excluded.period_start,
         expires_at = excluded.expires_at,
         will_renew = excluded.will_renew,
         event_at = excluded.event_at,
         updated_at = excluded.updated_at
       WHERE excluded.event_at >= plus_entitlements.event_at`,
    )
    .bind(
      userId,
      state,
      period.product,
      period.store,
      period.environment,
      period.periodType,
      period.periodStart,
      period.expiresAt,
      period.willRenew ? 1 : 0,
      eventAt,
      now,
    );
}

/**
 * Moves one learner's entitlement to another (RevenueCat's `TRANSFER`: a restore on a different
 * account). Where both have a row, the newer one wins.
 */
export function moveStatements(db: D1Database, from: string, into: string): D1PreparedStatement[] {
  return [
    // `WHERE true` lets SQLite tell the upsert clause from a join constraint.
    db
      .prepare(
        `INSERT INTO plus_entitlements
           (user_id, state, product, store, environment, period_type, period_start, expires_at,
            will_renew, event_at, updated_at)
         SELECT ?2, state, product, store, environment, period_type, period_start, expires_at,
                will_renew, event_at, updated_at
         FROM plus_entitlements WHERE user_id = ?1 AND true
         ON CONFLICT (user_id) DO UPDATE SET
           state = excluded.state,
           product = excluded.product,
           store = excluded.store,
           environment = excluded.environment,
           period_type = excluded.period_type,
           period_start = excluded.period_start,
           expires_at = excluded.expires_at,
           will_renew = excluded.will_renew,
           event_at = excluded.event_at,
           updated_at = excluded.updated_at
         WHERE excluded.event_at >= plus_entitlements.event_at
            OR plus_entitlements.state <> 'active'`,
      )
      .bind(from, into),
    db.prepare('DELETE FROM plus_entitlements WHERE user_id = ?').bind(from),
  ];
}

export async function readEntitlement(
  db: D1Database,
  userId: string,
): Promise<PlusEntitlement | null> {
  const row = await db
    .prepare('SELECT * FROM plus_entitlements WHERE user_id = ?')
    .bind(userId)
    .first<Row>();
  if (row === null) return null;
  return {
    userId: row.user_id,
    state: row.state,
    product: row.product,
    store: row.store,
    environment: row.environment,
    periodType: row.period_type,
    periodStart: row.period_start,
    expiresAt: row.expires_at,
    willRenew: row.will_renew === 1,
    eventAt: row.event_at,
  };
}

/**
 * The plan an entitlement gives at an instant: Plus while it is active and its period hasn't
 * ended, free otherwise (no row, expired, refunded, or an expiry RevenueCat hasn't sent yet).
 */
export function planOf(
  entitlement: PlusEntitlement | null,
  now: number,
): { plan: Plan; periodStart: number } {
  if (
    entitlement === null ||
    entitlement.state !== 'active' ||
    (entitlement.expiresAt !== null && entitlement.expiresAt <= now)
  ) {
    return { plan: 'free', periodStart: entitlement?.periodStart ?? now };
  }
  return { plan: 'plus', periodStart: entitlement.periodStart };
}

/** Account deletion: what they bought goes with them (the stores keep their own receipts). */
export function deleteStatements(db: D1Database, userId: string): D1PreparedStatement[] {
  return [db.prepare('DELETE FROM plus_entitlements WHERE user_id = ?').bind(userId)];
}
