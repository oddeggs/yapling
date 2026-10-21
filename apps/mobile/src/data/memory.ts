import { MemoryItem, type MemoryCreate, type MemoryUpdate } from '@yapling/contracts';
import { z } from 'zod';

import type { ApiClient } from './client';
import { isDataError } from './errors';
import { isLocalId, type Outbox } from './outbox';
import { Resource } from './resource';
import { CACHE_KEYS, type CacheStorage } from './storage';

/*
 * "What Pip remembers", newest first. Every edit shows at once. Sent now when the API answers;
 * queued when it can't be reached; put back (and thrown) when the server refuses, such as
 * `memory_full` for a new item. An item made offline has a `local_` id until the server names it.
 */

const Items = z.array(MemoryItem).max(1_000);

let localCounter = 0;
const localId = (now: number): string =>
  `local_${now.toString(36)}${(localCounter++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export class MemoryRepo {
  readonly resource: Resource<readonly MemoryItem[]>;

  constructor(
    private readonly api: ApiClient,
    cache: CacheStorage,
    private readonly outbox: Outbox,
    private readonly now: () => number = Date.now,
  ) {
    this.resource = new Resource<readonly MemoryItem[]>({
      cache,
      key: CACHE_KEYS.memory,
      schema: Items,
      fetch: async () => (await api.listMemory()).items,
      hold: () => outbox.touches('memory'),
    });
  }

  refresh(): Promise<readonly MemoryItem[] | null> {
    return this.resource.refresh();
  }

  async create(body: MemoryCreate): Promise<MemoryItem> {
    const draft: MemoryItem = {
      id: localId(this.now()),
      text: body.text,
      category: body.category,
      createdAt: this.now(),
      sourceCallId: null,
    };
    const before = this.resource.data;
    await this.resource.setLocal((items) => [draft, ...(items ?? [])]);
    if (this.outbox.touches('memory')) {
      await this.outbox.add({ kind: 'memory.create', localId: draft.id, body });
      void this.outbox.flush();
      return draft;
    }
    try {
      const item = await this.api.createMemory(body);
      await this.replace(draft.id, item);
      return item;
    } catch (error) {
      if (isDataError(error, 'network')) {
        await this.outbox.add({ kind: 'memory.create', localId: draft.id, body });
        return draft;
      }
      await this.resource.setLocal(() => before);
      throw error;
    }
  }

  async edit(id: string, update: MemoryUpdate): Promise<void> {
    await this.optimistic(
      (items) => items.map((i) => (i.id === id ? withUpdate(i, update) : i)),
      { kind: 'memory.update', itemId: id, body: update },
      isLocalId(id) ? null : async () => this.replace(id, await this.api.updateMemory(id, update)),
    );
  }

  async remove(id: string): Promise<void> {
    await this.optimistic(
      (items) => items.filter((i) => i.id !== id),
      { kind: 'memory.delete', itemId: id },
      isLocalId(id) ? null : () => this.api.deleteMemory(id),
    );
  }

  /** Sends a queued op; answers the server's id for a created item. */
  async send(
    op:
      | { kind: 'memory.create'; localId: string; body: MemoryCreate }
      | { kind: 'memory.update'; itemId: string; body: MemoryUpdate }
      | { kind: 'memory.delete'; itemId: string },
  ): Promise<string | undefined> {
    switch (op.kind) {
      case 'memory.create': {
        const item = await this.api.createMemory(op.body);
        await this.replace(op.localId, item);
        return item.id;
      }
      case 'memory.update':
        await this.replace(op.itemId, await this.api.updateMemory(op.itemId, op.body));
        return undefined;
      case 'memory.delete':
        await this.api.deleteMemory(op.itemId);
        return undefined;
    }
  }

  /** Applies `change` now; sends with `direct` (or queues behind other memory ops). */
  private async optimistic(
    change: (items: readonly MemoryItem[]) => readonly MemoryItem[],
    queued:
      | { kind: 'memory.update'; itemId: string; body: MemoryUpdate }
      | { kind: 'memory.delete'; itemId: string },
    direct: (() => Promise<unknown>) | null,
  ): Promise<void> {
    const before = this.resource.data;
    await this.resource.setLocal((items) => change(items ?? []));
    if (direct === null || this.outbox.touches('memory')) {
      await this.outbox.add(queued);
      void this.outbox.flush();
      return;
    }
    try {
      await direct();
    } catch (error) {
      if (isDataError(error, 'network')) {
        await this.outbox.add(queued);
        return;
      }
      await this.resource.setLocal(() => before);
      throw error;
    }
  }

  /** The server's copy of an item in place of the phone's (one removed meanwhile stays removed). */
  private async replace(id: string, item: MemoryItem): Promise<void> {
    await this.resource.setLocal((items) => (items ?? []).map((i) => (i.id === id ? item : i)));
  }
}

function withUpdate(item: MemoryItem, update: MemoryUpdate): MemoryItem {
  return {
    ...item,
    ...(update.text !== undefined ? { text: update.text } : {}),
    ...(update.category !== undefined ? { category: update.category } : {}),
  };
}
