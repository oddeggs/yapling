import type { GuestSessionRequest, Session } from '@yapling/contracts';

import type { Bindings } from '../env';
import { authFor } from './instance';
import { sessionByToken } from './users';

/**
 * `POST /api/session/guest`: a guest for this install, and a session for it.
 *
 * The app makes a random install id once and keeps it in the keychain, which outlives a reinstall.
 * The same install asking again (a lost token, a retried request) gets a new session for the same
 * guest rather than a second, empty guest. Once the guest signs in with Apple the install id is
 * released, and the next guest session for it starts a new guest.
 */
export async function guestSession(
  env: Bindings,
  request: Request,
  input: GuestSessionRequest,
): Promise<Session> {
  const { auth, created } = authFor(env, request);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE install_id = ? AND is_anonymous = 1',
    )
      .bind(input.installId)
      .first<{ id: string }>();
    if (existing !== null) {
      const context = await auth.$context;
      const session = await context.internalAdapter.createSession(existing.id);
      return sessionByToken(env.DB, session.token);
    }

    const signedIn = await auth.api.signInAnonymous({ headers: new Headers() });
    if (signedIn === null) throw new Error('no guest was created');
    const userId = signedIn.user.id;
    try {
      await env.DB.prepare('UPDATE users SET install_id = ? WHERE id = ?')
        .bind(input.installId, userId)
        .run();
    } catch (error) {
      // Another request for this install made its guest first: that one is the install's guest.
      if (!created.has(userId) || !String(error).includes('UNIQUE')) throw error;
      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
      continue;
    }
    return sessionByToken(env.DB, signedIn.token);
  }
  throw new Error('the install has no guest after a retry');
}
