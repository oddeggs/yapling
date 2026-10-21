import { authTime } from './users';

/**
 * Identity-token replay protection, stored in `verifications`. Each Apple identity token is
 * reserved by its hash until it expires, so the same token never signs in twice. (Better Auth checks
 * the token's own nonce claim against the raw nonce the app sends.)
 */

const TOKEN_PREFIX = 'id-token:';

/** The longest an identity token is reserved: Apple's tokens live ten minutes; a margin on top. */
const MAX_RESERVATION_MS = 65 * 60_000;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The claims of a JWT, unverified: read only to refuse early or to size a reservation. */
export function unverifiedClaims(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1];
  if (payload === undefined) return null;
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof claims === 'object' && claims !== null && !Array.isArray(claims)
      ? (claims as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Reserves an identity token until it expires: true only the first time it is seen. */
export async function reserveIdToken(
  db: D1Database,
  input: { idToken: string; expiresAt: number; now: number },
): Promise<boolean> {
  const identifier = TOKEN_PREFIX + (await sha256Hex(input.idToken));
  const until = Math.min(
    Math.max(input.expiresAt, input.now + 60_000),
    input.now + MAX_RESERVATION_MS,
  );
  const [, inserted] = await db.batch([
    db
      .prepare(
        'DELETE FROM verifications WHERE identifier >= ? AND identifier < ? AND expires_at <= ?',
      )
      .bind(TOKEN_PREFIX, 'id-token;', authTime(input.now)),
    db
      .prepare(
        `INSERT INTO verifications (id, identifier, value, expires_at, created_at, updated_at)
         SELECT ?1, ?2, '1', ?3, ?4, ?4
         WHERE NOT EXISTS (SELECT 1 FROM verifications WHERE identifier = ?2)`,
      )
      .bind(crypto.randomUUID(), identifier, authTime(until), authTime(input.now)),
  ]);
  return inserted?.meta.changes === 1;
}
