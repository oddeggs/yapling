import { CallRecord, MinutesSummary } from '@yapling/contracts';
import { z } from 'zod';

import type { ApiClient } from './client';
import { Resource } from './resource';
import { CACHE_KEYS, type CacheStorage } from './storage';

/** The live-minute balance: the server owns the ledger; the phone only shows its last answer. */
export function minutesResource(api: ApiClient, cache: CacheStorage): Resource<MinutesSummary> {
  return new Resource({
    cache,
    key: CACHE_KEYS.minutes,
    schema: MinutesSummary,
    fetch: () => api.getMinutes(),
  });
}

const Calls = z.array(CallRecord).max(100);

/** Past calls, newest first, and each call's record (its summary arrives after the call). */
export class CallsRepo {
  readonly list: Resource<readonly CallRecord[]>;
  private readonly details = new Map<string, Resource<CallRecord>>();

  constructor(
    private readonly api: ApiClient,
    private readonly cache: CacheStorage,
  ) {
    this.list = new Resource<readonly CallRecord[]>({
      cache,
      key: CACHE_KEYS.calls,
      schema: Calls,
      fetch: async () => (await api.listCalls()).calls,
    });
  }

  refresh(): Promise<readonly CallRecord[] | null> {
    return this.list.refresh();
  }

  /** One call's record, cached on its own (the post-call screen polls it for the summary). */
  detail(id: string): Resource<CallRecord> {
    let resource = this.details.get(id);
    if (resource === undefined) {
      resource = new Resource({
        cache: this.cache,
        key: CACHE_KEYS.call(id),
        schema: CallRecord,
        fetch: () => this.api.getCall(id),
      });
      this.details.set(id, resource);
    }
    return resource;
  }

  reset(): void {
    this.list.reset();
    for (const r of this.details.values()) r.reset();
    this.details.clear();
  }
}
