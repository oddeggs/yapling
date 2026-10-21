import { DeleteAccountResponse } from '@yapling/contracts';
import { runInDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { call, expectError, expectJson, newGuest } from '../auth/testing/client';
import type { Bindings } from '../env';
import { userObject } from '../user/object';
import { deleteAccount, registerDeletionStep, userBlobPrefix } from './delete';

afterEach(() => {
  vi.restoreAllMocks();
});

const TABLES = ['sessions', 'accounts', 'profiles', 'progress', 'memory_items', 'push_tokens'];

/** Whether the learner has rows everywhere a guest has them (a guest has no Apple account). */
async function hasEverything(userId: string): Promise<boolean> {
  const { accounts, ...rest } = await rowsOf(userId);
  return accounts === 0 && Object.values(rest).every((n) => n > 0);
}

async function rowsOf(userId: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`)
      .bind(userId)
      .first<{ n: number }>();
    counts[table] = row?.n ?? -1;
  }
  const user = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE id = ?')
    .bind(userId)
    .first<{ n: number }>();
  counts['users'] = user?.n ?? -1;
  return counts;
}

async function blobKeys(prefix: string): Promise<string[]> {
  return (await env.BLOBS.list({ prefix })).objects.map((object) => object.key);
}

/** A learner with something in every place deletion has to reach. */
async function fullLearner() {
  const session = await newGuest();
  const { token, userId } = session;
  const ok = async (response: Response, status = 200) => {
    expect(response.status, await response.clone().text()).toBe(status);
  };
  await ok(
    await call('/api/me/profile', {
      method: 'PUT',
      token,
      body: {
        displayName: 'Lan',
        firstLanguage: 'vi',
        roommate: { species: 'redpanda', name: 'Pip' },
        track: 'work',
        quietHours: null,
        timezone: 'Asia/Ho_Chi_Minh',
        notificationsAllowed: true,
      },
    }),
  );
  await ok(await call('/api/me/progress', { token }));
  await ok(
    await call('/api/me/memory', { token, body: { text: 'Has a cat', category: 'about_you' } }),
    201,
  );
  await ok(
    await call('/api/me/push-token', {
      method: 'PUT',
      token,
      body: { token: `ExponentPushToken[${userId}]`, platform: 'ios' },
    }),
    204,
  );
  await env.BLOBS.put(`${userBlobPrefix(userId)}transcripts/call_1.json`, '{}');
  await env.BLOBS.put(`${userBlobPrefix(userId)}capsules/2026-10.m4a`, 'audio');
  const user = userObject(env, userId);
  await user.charge(300, 'learner');
  await user.schedule('voicemail', Date.now() + 3_600_000, { voicemailId: 'vm-1' });
  return session;
}

describe('POST /api/me/delete', () => {
  it('deletes the D1 rows, the R2 objects and the object state, and ends the session', async () => {
    const other = await fullLearner();
    const { token, userId } = await fullLearner();
    expect(await hasEverything(userId)).toBe(true);

    const before = Date.now();
    const answer = DeleteAccountResponse.parse(
      await expectJson(await call('/api/me/delete', { token, body: { confirm: true } })),
    );
    expect(answer.deletedBy).toBeGreaterThanOrEqual(before);
    expect(answer.deletedBy).toBeLessThanOrEqual(Date.now());

    expect(Object.values(await rowsOf(userId))).toEqual(TABLES.map(() => 0).concat(0));
    expect(await blobKeys(userBlobPrefix(userId))).toEqual([]);
    const user = userObject(env, userId);
    expect(await runInDurableObject(user, (_, state) => state.storage.getAlarm({}))).toBeNull();
    expect(await user.pending()).toEqual([]);

    // The session went with the account.
    await expectError(await call('/api/me/profile', { token }), 401, 'unauthorized');
    await expectError(
      await call('/api/me/delete', { token, body: { confirm: true } }),
      401,
      'unauthorized',
    );

    // Nobody else lost anything.
    expect(await hasEverything(other.userId)).toBe(true);
    expect(await blobKeys(userBlobPrefix(other.userId))).toHaveLength(2);
    expect(await userObject(env, other.userId).pending()).toHaveLength(1);
  });

  it('is safe to run again', async () => {
    const { userId } = await fullLearner();
    await deleteAccount(env, userId, Date.now());
    await deleteAccount(env, userId, Date.now());
    expect(Object.values(await rowsOf(userId)).every((n) => n === 0)).toBe(true);
  });

  it('runs the steps other features register', async () => {
    const { token, userId } = await newGuest();
    const seen: string[] = [];
    const remove = registerDeletionStep('test-rows', (_, id) => {
      seen.push(id);
      return [];
    });
    try {
      expect(() => registerDeletionStep('test-rows', () => [])).toThrow();
      await expectJson(await call('/api/me/delete', { token, body: { confirm: true } }));
    } finally {
      remove();
    }
    expect(seen).toEqual([userId]);
  });

  it('revokes Apple tokens where the Apple key is set', async () => {
    const { userId } = await newGuest();
    const at = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO accounts (id, account_id, provider_id, user_id, refresh_token, created_at, updated_at)
       VALUES (?, ?, 'apple', ?, 'refresh-1', ?, ?)`,
    )
      .bind(`a-${userId}`, `sub-${userId}`, userId, at, at)
      .run();
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
    ]);
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
    const pem = btoa(String.fromCharCode(...pkcs8));
    const revoked: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const form = new URLSearchParams(typeof init?.body === 'string' ? init.body : '');
      revoked.push(`${url} ${form.get('token')}`);
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    const withKey = {
      ...env,
      APPLE_TEAM_ID: 'TEAM123456',
      APPLE_KEY_ID: 'KEY1234567',
      APPLE_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`,
    } as Bindings;
    await deleteAccount(withKey, userId, Date.now());
    expect(revoked).toEqual(['https://appleid.apple.com/auth/revoke refresh-1']);
    expect((await rowsOf(userId))['users']).toBe(0);
  });

  it('needs the confirmation and a session', async () => {
    const { token } = await newGuest();
    await expectError(
      await call('/api/me/delete', { token, body: { confirm: false } }),
      400,
      'bad_request',
    );
    await expectError(
      await call('/api/me/delete', { body: { confirm: true } }),
      401,
      'unauthorized',
    );
  });
});
