import type { AppleLinkRequest, Session } from '@yapling/contracts';
import { APIError } from 'better-auth/api';

import { deleteAccount } from '../account/delete';
import type { Bindings } from '../env';
import { appleKeyOf, exchangeAuthorizationCode } from './apple-tokens';
import { identityConfig } from './config';
import { authFor } from './instance';
import { reserveIdToken, unverifiedClaims } from './replay';
import { signedInBy } from './session';
import { authTime, sessionByToken } from './users';

/**
 * `POST /api/session/apple`: Sign in with Apple, keeping the guest's progress.
 *
 * The app sends the identity token and raw nonce from Apple's native sheet, with the guest's
 * session as the bearer when it has one. Better Auth verifies the token and resolves the Apple
 * identity to a learner; then:
 *
 * - **First time this Apple identity is seen, from a guest.** Better Auth made a new learner for
 *   it. The guest adopts the identity instead and the new learner is folded away, so the user id,
 *   profile and progress never change. The guest's other sessions end; the new session is theirs.
 * - **A returning Apple account, from a guest** (a second phone, a reinstall). The returning
 *   account wins, as the server does on any conflict: the guest, a stand-in until now, is erased
 *   (`replaceGuest`).
 * - **No guest** (a new phone, signed out): the session is the Apple account's.
 */

export type AppleOutcome =
  | { readonly ok: true; readonly session: Session }
  | { readonly ok: false; readonly status: 401 | 409 | 503; readonly code: string };

/** A guest a returning Apple account replaced is erased like a deleted account, if still a guest. */
async function replaceGuest(env: Bindings, guestId: string, now: number): Promise<void> {
  const row = await env.DB.prepare('SELECT is_anonymous FROM users WHERE id = ?')
    .bind(guestId)
    .first<{ is_anonymous: number | null }>();
  if (row?.is_anonymous === 1) await deleteAccount(env, guestId, now);
}

/**
 * The guest takes the new learner's Apple identity, keeping their id: their guest sessions end, the
 * new learner's accounts and sessions move over, and the new learner is deleted. One batch, and
 * every statement in it holds only while the guest is still anonymous, so of two sign-ins racing
 * for one guest exactly one lands. Answers whether this one did.
 */
export async function adoptIdentity(
  db: D1Database,
  input: { guest: string; fresh: string; now: number },
): Promise<boolean> {
  const identity = await db
    .prepare('SELECT email, email_verified, name, image FROM users WHERE id = ?')
    .bind(input.fresh)
    .first<{ email: string; email_verified: number; name: string; image: string | null }>();
  if (identity === null) throw new Error('the new learner to adopt is missing');
  const stillGuest = 'EXISTS (SELECT 1 FROM users WHERE id = ?1 AND is_anonymous = 1)';
  const results = await db.batch([
    db.prepare(`DELETE FROM sessions WHERE user_id = ?1 AND ${stillGuest}`).bind(input.guest),
    db
      .prepare(`UPDATE accounts SET user_id = ?1 WHERE user_id = ?2 AND ${stillGuest}`)
      .bind(input.guest, input.fresh),
    db
      .prepare(`UPDATE sessions SET user_id = ?1 WHERE user_id = ?2 AND ${stillGuest}`)
      .bind(input.guest, input.fresh),
    db.prepare(`DELETE FROM users WHERE id = ?2 AND ${stillGuest}`).bind(input.guest, input.fresh),
    db
      .prepare(
        `UPDATE users
         SET email = ?2, email_verified = ?3, name = ?4, image = ?5, is_anonymous = 0,
             install_id = NULL, updated_at = ?6
         WHERE id = ?1 AND is_anonymous = 1`,
      )
      .bind(
        input.guest,
        identity.email,
        identity.email_verified,
        identity.name,
        identity.image,
        authTime(input.now),
      ),
  ]);
  return results.at(-1)?.meta.changes === 1;
}

/** Keeps Apple's refresh token for revocation at deletion, where the Apple key is set. */
async function keepRefreshToken(
  env: Bindings,
  input: { userId: string; code: string | null; clientId: string | null; now: number },
): Promise<void> {
  const key = appleKeyOf(env, input.clientId);
  if (key === null || input.code === null) return;
  try {
    const refreshToken = await exchangeAuthorizationCode(key, input.code, input.now);
    if (refreshToken === null) return;
    await env.DB.prepare(
      "UPDATE accounts SET refresh_token = ?, updated_at = ? WHERE user_id = ? AND provider_id = 'apple'",
    )
      .bind(refreshToken, authTime(input.now), input.userId)
      .run();
  } catch (error) {
    // Sign-in stands without it; only the revocation at deletion waits on this token.
    console.error('apple code exchange failed', { error });
  }
}

export async function appleSession(
  env: Bindings,
  request: Request,
  input: AppleLinkRequest,
): Promise<AppleOutcome> {
  const { appleBundleId } = identityConfig(env.ENVIRONMENT);
  if (appleBundleId === null) return { ok: false, status: 503, code: 'apple_unavailable' };
  const now = Date.now();

  const hasBearer = request.headers.has('authorization');
  const guest = hasBearer ? await signedInBy(env, request) : null;
  if (hasBearer && guest === null) return { ok: false, status: 401, code: 'unauthorized' };

  const claims = unverifiedClaims(input.identityToken);
  if (claims === null) return { ok: false, status: 401, code: 'invalid_token' };
  const exp = typeof claims['exp'] === 'number' ? claims['exp'] * 1000 : now;
  if (!(await reserveIdToken(env.DB, { idToken: input.identityToken, expiresAt: exp, now }))) {
    return { ok: false, status: 401, code: 'token_reused' };
  }

  const { auth, created } = authFor(env, request);
  let signedIn: { token: string; user: { id: string } };
  try {
    const result = await auth.api.signInSocial({
      body: { provider: 'apple', idToken: { token: input.identityToken, nonce: input.nonce } },
      headers: new Headers(),
    });
    if (!('token' in result) || typeof result.token !== 'string') {
      return { ok: false, status: 401, code: 'invalid_token' };
    }
    signedIn = { token: result.token, user: result.user };
  } catch (error) {
    if (error instanceof APIError) return { ok: false, status: 401, code: 'invalid_token' };
    throw error;
  }

  const appleUser = signedIn.user.id;
  let userId = appleUser;
  if (guest?.isAnonymous && guest.userId !== appleUser) {
    if (created.has(appleUser)) {
      const adopted = await adoptIdentity(env.DB, { guest: guest.userId, fresh: appleUser, now });
      if (!adopted) {
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(appleUser).run();
        return { ok: false, status: 409, code: 'conflict' };
      }
      userId = guest.userId;
    } else {
      await replaceGuest(env, guest.userId, now);
    }
  }

  await keepRefreshToken(env, {
    userId,
    code: input.authorizationCode,
    clientId: appleBundleId,
    now,
  });
  return { ok: true, session: await sessionByToken(env.DB, signedIn.token) };
}
