import { LIMITS, MemoryItem, MemoryList } from '@yapling/contracts';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { call, expectError, expectJson, newGuest } from '../auth/testing/client';
import { addMemory } from './store';

async function list(token: string): Promise<MemoryItem[]> {
  return MemoryList.parse(await expectJson(await call('/api/me/memory', { token }))).items;
}

async function create(token: string, body: unknown): Promise<MemoryItem> {
  return MemoryItem.parse(await expectJson(await call('/api/me/memory', { body, token }), 201));
}

describe('the memory page', () => {
  it('lists, adds, edits and forgets items', async () => {
    const { token } = await newGuest();
    expect(await list(token)).toEqual([]);

    const cat = await create(token, { text: 'Has a cat called Mochi', category: 'about_you' });
    expect(cat).toMatchObject({ category: 'about_you', sourceCallId: null });
    const interview = await create(token, {
      text: 'Interview Thursday 10:00',
      category: 'coming_up',
    });
    expect((await list(token)).map((item) => item.id)).toEqual([interview.id, cat.id]);

    const edited = MemoryItem.parse(
      await expectJson(
        await call(`/api/me/memory/${cat.id}`, {
          method: 'PATCH',
          body: { text: 'Has two cats' },
          token,
        }),
      ),
    );
    expect(edited).toEqual({ ...cat, text: 'Has two cats' });
    const moved = MemoryItem.parse(
      await expectJson(
        await call(`/api/me/memory/${cat.id}`, {
          method: 'PATCH',
          body: { category: 'about_us' },
          token,
        }),
      ),
    );
    expect(moved).toEqual({ ...edited, category: 'about_us' });

    const gone = await call(`/api/me/memory/${cat.id}`, { method: 'DELETE', token });
    expect(gone.status).toBe(204);
    expect(await list(token)).toEqual([interview]);
    // Forgetting it again is no error.
    expect((await call(`/api/me/memory/${cat.id}`, { method: 'DELETE', token })).status).toBe(204);
  });

  it('shows items the post-call summary found, with their call', async () => {
    const { token, userId } = await newGuest();
    const item = await addMemory(
      env.DB,
      userId,
      { text: 'Pip hates seagulls', category: 'about_us', sourceCallId: 'call_01' },
      Date.now(),
    );
    expect(await list(token)).toEqual([item]);
  });

  it('keeps each learner to their own items', async () => {
    const owner = await newGuest();
    const other = await newGuest();
    const item = await create(owner.token, { text: 'Works in logistics', category: 'about_you' });
    expect(await list(other.token)).toEqual([]);
    await expectError(
      await call(`/api/me/memory/${item.id}`, {
        method: 'PATCH',
        body: { text: 'Mine now' },
        token: other.token,
      }),
      404,
      'not_found',
    );
    await call(`/api/me/memory/${item.id}`, { method: 'DELETE', token: other.token });
    expect(await list(owner.token)).toEqual([item]);
  });

  it('refuses bad bodies, unknown ids and a full page', async () => {
    const { token, userId } = await newGuest();
    await expectError(
      await call('/api/me/memory', { body: { text: 'Mochi' }, token }),
      400,
      'bad_request',
    );
    await expectError(
      await call('/api/me/memory', {
        body: { text: 'x'.repeat(501), category: 'about_you' },
        token,
      }),
      400,
      'bad_request',
    );
    const item = await create(token, { text: 'Mochi', category: 'about_you' });
    await expectError(
      await call(`/api/me/memory/${item.id}`, { method: 'PATCH', body: {}, token }),
      400,
      'bad_request',
    );
    await expectError(
      await call('/api/me/memory/m_nope', { method: 'PATCH', body: { text: 'x' }, token }),
      404,
      'not_found',
    );

    const now = Date.now();
    const fill = Array.from({ length: LIMITS.memoryItemsMax - 1 }, (_, i) =>
      env.DB.prepare(
        `INSERT INTO memory_items (id, user_id, text, category, created_at, updated_at)
         VALUES (?, ?, 'x', 'about_you', ?, ?)`,
      ).bind(`fill-${userId}-${i}`, userId, now, now),
    );
    await env.DB.batch(fill);
    await expectError(
      await call('/api/me/memory', { body: { text: 'One more', category: 'about_you' }, token }),
      409,
      'memory_full',
    );
  });

  it('needs a session', async () => {
    await expectError(await call('/api/me/memory'), 401, 'unauthorized');
    await expectError(
      await call('/api/me/memory', { body: { text: 'x', category: 'about_you' } }),
      401,
      'unauthorized',
    );
    await expectError(
      await call('/api/me/memory/m_1', { method: 'PATCH', body: { text: 'x' } }),
      401,
      'unauthorized',
    );
    await expectError(await call('/api/me/memory/m_1', { method: 'DELETE' }), 401, 'unauthorized');
  });
});
