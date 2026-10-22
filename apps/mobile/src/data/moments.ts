import type { EpochMs } from '@yapling/contracts';
import type { WeekOneUnlock } from '@yapling/domain';
import { z } from 'zod';

import { CACHE_KEYS, readJson, writeJson, type CacheStorage } from './storage';
import { createStore, type Store } from './store';

/*
 * What only this phone keeps about the learner's week: the between-call moments they have been
 * through (the placement chat, Linh's knock, Pip's story, the postcard, the voicemail, the season
 * map, the Plus offer, the next-episode card), and when the app was last opened, for the welcome
 * back. Both live in the data cache, so a reset or another learner's session clears them.
 */

/** The moments the burrow, the story and the season remember. */
export type SeenMoment = Extract<
  WeekOneUnlock,
  | 'placement_chat'
  | 'linh_welcome'
  | 'pip_story'
  | 'linh_postcard'
  | 'voicemail'
  | 'season_map'
  | 'plus_offer'
  | 'next_episode_peek'
>;

export const SEEN_MOMENTS: readonly SeenMoment[] = [
  'placement_chat',
  'linh_welcome',
  'pip_story',
  'linh_postcard',
  'voicemail',
  'season_map',
  'plus_offer',
  'next_episode_peek',
];

const SeenFile = z.record(z.string(), z.number());

export interface SeenState {
  /** The cache has been read: until then nothing counts as unseen. */
  readonly loaded: boolean;
  readonly seen: ReadonlySet<SeenMoment>;
}

const isMoment = (id: string): id is SeenMoment => (SEEN_MOMENTS as readonly string[]).includes(id);

/** The moments seen, each with when; a mark is never taken back (only a reset clears them). */
export class SeenMoments {
  readonly store: Store<SeenState> = createStore<SeenState>({ loaded: false, seen: new Set() });
  private at: Record<string, number> = {};
  private loading: Promise<void> | null = null;

  constructor(
    private readonly cache: CacheStorage,
    private readonly now: () => EpochMs,
  ) {}

  load(): Promise<void> {
    this.loading ??= (async () => {
      const file = (await readJson(this.cache, CACHE_KEYS.seen, SeenFile)) ?? {};
      this.at = { ...file, ...this.at };
      this.publish();
    })();
    return this.loading;
  }

  has(moment: SeenMoment): boolean {
    return this.store.get().seen.has(moment);
  }

  async mark(moments: readonly SeenMoment[]): Promise<void> {
    await this.load();
    const fresh = moments.filter((m) => this.at[m] === undefined);
    if (fresh.length === 0) return;
    const at = this.now();
    for (const m of fresh) this.at[m] = at;
    this.publish();
    await writeJson(this.cache, CACHE_KEYS.seen, this.at);
  }

  /** Forgets every mark (the cache itself is cleared by the caller). */
  reset(): void {
    this.at = {};
    this.loading = null;
    this.store.set({ loaded: true, seen: new Set() });
  }

  private publish(): void {
    this.store.set({ loaded: true, seen: new Set(Object.keys(this.at).filter(isMoment)) });
  }
}

const OpenFile = z.object({ at: z.number() });

export interface OpenState {
  /** The open log has been read. */
  readonly loaded: boolean;
  /** When the app was opened before this open; null on the first. */
  readonly previousAt: EpochMs | null;
}

/**
 * The app's opens, on the app's clock (the test menu's, in test builds): each open remembers the
 * one before it, which the welcome back and day 8's knock read.
 */
export class OpenLog {
  readonly store: Store<OpenState> = createStore<OpenState>({ loaded: false, previousAt: null });
  private last: EpochMs | null | undefined = undefined;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly cache: CacheStorage) {}

  /** An open at `at`: the open before it becomes `previousAt`. Opens at the same time count once. */
  open(at: EpochMs): Promise<void> {
    this.queue = this.queue.then(async () => {
      if (this.last === undefined)
        this.last = (await readJson(this.cache, CACHE_KEYS.lastOpen, OpenFile))?.at ?? null;
      if (this.last === at) return;
      const previousAt = this.last;
      this.last = at;
      this.store.set({ loaded: true, previousAt });
      await writeJson(this.cache, CACHE_KEYS.lastOpen, { at });
    });
    return this.queue;
  }

  reset(): void {
    this.last = null;
    this.store.set({ loaded: true, previousAt: null });
  }
}
