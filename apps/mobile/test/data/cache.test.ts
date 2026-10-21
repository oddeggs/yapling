import { describe, expect, it } from '@jest/globals';

import { CACHE_KEYS, SECRET_KEYS } from '../../src/data/storage';
import { FakeApi, launch, newPhone, profileInput } from './fake-api';

describe('the offline cache', () => {
  it('shows the cached profile when relaunched with the API down', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const first = launch(api, phone);
    await first.start();
    expect(first.profile.resource.state).toMatchObject({ data: null, source: 'server' });
    const saved = await first.profile.put(profileInput);
    first.stop();

    api.offline = true;
    const relaunched = launch(api, phone);
    await relaunched.start();
    expect(relaunched.profile.resource.state).toMatchObject({
      data: saved,
      source: 'cache',
      status: 'ready',
      error: 'network',
    });
    expect(relaunched.progress.resource.data?.revision).toBe(1);
    expect(relaunched.session.state.status).toBe('ready');
    expect(relaunched.connectivity.online).toBe(false);
  });

  it('answers from the cache first, then the server’s copy replaces it', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const first = launch(api, phone);
    await first.start();
    await first.profile.put(profileInput);
    // The server moved on (another phone renamed the roommate).
    const userId = first.session.state.session?.userId ?? '';
    const server = api.profiles.get(userId);
    if (server === undefined) throw new Error('no profile');
    api.profiles.set(userId, {
      ...server,
      revision: server.revision + 1,
      roommate: { species: 'redpanda', name: 'Mochi' },
    });

    const second = launch(api, phone);
    const seen: string[] = [];
    second.profile.resource.store.subscribe(() => {
      const s = second.profile.resource.state;
      const shown = s.data ? `${s.source}:${s.data.roommate.name}` : 'nothing';
      if (seen[seen.length - 1] !== shown) seen.push(shown);
    });
    const cached = await second.profile.resource.read();
    expect(cached?.roommate.name).toBe('Pip');
    await second.profile.refresh();
    expect(second.profile.resource.state.source).toBe('server');
    expect(second.profile.resource.data?.roommate.name).toBe('Mochi');
    expect(seen).toEqual(['cache:Pip', 'server:Mochi']);
  });

  it('drops a cached value that no longer matches its schema', async () => {
    const api = new FakeApi();
    api.offline = true;
    const phone = newPhone();
    phone.cache.values.set(CACHE_KEYS.profile, JSON.stringify({ displayName: 42 }));
    const data = launch(api, phone);
    await data.start();
    expect(data.profile.resource.data).toBeNull();
    expect(phone.cache.values.has(CACHE_KEYS.profile)).toBe(false);
  });

  it('starts afresh when another learner signs in on this phone', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const data = launch(api, phone);
    await data.start();
    await data.profile.put(profileInput);
    // Sign in with Apple on a phone with no guest session: another account.
    await data.session.signOut();
    await data.linkApple({
      identityToken: 'apple-identity-token-0000',
      nonce: 'nonce-0000000000000000',
      authorizationCode: null,
    });
    expect(data.session.state.session?.userId).toBe('appleuser');
    expect(data.profile.resource.data).toBeNull();
    expect(phone.cache.values.get(CACHE_KEYS.owner)).toBe('appleuser');
  });

  it('forgets everything on the phone once the account is deleted', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const data = launch(api, phone);
    await data.start();
    await data.profile.put(profileInput);
    await data.memory.create({ text: 'Works at a bank', category: 'about_you' });
    const userId = data.session.state.session?.userId;

    await data.deleteAccount();
    expect(api.requests('POST', '/api/me/delete')[0]?.body).toEqual({ confirm: true });
    expect(phone.cache.values.size).toBe(0);
    expect(phone.secrets.values.has(SECRET_KEYS.session)).toBe(false);
    expect(phone.secrets.values.has(SECRET_KEYS.installId)).toBe(false);
    expect(data.profile.resource.data).toBeNull();
    expect(data.memory.resource.data).toBeNull();
    expect(data.session.state.status).toBe('signed_out');

    // The next request makes a new guest.
    await data.resume();
    expect(data.session.state.session?.userId).not.toBe(userId);
  });
});
