import type { Session } from '@yapling/contracts';

/** Reads on `users` and `sessions` that Better Auth doesn't do itself. */

/** Better Auth stores its times as ISO text. */
export function authTime(now: number): string {
  return new Date(now).toISOString();
}

function epochOf(value: string | number): number {
  return typeof value === 'number' ? value : new Date(value).getTime();
}

/** The contracts' `Session` for a session token Better Auth just issued. */
export async function sessionByToken(db: D1Database, token: string): Promise<Session> {
  const row = await db
    .prepare(
      `SELECT s.user_id, s.expires_at, u.is_anonymous
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .bind(token)
    .first<{ user_id: string; expires_at: string | number; is_anonymous: number | null }>();
  if (row === null) throw new Error('the new session is missing');
  return {
    userId: row.user_id,
    token,
    expiresAt: epochOf(row.expires_at),
    kind: row.is_anonymous === 1 ? 'guest' : 'apple',
  };
}

export async function deleteSession(db: D1Database, session: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(session).run();
}
