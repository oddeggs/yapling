import { describe, expect, it } from '@jest/globals';

import { fold, type OutboxOp } from '../../src/data/outbox';
import { CACHE_KEYS } from '../../src/data/storage';
import { FakeApi, launch, newPhone, profileInput, settle } from './fake-api';

async function onboarded() {
  const api = new FakeApi();
  const phone = newPhone();
  const data = launch(api, phone);
  await data.start();
  await data.profile.put(profileInput);
  const userId = data.session.state.session?.userId ?? '';
  return { api, phone, data, userId };
}

describe('writes made offline', () => {
  it('queues a profile patch, shows it at once, and keeps it across a relaunch', async () => {
    const { api, phone, data, userId } = await onboarded();
    api.offline = true;
    const shown = await data.profile.patch({ displayName: 'Lan Anh' });
    expect(shown?.displayName).toBe('Lan Anh');
    expect(data.outbox.pending.map((op) => op.kind)).toEqual(['profile.patch']);
    data.stop();

    // Relaunched, still offline: the patch and the patched profile are both still there.
    const again = launch(api, phone);
    await again.start();
    expect(again.profile.resource.data?.displayName).toBe('Lan Anh');
    expect(again.outbox.pending).toHaveLength(1);

    // The API comes back: the queue goes first, then the server's copy.
    api.offline = false;
    await again.resume();
    expect(again.outbox.pending).toHaveLength(0);
    expect(api.profiles.get(userId)?.displayName).toBe('Lan Anh');
    expect(again.profile.resource.state).toMatchObject({ source: 'server', error: null });
    expect(phone.cache.values.has(CACHE_KEYS.outbox)).toBe(false);
  });

  it('sends the queue as soon as any request is answered again', async () => {
    const { api, data, userId } = await onboarded();
    api.offline = true;
    await data.profile.patch({ track: 'work' });
    api.offline = false;
    await data.minutes.refresh();
    await settle();
    expect(api.profiles.get(userId)?.track).toBe('work');
  });

  it('keeps later writes behind earlier ones, so they reach the server in order', async () => {
    const { api, data, userId } = await onboarded();
    api.offline = true;
    await data.profile.patch({ displayName: 'Lan Anh' });
    api.offline = false;
    // Online again, but this patch waits behind the queued one.
    await data.profile.patch({ displayName: 'Anh' });
    await settle();
    await data.outbox.flush();
    expect(api.profiles.get(userId)?.displayName).toBe('Anh');
    expect(api.requests('PATCH', '/api/me/profile').at(-1)?.body).toEqual({ displayName: 'Anh' });
  });

  it('names an item made offline once the server has made it, for the edits after it', async () => {
    const { api, data, userId } = await onboarded();
    api.offline = true;
    const draft = await data.memory.create({ text: 'Has a cat', category: 'about_you' });
    expect(draft.id).toMatch(/^local_/);
    await data.memory.edit(draft.id, { text: 'Has two cats' });
    // The edit folded into the waiting create.
    expect(data.outbox.pending).toHaveLength(1);
    await data.memory.create({ text: 'Exam on Friday', category: 'coming_up' });
    expect(data.memory.resource.data?.map((i) => i.text)).toEqual([
      'Exam on Friday',
      'Has two cats',
    ]);

    api.offline = false;
    await data.resume();
    const server = api.memory.get(userId) ?? [];
    expect(server.map((i) => i.text)).toEqual(['Exam on Friday', 'Has two cats']);
    expect(data.memory.resource.data?.every((i) => !i.id.startsWith('local_'))).toBe(true);
  });

  it('drops a queued write the server refuses, and the server’s copy wins', async () => {
    const { api, data, userId } = await onboarded();
    api.offline = true;
    await data.memory.create({ text: 'Likes pho', category: 'about_you' });
    api.offline = false;
    api.memoryLimit = 0;
    await data.resume();
    await settle();
    expect(data.outbox.pending).toHaveLength(0);
    expect(data.outbox.store.get().dropped).toEqual({
      kind: 'memory.create',
      error: 'memory_full',
    });
    expect(api.memory.get(userId) ?? []).toHaveLength(0);
    expect(data.memory.resource.data).toEqual([]);
  });
});

describe('memory edits', () => {
  it('shows an edit at once and sends it', async () => {
    const { api, data, userId } = await onboarded();
    const item = await data.memory.create({ text: 'Works at a bank', category: 'about_you' });
    const editing = data.memory.edit(item.id, { category: 'about_us' });
    expect(data.memory.resource.data?.[0]?.category).toBe('about_us');
    await editing;
    expect(api.memory.get(userId)?.[0]?.category).toBe('about_us');
  });

  it('puts an edit back when the server refuses it', async () => {
    const { api, data } = await onboarded();
    const item = await data.memory.create({ text: 'Works at a bank', category: 'about_you' });
    api.answerNext('PATCH', `/api/me/memory/${item.id}`, {
      status: 404,
      body: { error: { code: 'not_found' } },
    });
    await expect(data.memory.edit(item.id, { text: 'Works at a school' })).rejects.toMatchObject({
      kind: 'not_found',
    });
    expect(data.memory.resource.data?.[0]?.text).toBe('Works at a bank');
  });

  it('puts a new item back out when memory is full', async () => {
    const { api, data } = await onboarded();
    api.memoryLimit = 0;
    await expect(
      data.memory.create({ text: 'Likes pho', category: 'about_you' }),
    ).rejects.toMatchObject({ kind: 'memory_full' });
    expect(data.memory.resource.data).toEqual([]);
    expect(data.outbox.pending).toHaveLength(0);
  });

  it('deletes at once, and restores the item when the delete fails', async () => {
    const { api, data, userId } = await onboarded();
    const item = await data.memory.create({ text: 'Works at a bank', category: 'about_you' });
    api.answerNext('DELETE', `/api/me/memory/${item.id}`, {
      status: 500,
      body: { error: { code: 'internal' } },
    });
    await expect(data.memory.remove(item.id)).rejects.toMatchObject({ kind: 'server' });
    expect(data.memory.resource.data).toHaveLength(1);
    await data.memory.remove(item.id);
    expect(data.memory.resource.data).toHaveLength(0);
    expect(api.memory.get(userId)).toHaveLength(0);
  });
});

describe('folding the queue', () => {
  const create: OutboxOp = {
    id: 'a',
    kind: 'memory.create',
    localId: 'local_1',
    body: { text: 'Has a cat', category: 'about_you' },
  };

  it('merges consecutive profile patches', () => {
    const ops = fold([{ id: 'a', kind: 'profile.patch', body: { displayName: 'A' } }], {
      id: 'b',
      kind: 'profile.patch',
      body: { track: 'work' },
    });
    expect(ops).toEqual([
      { id: 'a', kind: 'profile.patch', body: { displayName: 'A', track: 'work' } },
    ]);
  });

  it('drops an item made and deleted offline entirely', () => {
    expect(fold([create], { id: 'b', kind: 'memory.delete', itemId: 'local_1' })).toEqual([]);
  });

  it('keeps an edit of a server item as its own op', () => {
    const edit: OutboxOp = { id: 'b', kind: 'memory.update', itemId: 'mem9', body: { text: 'x' } };
    expect(fold([create], edit)).toEqual([create, edit]);
  });
});
