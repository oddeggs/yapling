import { describe, expect, it, jest } from '@jest/globals';

import { CACHE_KEYS, memoryCacheStorage } from '../../src/data/storage';
import { SettlingStore } from '../../src/features/burrow/settling-store';
import { FakeApi, launch, newPhone, profileInput, type Phone } from './fake-api';

// The store's default instance is on the phone's SQLite, which these tests never open.
jest.mock('expo-sqlite', () => ({}));

/*
 * The test menu's reset while a learner's write is still on its way: the answer comes back for
 * the learner before, and must never become the next learner's (a new Visitor once showed the
 * last learner's story start).
 */

/**
 * A phone whose answers to one route can be held: `hold` starts holding, `release` lets them
 * through, so a test can reset while one is on its way.
 */
function heldPhone(api: FakeApi, phone: Phone) {
  const held: (() => void)[] = [];
  let route: string | null = null;
  const fetch = ((input: string, init?: RequestInit) => {
    const answer = api.fetch(input, init);
    if (route !== `${init?.method ?? 'GET'} ${new URL(input).pathname}`) return answer;
    return new Promise((resolve) => held.push(() => resolve(answer)));
  }) as typeof globalThis.fetch;
  const data = launch({ fetch, now: api.now } as FakeApi, phone);
  return {
    data,
    hold: (method: string, path: string) => {
      route = `${method} ${path}`;
    },
    waiting: () => held.length,
    release: () => {
      route = null;
      for (const go of held.splice(0)) go();
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('a reset while a write is on its way', () => {
  it('drops the profile the server answers for the learner before', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const gate = heldPhone(api, phone);
    const { data } = gate;
    await data.start();
    await data.profile.put({ ...profileInput, startPath: 'visitor' });
    const before = data.session.state.session?.userId;

    gate.hold('PATCH', '/api/me/profile');
    const patching = data.profile.patch({ storyStartedOn: '2026-10-23' }).catch(() => null);
    await flush();
    expect(gate.waiting()).toBe(1);

    await data.resetLocal();
    gate.release();
    await patching;

    expect(data.profile.resource.data).toBeNull();
    expect(phone.cache.values.has(CACHE_KEYS.profile)).toBe(false);

    // The next learner starts afresh: no story start, no start path, from anyone.
    await data.startGuest();
    expect(data.session.state.session?.userId).not.toBe(before);
    expect(data.profile.resource.data).toBeNull();
    const next = await data.profile.put(profileInput);
    expect(next.storyStartedOn ?? null).toBeNull();
    expect(data.profile.resource.data?.storyStartedOn ?? null).toBeNull();
  });

  it('drops the progress the server answers for the learner before', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const gate = heldPhone(api, phone);
    const { data } = gate;
    await data.start();
    await data.progress.refresh();

    gate.hold('PUT', '/api/me/progress');
    const chapter = { chapter: 1, doneOn: '2026-10-21', callRecordId: null };
    const saving = data.progress
      .update((p) => ({ ...p, settlingChaptersDone: [chapter] }))
      .catch(() => null);
    await flush();
    expect(gate.waiting()).toBe(1);

    await data.resetLocal();
    gate.release();
    await saving;

    expect(data.progress.resource.data).toBeNull();
    await data.startGuest();
    const fresh = await data.progress.refresh();
    expect(fresh?.settlingChaptersDone).toEqual([]);
  });

  it('asks nothing for the learner before once their copy is forgotten', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const data = launch(api, phone);
    await data.start();
    await data.profile.put({ ...profileInput, storyStartedOn: '2026-10-23' });
    // A screen refreshing the moment the profile is forgotten (the burrow coming back into focus).
    const refreshes: Promise<unknown>[] = [];
    const stop = data.profile.resource.store.subscribe(() => {
      if (data.profile.resource.data === null && refreshes.length === 0)
        refreshes.push(data.profile.refresh().catch(() => null));
    });
    await data.resetLocal();
    await Promise.all(refreshes);
    stop();
    expect(refreshes).toHaveLength(1);
    expect(data.profile.resource.data).toBeNull();
    expect(phone.cache.values.has(CACHE_KEYS.profile)).toBe(false);
  });
});

describe('the phone’s Settling-in copy across learners', () => {
  it('keeps a late write for the learner before out of the next learner’s copy', async () => {
    const cache = memoryCacheStorage();
    const store = new SettlingStore(cache);
    await store.update('user-a', (s) => ({ ...s, visitor: true, storyStartedOn: '2026-10-20' }));

    // The next learner: the new Visitor's copy is read and seeded.
    await store.load('user-b');
    await store.update('user-b', (s) => ({ ...s, visitor: true }));
    // A write for the learner before lands late.
    await store.update('user-a', (s) => ({ ...s, restedOn: '2026-10-21' }));

    const state = store.store.get();
    expect(state.userId).toBe('user-b');
    expect(state.loaded).toBe(true);
    expect(state.value.storyStartedOn).toBeNull();
    expect(JSON.parse(cache.values.get('settling:user-a') ?? '{}')).toMatchObject({
      storyStartedOn: '2026-10-20',
      restedOn: '2026-10-21',
    });
    expect(JSON.parse(cache.values.get('settling:user-b') ?? '{}')).toMatchObject({
      visitor: true,
      storyStartedOn: null,
    });
  });

  it('writes the next learner’s seed before the burrow reads them, without taking the store', async () => {
    const cache = memoryCacheStorage();
    const store = new SettlingStore(cache);
    await store.update('user-a', (s) => ({ ...s, storyStartedOn: '2026-10-20' }));
    // The test menu's new Visitor is seeded while the store still holds the learner before.
    await store.update('user-b', (s) => ({ ...s, visitor: true }));
    expect(store.store.get().userId).toBe('user-a');
    await store.load('user-b');
    expect(store.store.get()).toMatchObject({
      userId: 'user-b',
      loaded: true,
      value: { visitor: true, storyStartedOn: null },
    });
  });

  it('waits for a read in flight before writing, so the stored copy is never written over', async () => {
    const cache = memoryCacheStorage({
      'settling:user-a': JSON.stringify({
        visitor: true,
        chapters: [{ chapter: 1, doneOn: '2026-10-20', callRecordId: null }],
        storyStartedOn: null,
        restedOn: null,
        goodnightOn: null,
      }),
    });
    const store = new SettlingStore(cache);
    const loading = store.load('user-a');
    await store.update('user-a', (s) => ({ ...s, restedOn: '2026-10-21' }));
    await loading;
    expect(JSON.parse(cache.values.get('settling:user-a') ?? '{}')).toMatchObject({
      visitor: true,
      chapters: [{ chapter: 1 }],
      restedOn: '2026-10-21',
    });
  });
});
