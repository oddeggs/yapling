import { Session } from '@yapling/contracts';
import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { userIdForToken } from './session';
import { call, expectError, expectJson, newGuest } from './testing/client';
import { startTestIdentityProvider, type TestIdentityProvider } from './testing/identity-provider';

let apple: TestIdentityProvider;

beforeEach(async () => {
  apple = await startTestIdentityProvider();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function signIn(body: unknown, token?: string) {
  return call('/api/session/apple', { body, ...(token === undefined ? {} : { token }) });
}

async function userCount(id: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE id = ?')
    .bind(id)
    .first<{ n: number }>();
  return row?.n ?? -1;
}

describe('POST /api/session/apple', () => {
  it('lets a guest adopt a new Apple identity, keeping their user id', async () => {
    const guest = await newGuest();
    const sub = `sub-${crypto.randomUUID()}`;
    const session = Session.parse(
      await expectJson(await signIn(await apple.sheet(sub), guest.token)),
    );
    expect(session).toMatchObject({ userId: guest.userId, kind: 'apple' });

    expect(await userIdForToken(env, session.token)).toBe(guest.userId);
    // The guest session ended with the guest.
    expect(await userIdForToken(env, guest.token)).toBeNull();
    const row = await env.DB.prepare(
      `SELECT u.is_anonymous, u.install_id, a.account_id FROM users u
       JOIN accounts a ON a.user_id = u.id WHERE u.id = ?`,
    )
      .bind(guest.userId)
      .first<{ is_anonymous: number; install_id: string | null; account_id: string }>();
    expect(row).toEqual({ is_anonymous: 0, install_id: null, account_id: sub });
  });

  it('signs a new phone in to the Apple account, and a guest there gives way to it', async () => {
    const sub = `sub-${crypto.randomUUID()}`;
    const first = await newGuest();
    const owner = Session.parse(
      await expectJson(await signIn(await apple.sheet(sub), first.token)),
    );

    // A new phone, signed out: straight in.
    const signedOut = Session.parse(await expectJson(await signIn(await apple.sheet(sub))));
    expect(signedOut.userId).toBe(owner.userId);

    // A reinstall with a fresh guest: the returning account wins and the guest is gone.
    const second = await newGuest();
    const back = Session.parse(
      await expectJson(await signIn(await apple.sheet(sub), second.token)),
    );
    expect(back).toMatchObject({ userId: owner.userId, kind: 'apple' });
    expect(await userCount(second.userId)).toBe(0);
    expect(await userIdForToken(env, second.token)).toBeNull();
  });

  it('refuses a replayed identity token', async () => {
    const fromSheet = await apple.sheet(`sub-${crypto.randomUUID()}`);
    await expectJson(await signIn(fromSheet));
    await expectError(await signIn(fromSheet), 401, 'token_reused');
  });

  it('refuses a forged token, a wrong nonce and another audience', async () => {
    const sub = `sub-${crypto.randomUUID()}`;
    await expectError(await signIn(await apple.forged(sub)), 401, 'invalid_token');
    const sheet = await apple.sheet(sub);
    await expectError(
      await signIn({ ...sheet, nonce: `other-${sheet.nonce}` }),
      401,
      'invalid_token',
    );
    await expectError(
      await signIn(await apple.sheet(sub, { aud: 'com.example.other' })),
      401,
      'invalid_token',
    );
  });

  it('refuses an unknown bearer and a bad body', async () => {
    const sheet = await apple.sheet(`sub-${crypto.randomUUID()}`);
    await expectError(await signIn(sheet, 'y'.repeat(32)), 401, 'unauthorized');
    await expectError(await signIn({ ...sheet, nonce: 'short' }), 400, 'bad_request');
  });
});
