import { describe, expect, it } from '@jest/globals';
import type { Progress } from '@yapling/contracts';

import { CACHE_KEYS } from '../../src/data/storage';
import { emptyProgress, FakeApi, launch, newPhone } from './fake-api';

const seeded = (progress: Progress): Progress => ({
  ...progress,
  phrases: [
    {
      id: 'could-we',
      text: 'Could we push that to Friday?',
      state: 'seed',
      seedAt: 1_760_000_000_000,
      sproutAt: null,
      leafAt: null,
      bloomAt: null,
      lastUsedAt: null,
      usedOn: [],
      contexts: [],
    },
  ],
});

describe('progress sync', () => {
  it('saves over the revision the phone has and keeps the server’s answer', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const data = launch(api, phone);
    await data.start();

    const outcome = await data.progress.update(seeded);
    expect(outcome.saved).toBe(true);
    expect(outcome.progress.revision).toBe(2);
    expect(api.requests('PUT', '/api/me/progress')[0]?.body).toMatchObject({ revision: 1 });
    expect(data.progress.resource.data?.revision).toBe(2);
    const cached = JSON.parse(phone.cache.values.get(CACHE_KEYS.progress) ?? '{}') as Progress;
    expect(cached.revision).toBe(2);
  });

  it('takes the server’s copy on a stale revision, then applies the change to it', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await data.start();
    // Another phone moved the server on to revision 5, with a keepsake this phone never saw.
    const userId = data.session.state.session?.userId ?? '';
    const server: Progress = {
      ...emptyProgress(5),
      keepsakes: [
        { id: 'week-1', kind: 'week', canDoId: null, signedBy: 'pip', earnedOn: '2026-10-21' },
      ],
    };
    api.progress.set(userId, server);

    const outcome = await data.progress.update(seeded);
    const puts = api.requests('PUT', '/api/me/progress');
    expect(puts.map((p) => (p.body as Progress).revision)).toEqual([1, 5]);
    expect(outcome.saved).toBe(true);
    // The server's keepsake survived; the phone's phrase went on top of it.
    expect(outcome.progress.keepsakes).toHaveLength(1);
    expect(outcome.progress.phrases).toHaveLength(1);
    expect(outcome.progress.revision).toBe(6);
  });

  it('replaces the phone’s copy with the server’s when a single save is stale', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await data.start();
    const userId = data.session.state.session?.userId ?? '';
    api.progress.set(userId, emptyProgress(9));

    const local = data.progress.resource.data;
    expect(local?.revision).toBe(1);
    const outcome = await data.progress.save(seeded(local ?? emptyProgress()));
    expect(outcome).toEqual({ saved: false, progress: emptyProgress(9) });
    expect(data.progress.resource.data).toEqual(emptyProgress(9));
  });

  it('never queues a progress write offline', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await data.start();
    api.offline = true;
    await expect(data.progress.update(seeded)).rejects.toMatchObject({ kind: 'network' });
    expect(data.outbox.pending).toHaveLength(0);
    expect(data.progress.resource.data?.phrases).toHaveLength(0);
  });
});
