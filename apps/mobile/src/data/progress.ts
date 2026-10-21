import { Progress } from '@yapling/contracts';

import type { ApiClient } from './client';
import { isDataError } from './errors';
import { Resource } from './resource';
import { CACHE_KEYS, type CacheStorage } from './storage';

/*
 * Progress: what the burrow, the week and the Me sheet show. The phone keeps the server's copy for
 * offline reading. A write is based on the revision the phone last saw; when the server has moved
 * on it answers 409 `stale_revision`, and the phone reads the server's copy, which replaces its
 * own. Progress writes never queue offline.
 */

export type ProgressSave =
  | { readonly saved: true; readonly progress: Progress }
  /** The server had a newer revision; `progress` is its copy, now the phone's too. */
  | { readonly saved: false; readonly progress: Progress };

export class ProgressRepo {
  readonly resource: Resource<Progress>;

  constructor(
    private readonly api: ApiClient,
    cache: CacheStorage,
  ) {
    this.resource = new Resource({
      cache,
      key: CACHE_KEYS.progress,
      schema: Progress,
      fetch: () => api.getProgress(),
    });
  }

  refresh(): Promise<Progress | null> {
    return this.resource.refresh();
  }

  /**
   * Saves `next`, made from the copy the phone has (its `revision` is the base). Throws `network`
   * offline and leaves the phone's copy as it was.
   */
  async save(next: Progress): Promise<ProgressSave> {
    try {
      const progress = await this.api.putProgress(next);
      await this.resource.setFromServer(progress);
      return { saved: true, progress };
    } catch (error) {
      if (!isDataError(error, 'stale_revision')) throw error;
      const server = await this.api.getProgress();
      await this.resource.setFromServer(server);
      return { saved: false, progress: server };
    }
  }

  /**
   * Changes the phone's copy with `change` and saves it; on a stale revision `change` is applied
   * once more to the server's copy and saved again.
   */
  async update(change: (current: Progress) => Progress): Promise<ProgressSave> {
    const current = this.resource.data ?? (await this.refresh());
    if (current === null) throw new Error('progress has not loaded');
    const first = await this.save(change(current));
    if (first.saved) return first;
    return this.save(change(first.progress));
  }
}
