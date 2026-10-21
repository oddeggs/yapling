import { describe, expect, it } from '@jest/globals';
import type { Session } from '@yapling/contracts';

import { DataError } from '../../src/data/errors';
import { SECRET_KEYS } from '../../src/data/storage';
import { FakeApi, launch, newPhone } from './fake-api';

const appleBody = {
  identityToken: 'apple-identity-token-0000',
  nonce: 'nonce-0000000000000000',
  authorizationCode: null,
};

describe('the session', () => {
  it('makes a guest on first launch and keeps the install id and token in the keychain', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const data = launch(api, phone);
    await data.start();

    const state = data.session.state;
    expect(state.status).toBe('ready');
    expect(state.session?.kind).toBe('guest');
    const guest = api.requests('POST', '/api/session/guest');
    expect(guest).toHaveLength(1);
    const installId = phone.secrets.values.get(SECRET_KEYS.installId);
    expect(guest[0]?.body).toEqual({ installId, clientVersion: '0.1.0', ageConfirmed: true });
    expect(JSON.parse(phone.secrets.values.get(SECRET_KEYS.session) ?? '{}')).toEqual(
      state.session,
    );
    // Every request after it carries the token.
    expect(api.requests('GET', '/api/me/progress')[0]?.token).toBe(state.session?.token);
    await expect(data.getSessionToken()).resolves.toBe(state.session?.token);
  });

  it('reuses the stored session on the next launch without asking again', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    await launch(api, phone).start();
    const token = launch(api, phone);
    await token.start();
    expect(api.requests('POST', '/api/session/guest')).toHaveLength(1);
  });

  it('asks for one guest when many requests start at once', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await Promise.all([data.getSessionToken(), data.getSessionToken(), data.progress.refresh()]);
    expect(api.requests('POST', '/api/session/guest')).toHaveLength(1);
  });

  it('replaces a refused guest token with a new session for the same guest', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const data = launch(api, phone);
    await data.start();
    const before = data.session.state.session;
    api.expireSessions();

    await Promise.all([data.progress.refresh(), data.minutes.refresh()]);
    const after = data.session.state.session;
    expect(after?.userId).toBe(before?.userId);
    expect(after?.token).not.toBe(before?.token);
    // Both refused requests share one renewal.
    expect(api.requests('POST', '/api/session/guest')).toHaveLength(2);
    const stored = JSON.parse(phone.secrets.values.get(SECRET_KEYS.session) ?? '{}') as Session;
    expect(stored.token).toBe(after?.token);
  });

  it('links Apple with the guest token, keeping the same learner', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await data.start();
    const guest = data.session.state.session;
    const apple = await data.linkApple(appleBody);
    expect(api.requests('POST', '/api/session/apple')[0]?.token).toBe(guest?.token);
    expect(apple.kind).toBe('apple');
    expect(apple.userId).toBe(guest?.userId);
    expect(data.session.state.session).toEqual(apple);
  });

  it('signs out, rather than becoming a new guest, when an Apple session ends', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await data.start();
    await data.linkApple(appleBody);
    api.expireSessions();
    const guests = api.requests('POST', '/api/session/guest').length;

    await expect(data.progress.refresh()).rejects.toEqual(new DataError('unauthorized', 401));
    expect(data.session.state.status).toBe('signed_out');
    await expect(data.getSessionToken()).rejects.toBeInstanceOf(DataError);
    expect(api.requests('POST', '/api/session/guest')).toHaveLength(guests);
  });

  it('starts offline without a session and makes one when the API answers', async () => {
    const api = new FakeApi();
    api.offline = true;
    const data = launch(api, newPhone());
    await data.start();
    expect(data.session.state).toMatchObject({
      status: 'offline',
      session: null,
      error: 'network',
    });
    expect(data.connectivity.online).toBe(false);

    api.offline = false;
    await data.resume();
    expect(data.session.state.status).toBe('ready');
    expect(data.connectivity.online).toBe(true);
  });
});
