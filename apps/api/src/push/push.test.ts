import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { call, expectError, newGuest } from '../auth/testing/client';
import { pushTokensOf } from './store';

function expoToken(): string {
  return `ExponentPushToken[${crypto.randomUUID()}]`;
}

function send(method: 'PUT' | 'DELETE', body: unknown, token?: string) {
  return call('/api/me/push-token', { method, body, ...(token === undefined ? {} : { token }) });
}

describe('push tokens', () => {
  it('registers and unregisters a phone', async () => {
    const { token, userId } = await newGuest();
    const phone = { token: expoToken(), platform: 'ios' };
    expect((await send('PUT', phone, token)).status).toBe(204);
    expect((await send('PUT', phone, token)).status).toBe(204);
    expect(await pushTokensOf(env.DB, userId)).toEqual([phone]);

    expect((await send('DELETE', phone, token)).status).toBe(204);
    expect(await pushTokensOf(env.DB, userId)).toEqual([]);
    expect((await send('DELETE', phone, token)).status).toBe(204);
  });

  it('moves a phone to the learner who registered it last', async () => {
    const first = await newGuest();
    const second = await newGuest();
    const phone = { token: expoToken(), platform: 'ios' };
    await send('PUT', phone, first.token);
    await send('PUT', phone, second.token);
    expect(await pushTokensOf(env.DB, first.userId)).toEqual([]);
    expect(await pushTokensOf(env.DB, second.userId)).toEqual([phone]);
    // The first learner can no longer stop the second's pushes.
    await send('DELETE', phone, first.token);
    expect(await pushTokensOf(env.DB, second.userId)).toEqual([phone]);
  });

  it('refuses a token that is not an Expo push token', async () => {
    const { token } = await newGuest();
    await expectError(
      await send('PUT', { token: 'abc', platform: 'ios' }, token),
      400,
      'bad_request',
    );
    await expectError(
      await send('PUT', { token: expoToken(), platform: 'web' }, token),
      400,
      'bad_request',
    );
  });

  it('needs a session', async () => {
    const phone = { token: expoToken(), platform: 'android' };
    await expectError(await send('PUT', phone), 401, 'unauthorized');
    await expectError(await send('DELETE', phone), 401, 'unauthorized');
  });
});
