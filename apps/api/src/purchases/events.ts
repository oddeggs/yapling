import { z } from 'zod';

import type { EnvironmentName } from '../env';
import { moveStatements, writeStatement, type EntitlementState } from './entitlements';
import { isAboutPlus, logicalProduct } from './products';

/*
 * RevenueCat's webhook, folded into the Plus mirror. The body keeps RevenueCat's snake_case names.
 * Each event is applied once by its id; an event that says nothing about Plus (a test event, an
 * unknown learner, a dev product in production) is recorded and acknowledged, never an error, so
 * RevenueCat doesn't retry it.
 *
 * - A purchase, renewal, plan change, un-cancel, extension or reversed refund: Plus is active for
 *   the period the event reports.
 * - `CANCELLATION`: auto-renew is off and Plus runs to the end of the period; a refund (the period
 *   ending at or before the event) ends it now.
 * - `EXPIRATION`: Plus has ended.
 * - `BILLING_ISSUE`: nothing changes; the store retries and RevenueCat sends the outcome.
 * - `TRANSFER`: the entitlement moves to another Yapling account (a restore there).
 */

const optionalText = z.string().nullish();
const optionalMs = z.number().int().nonnegative().nullish();

export const RevenueCatEvent = z.looseObject({
  id: z.string().min(1).max(200),
  type: z.string().min(1).max(64),
  app_user_id: optionalText,
  product_id: optionalText,
  entitlement_ids: z.array(z.string()).nullish(),
  period_type: optionalText,
  purchased_at_ms: optionalMs,
  expiration_at_ms: optionalMs,
  event_timestamp_ms: z.number().int().nonnegative(),
  store: optionalText,
  environment: optionalText,
  transferred_from: z.array(z.string()).nullish(),
  transferred_to: z.array(z.string()).nullish(),
});
export type RevenueCatEvent = z.infer<typeof RevenueCatEvent>;

export const RevenueCatWebhook = z.looseObject({
  api_version: z.string().optional(),
  event: RevenueCatEvent,
});

const ACTIVATES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'REFUND_REVERSED',
  'NON_RENEWING_PURCHASE',
]);

export type EventOutcome = 'applied' | 'ignored' | 'duplicate';

/** What applying an event did: its outcome and the learners whose plan may have changed. */
export interface Applied {
  readonly outcome: EventOutcome;
  readonly learners: readonly string[];
}

const userExists = async (db: D1Database, userId: string) =>
  (await db.prepare('SELECT 1 AS found FROM users WHERE id = ?').bind(userId).first()) !== null;

interface Writes {
  readonly statements: D1PreparedStatement[];
  readonly learners: string[];
}

/** The state an event leaves Plus in, or null when the event doesn't change it. */
function stateAfter(
  event: RevenueCatEvent,
): { state: EntitlementState; willRenew: boolean } | null {
  if (ACTIVATES.has(event.type)) {
    return { state: 'active', willRenew: event.type !== 'NON_RENEWING_PURCHASE' };
  }
  if (event.type === 'CANCELLATION') {
    const ended =
      event.expiration_at_ms !== null &&
      event.expiration_at_ms !== undefined &&
      event.expiration_at_ms <= event.event_timestamp_ms;
    return { state: ended ? 'expired' : 'active', willRenew: false };
  }
  if (event.type === 'EXPIRATION') return { state: 'expired', willRenew: false };
  return null;
}

async function writesFor(
  db: D1Database,
  event: RevenueCatEvent,
  environment: EnvironmentName,
  now: number,
): Promise<Writes | null> {
  if (event.type === 'TRANSFER') {
    const into = event.transferred_to?.[0];
    if (into === undefined || !(await userExists(db, into))) return null;
    const from = (event.transferred_from ?? []).filter((f) => f !== into);
    if (from.length === 0) return null;
    return {
      statements: from.flatMap((f) => moveStatements(db, f, into)),
      learners: [...from, into],
    };
  }
  const storeId = event.product_id ?? null;
  const product = storeId === null ? null : logicalProduct(storeId, environment);
  if (storeId !== null && product === null) return null;
  if (!isAboutPlus(product, event.entitlement_ids)) return null;
  const after = stateAfter(event);
  const userId = event.app_user_id;
  if (after === null || !userId || !(await userExists(db, userId))) return null;
  const eventAt = event.event_timestamp_ms;
  const statement = writeStatement(
    db,
    userId,
    after.state,
    {
      product,
      store: event.store ?? null,
      environment: event.environment ?? null,
      periodType: event.period_type ?? null,
      periodStart: event.purchased_at_ms ?? eventAt,
      expiresAt: event.expiration_at_ms ?? null,
      willRenew: after.willRenew,
    },
    eventAt,
    now,
  );
  return { statements: [statement], learners: [userId] };
}

/** Records the event id so a redelivery is skipped. */
function seenStatement(db: D1Database, event: RevenueCatEvent, now: number): D1PreparedStatement {
  return db
    .prepare('INSERT INTO revenuecat_events (id, type, received_at) VALUES (?, ?, ?)')
    .bind(event.id, event.type, now);
}

/** Forgets an event id, so RevenueCat's retry applies it again (its writes are idempotent). */
export async function forgetEvent(db: D1Database, eventId: string): Promise<void> {
  await db.prepare('DELETE FROM revenuecat_events WHERE id = ?').bind(eventId).run();
}

/** Applies one webhook event to the mirror, once. */
export async function applyRevenueCatEvent(
  db: D1Database,
  event: RevenueCatEvent,
  environment: EnvironmentName,
  now: number,
): Promise<Applied> {
  const seenBefore = await db
    .prepare('SELECT 1 AS seen FROM revenuecat_events WHERE id = ?')
    .bind(event.id)
    .first();
  if (seenBefore !== null) return { outcome: 'duplicate', learners: [] };
  const writes = await writesFor(db, event, environment, now);
  try {
    await db.batch([seenStatement(db, event, now), ...(writes?.statements ?? [])]);
  } catch (error) {
    // The same event delivered twice at once: the other delivery applied it.
    if (error instanceof Error && /UNIQUE|constraint/i.test(error.message)) {
      return { outcome: 'duplicate', learners: [] };
    }
    throw error;
  }
  return writes === null
    ? { outcome: 'ignored', learners: [] }
    : { outcome: 'applied', learners: writes.learners };
}
