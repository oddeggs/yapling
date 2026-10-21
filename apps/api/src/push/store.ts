import type { PushTokenRegistration } from '@yapling/contracts';

/** Reads and writes on `push_tokens`. */

/** Registers a phone's token for the learner, taking it over from whoever had it before. */
export async function registerPushToken(
  db: D1Database,
  userId: string,
  registration: PushTokenRegistration,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO push_tokens (token, user_id, platform, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?4)
       ON CONFLICT (token) DO UPDATE SET user_id = ?2, platform = ?3, updated_at = ?4`,
    )
    .bind(registration.token, userId, registration.platform, now)
    .run();
}

/** Stops pushes to a phone. Only the learner's own token goes; an unknown one is no error. */
export async function removePushToken(
  db: D1Database,
  userId: string,
  registration: PushTokenRegistration,
): Promise<void> {
  await db
    .prepare('DELETE FROM push_tokens WHERE token = ? AND user_id = ?')
    .bind(registration.token, userId)
    .run();
}

/** Every phone the learner gets pushes on. */
export async function pushTokensOf(
  db: D1Database,
  userId: string,
): Promise<PushTokenRegistration[]> {
  const { results } = await db
    .prepare('SELECT token, platform FROM push_tokens WHERE user_id = ? ORDER BY created_at')
    .bind(userId)
    .all<PushTokenRegistration>();
  return results;
}
