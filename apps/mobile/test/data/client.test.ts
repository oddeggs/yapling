import { describe, expect, it } from '@jest/globals';

import { createApiClient, createSessionApi, type TokenSource } from '../../src/data/client';
import { DataError } from '../../src/data/errors';
import { createHttp, originOf } from '../../src/data/http';
import { BASE, FakeApi, profileInput } from './fake-api';

const fixedToken = (
  token: string,
  renewed = 'renewed-token-0000000',
): TokenSource & {
  renewals: string[];
} => {
  const renewals: string[] = [];
  return {
    renewals,
    token: () => Promise.resolve(token),
    renew: (refused) => {
      renewals.push(refused);
      return Promise.resolve(renewed);
    },
  };
};

async function signedIn(api: FakeApi) {
  const http = createHttp({ base: BASE, fetch: api.fetch });
  const session = await createSessionApi(http).guestSession({
    installId: '00000000-0000-4000-8000-00000000abcd',
    clientVersion: '0.1.0',
    ageConfirmed: true,
  });
  return { http, session, client: createApiClient(http, fixedToken(session.token)) };
}

const kindOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    (error: unknown) => (error instanceof DataError ? error.kind : 'other'),
  );

describe('the API client', () => {
  it('puts each route under the host of the configured base', () => {
    expect(originOf('http://127.0.0.1:8787/api')).toBe('http://127.0.0.1:8787');
    expect(originOf('https://api.example.com/api/')).toBe('https://api.example.com');
    expect(originOf('https://api.example.com')).toBe('https://api.example.com');
  });

  it('sends the bearer and answers the parsed body', async () => {
    const api = new FakeApi();
    const { client, session } = await signedIn(api);
    const profile = await client.putProfile(profileInput);
    expect(profile.displayName).toBe('Lan');
    expect(profile.revision).toBe(1);
    const put = api.requests('PUT', '/api/me/profile')[0];
    expect(put?.token).toBe(session.token);
    expect(put?.body).toEqual(profileInput);
  });

  it('refuses a body that fails its schema before sending it', async () => {
    const api = new FakeApi();
    const { client } = await signedIn(api);
    const before = api.calls.length;
    expect(await kindOf(client.patchProfile({}))).toBe('validation');
    expect(await kindOf(client.createMemory({ text: '', category: 'about_you' }))).toBe(
      'validation',
    );
    expect(api.calls.length).toBe(before);
  });

  it('refuses an answer that fails its schema', async () => {
    const api = new FakeApi();
    const { client } = await signedIn(api);
    api.answerNext('GET', '/api/me/minutes', { status: 200, body: { plan: 'gold' } });
    expect(await kindOf(client.getMinutes())).toBe('validation');
  });

  it('tells the errors apart', async () => {
    const api = new FakeApi();
    const { client } = await signedIn(api);
    expect(await kindOf(client.getProfile())).toBe('not_found');
    api.answerNext('GET', '/api/me/minutes', {
      status: 503,
      body: { error: { code: 'unavailable' } },
    });
    expect(await kindOf(client.getMinutes())).toBe('unavailable');
    api.answerNext('GET', '/api/me/minutes', {
      status: 500,
      body: { error: { code: 'internal' } },
    });
    expect(await kindOf(client.getMinutes())).toBe('server');
    api.answerNext('GET', '/api/me/minutes', { status: 502 });
    expect(await kindOf(client.getMinutes())).toBe('server');
    api.memoryLimit = 0;
    expect(
      await kindOf(client.createMemory({ text: 'Works at a bank', category: 'about_you' })),
    ).toBe('memory_full');
    const progress = await client.getProgress();
    expect(await kindOf(client.putProgress({ ...progress, revision: 7 }))).toBe('stale_revision');
    api.offline = true;
    expect(await kindOf(client.getProgress())).toBe('network');
  });

  it('answers nothing for a 204', async () => {
    const api = new FakeApi();
    const { client } = await signedIn(api);
    await expect(
      client.registerPushToken({ token: 'ExponentPushToken[abc]', platform: 'ios' }),
    ).resolves.toBeUndefined();
    await expect(client.deleteMemory('mem1')).resolves.toBeUndefined();
    expect(api.requests('DELETE', '/api/me/memory/mem1')).toHaveLength(1);
  });

  it('renews a refused session once and sends again with the new token', async () => {
    const api = new FakeApi();
    const http = createHttp({ base: BASE, fetch: api.fetch });
    const sessions = createSessionApi(http);
    const installId = '00000000-0000-4000-8000-00000000beef';
    const first = await sessions.guestSession({
      installId,
      clientVersion: '0.1.0',
      ageConfirmed: true,
    });
    api.expireSessions();
    const second = await sessions.guestSession({
      installId,
      clientVersion: '0.1.0',
      ageConfirmed: true,
    });
    const auth = fixedToken(first.token, second.token);
    const client = createApiClient(http, auth);
    await expect(client.getProgress()).resolves.toMatchObject({ revision: 1 });
    expect(auth.renewals).toEqual([first.token]);
    expect(api.requests('GET', '/api/me/progress').map((c) => c.token)).toEqual([
      first.token,
      second.token,
    ]);
  });

  it('gives up after one renewal', async () => {
    const api = new FakeApi();
    const http = createHttp({ base: BASE, fetch: api.fetch });
    const client = createApiClient(http, fixedToken('stale-token-00000000', 'still-stale-0000000'));
    expect(await kindOf(client.getProgress())).toBe('unauthorized');
    expect(api.requests('GET', '/api/me/progress')).toHaveLength(2);
  });

  it('names the call socket on the same host', async () => {
    const api = new FakeApi();
    const { client } = await signedIn(api);
    expect(client.callSocketUrl()).toBe('ws://api.test/api/calls/socket');
  });
});
