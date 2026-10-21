import type { z } from 'zod';

import { isDataError, type DataErrorKind } from './errors';
import { readJson, writeJson, type CacheStorage } from './storage';
import { createStore, type Store } from './store';

/*
 * One cached server resource: read from the cache first, then refreshed from the server, whose
 * copy always replaces the cached one. A refresh that fails keeps what the cache had.
 */

export interface ResourceState<T> {
  /** Null before anything loaded, or when the server has none (a profile before onboarding). */
  readonly data: T | null;
  readonly status: 'idle' | 'loading' | 'ready' | 'error';
  /** Where `data` came from: the phone's cache or the server just now. */
  readonly source: 'none' | 'cache' | 'server';
  /** The last refresh's failure; cleared by the next success. */
  readonly error: DataErrorKind | null;
  readonly refreshing: boolean;
}

export interface ResourceOptions<T> {
  readonly cache: CacheStorage;
  readonly key: string;
  /** What the cache holds, checked on read. */
  readonly schema: z.ZodType<T>;
  /** The server's copy; null when it has none. */
  readonly fetch: () => Promise<T | null>;
  /** While true a refresh leaves local data alone (writes for it are still queued). */
  readonly hold?: () => boolean;
}

const EMPTY = {
  data: null,
  status: 'idle',
  source: 'none',
  error: null,
  refreshing: false,
} as const;

export class Resource<T> {
  readonly store: Store<ResourceState<T>> = createStore<ResourceState<T>>(EMPTY);
  private refreshingNow: Promise<T | null> | null = null;
  private cacheRead: Promise<void> | null = null;
  /** Bumped by every local change, so a refresh begun before it doesn't undo it. */
  private epoch = 0;

  constructor(private readonly opts: ResourceOptions<T>) {}

  get state(): ResourceState<T> {
    return this.store.get();
  }

  get data(): T | null {
    return this.store.get().data;
  }

  /** The cached copy, once per launch. */
  loadCache(): Promise<void> {
    this.cacheRead ??= (async () => {
      const epoch = this.epoch;
      const cached = await readJson(this.opts.cache, this.opts.key, this.opts.schema);
      if (cached === null || epoch !== this.epoch || this.state.source === 'server') return;
      this.store.set((s) => ({ ...s, data: cached, status: 'ready', source: 'cache' }));
    })();
    return this.cacheRead;
  }

  /** The cache first, then the server. Throws only for callers that await it; state has it too. */
  async refresh(): Promise<T | null> {
    await this.loadCache();
    this.refreshingNow ??= this.fetchNow().finally(() => {
      this.refreshingNow = null;
    });
    return this.refreshingNow;
  }

  /** Reads through: the cache answers at once and a refresh follows in the background. */
  async read(): Promise<T | null> {
    await this.loadCache();
    void this.refresh().catch(() => undefined);
    return this.data;
  }

  /** A copy the server just answered with (a write's result). */
  async setFromServer(data: T | null): Promise<void> {
    this.epoch += 1;
    this.store.set((s) => ({ ...s, data, status: 'ready', source: 'server', error: null }));
    await writeJson(this.opts.cache, this.opts.key, data);
  }

  /** A local change ahead of the server (optimistic, or queued offline); kept in the cache too. */
  async setLocal(update: (data: T | null) => T | null): Promise<T | null> {
    this.epoch += 1;
    const next = update(this.data);
    this.store.set((s) => ({ ...s, data: next, status: 'ready' }));
    await writeJson(this.opts.cache, this.opts.key, next);
    return next;
  }

  /** Forgets the copy in memory (the caller clears the cache): account deletion, another learner. */
  reset(): void {
    this.epoch += 1;
    this.cacheRead = Promise.resolve();
    this.store.set(EMPTY);
  }

  private async fetchNow(): Promise<T | null> {
    const epoch = this.epoch;
    this.store.set((s) => ({
      ...s,
      refreshing: true,
      status: s.status === 'idle' ? 'loading' : s.status,
    }));
    try {
      const data = await this.opts.fetch();
      if (epoch !== this.epoch || this.opts.hold?.() === true) {
        this.store.set((s) => ({ ...s, refreshing: false }));
        return this.data;
      }
      await this.setFromServer(data);
      this.store.set((s) => ({ ...s, refreshing: false }));
      return data;
    } catch (error) {
      const kind = isDataError(error) ? error.kind : 'server';
      this.store.set((s) => ({
        ...s,
        refreshing: false,
        error: kind,
        status: s.data === null && s.source !== 'server' ? 'error' : 'ready',
      }));
      throw error;
    }
  }
}
