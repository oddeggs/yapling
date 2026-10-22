import type { Bindings } from '../env';
import { appleKeyOf, revokeRefreshToken } from '../auth/apple-tokens';
import { identityConfig } from '../auth/config';
import { userObject } from '../user/object';

/**
 * Account deletion (`POST /api/me/delete`, `tech-decisions.md` §4): the learner's R2 objects, their
 * object's state and every D1 row go, now. Apple's refresh token is revoked first where the Apple
 * key is set.
 *
 * Running it again is harmless, so it is safe to retry. The D1 rows go last, sessions with them:
 * if anything before fails, the session still works and the app retries the same request.
 */

/** Every R2 object of a learner (transcripts, voice capsules) lives under this prefix. */
export function userBlobPrefix(userId: string): string {
  return `users/${userId}/`;
}

/** Statements that delete one feature's rows for a learner, in the final batch. */
export type DeletionStep = (db: D1Database, userId: string) => D1PreparedStatement[];

const steps = new Map<string, DeletionStep>();

/**
 * Adds a feature's rows (call records, purchases…) to deletion, under a unique name; the returned
 * function removes it again. Rows that reference `users (id) ON DELETE CASCADE` need no step.
 */
export function registerDeletionStep(name: string, step: DeletionStep): () => void {
  if (steps.has(name)) throw new Error(`a deletion step named ${name} is already registered`);
  steps.set(name, step);
  return () => {
    steps.delete(name);
  };
}

/** This lane's tables, explicit rather than trusting the cascade alone. */
const OWN_TABLES = [
  'push_tokens',
  'memory_items',
  'stage_changes',
  'progress',
  'profiles',
  'accounts',
  'sessions',
];

async function revokeApple(env: Bindings, userId: string, now: number): Promise<void> {
  const key = appleKeyOf(env, identityConfig(env.ENVIRONMENT).appleBundleId);
  if (key === null) return;
  const row = await env.DB.prepare(
    "SELECT refresh_token FROM accounts WHERE user_id = ? AND provider_id = 'apple'",
  )
    .bind(userId)
    .first<{ refresh_token: string | null }>();
  if (!row?.refresh_token) return;
  // Apple's answer doesn't hold up the deletion: the account goes either way.
  if (!(await revokeRefreshToken(key, row.refresh_token, now))) {
    console.warn('apple refused the token revocation');
  }
}

async function deleteBlobs(bucket: R2Bucket, prefix: string): Promise<void> {
  for (;;) {
    const listed = await bucket.list({ prefix, limit: 1000 });
    const keys = listed.objects.map((object) => object.key);
    if (keys.length > 0) await bucket.delete(keys);
    if (!listed.truncated) return;
  }
}

export async function deleteAccount(env: Bindings, userId: string, now: number): Promise<void> {
  try {
    await revokeApple(env, userId, now);
  } catch (error) {
    console.error('apple token revocation failed', { error });
  }
  await deleteBlobs(env.BLOBS, userBlobPrefix(userId));
  await userObject(env, userId).erase();
  await env.DB.batch([
    ...[...steps.values()].flatMap((step) => step(env.DB, userId)),
    ...OWN_TABLES.map((table) =>
      env.DB.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(userId),
    ),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
}
