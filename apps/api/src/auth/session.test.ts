import { Session } from '@yapling/contracts';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { userIdForToken } from './session';
import { call, expectError, expectJson, guestBody, newGuest } from './testing/client';

describe('POST /api/session/guest', () => {
  it('gives a first launch a guest and a bearer session', async () => {
    const response = await call('/api/session/guest', { body: guestBody() });
    const session = Session.parse(await expectJson(response));
    expect(session.kind).toBe('guest');
    expect(session.expiresAt).toBeGreaterThan(Date.now() + 300 * 24 * 60 * 60_000);
    const row = await env.DB.prepare('SELECT is_anonymous FROM users WHERE id = ?')
      .bind(session.userId)
      .first<{ is_anonymous: number }>();
    expect(row?.is_anonymous).toBe(1);
  });

  it('gives the same install the same guest, with a new session', async () => {
    const installId = crypto.randomUUID();
    const first = await newGuest(installId);
    const again = await newGuest(installId);
    expect(again.userId).toBe(first.userId);
    expect(again.token).not.toBe(first.token);
    expect(await userIdForToken(env, first.token)).toBe(first.userId);
    expect(await userIdForToken(env, again.token)).toBe(first.userId);
  });

  it('gives racing requests from one install one guest', async () => {
    const installId = crypto.randomUUID();
    const sessions = await Promise.all([newGuest(installId), newGuest(installId)]);
    expect(sessions[0].userId).toBe(sessions[1].userId);
    const { n } = (await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE install_id = ?')
      .bind(installId)
      .first<{ n: number }>()) ?? { n: -1 };
    expect(n).toBe(1);
  });

  it('refuses a body without the age confirmation or the install id', async () => {
    await expectError(
      await call('/api/session/guest', { body: { ...guestBody(), ageConfirmed: false } }),
      400,
      'bad_request',
    );
    await expectError(
      await call('/api/session/guest', { body: { ...guestBody(), installId: 'install-1' } }),
      400,
      'bad_request',
    );
    await expectError(
      await call('/api/session/guest', { method: 'POST', headers: { 'content-type': 'x' } }),
      400,
      'bad_request',
    );
  });
});

describe('the session guard', () => {
  it('answers a /me or /calls route without a session with unauthorized', async () => {
    for (const path of ['/api/me/profile', '/api/me/anything', '/api/calls', '/api/calls/c1']) {
      await expectError(await call(path), 401, 'unauthorized');
      await expectError(await call(path, { token: 'not-a-session-token' }), 401, 'unauthorized');
    }
  });

  it('lets the call socket through to check its own token', async () => {
    const response = await call('/api/calls/socket');
    expect(response.status).not.toBe(401);
  });

  it('lets a session through', async () => {
    const { token } = await newGuest();
    const response = await call('/api/me/nowhere', { token });
    await expectError(response, 404, 'not_found');
  });

  it('knows no learner for an unknown socket token', async () => {
    expect(await userIdForToken(env, 'x'.repeat(32))).toBeNull();
  });
});
