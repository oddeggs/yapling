import { LocalDate, SettlingChapterDone, SETTLING_CHAPTER_COUNT } from '@yapling/contracts';
import { z } from 'zod';

import { sqliteCache } from '../../data/sqlite-cache';
import type { CacheStorage } from '../../data/storage';
import { createStore, useStore, type Store } from '../../data/store';
import { mergeChapters } from './settling';

/*
 * What this phone keeps of Settling in, beside the server's copy: the chapters done and the
 * story's start (until the server keeps them too, and as the offline copy after), that the learner
 * started with Linh, and the day's rest and goodnight taps. It lives in the app's data cache, one
 * entry per learner, so the test menu's reset or another learner signing in starts it afresh.
 */

export const LocalSettling = z.object({
  /** The learner started with Linh (onboarding's "just starting", or "practise with Linh first"). */
  visitor: z.boolean().default(false),
  chapters: z.array(SettlingChapterDone).max(SETTLING_CHAPTER_COUNT).default([]),
  storyStartedOn: LocalDate.nullable().default(null),
  restedOn: LocalDate.nullable().default(null),
  goodnightOn: LocalDate.nullable().default(null),
});
export type LocalSettling = z.infer<typeof LocalSettling>;

export const EMPTY_SETTLING: LocalSettling = {
  visitor: false,
  chapters: [],
  storyStartedOn: null,
  restedOn: null,
  goodnightOn: null,
};

export interface LocalSettlingState {
  /** The learner this copy belongs to; null before a session. */
  readonly userId: string | null;
  /** The cache has been read for `userId`. */
  readonly loaded: boolean;
  readonly value: LocalSettling;
}

const keyOf = (userId: string) => `settling:${userId}`;

/** The phone's Settling-in copy for the signed-in learner. */
export class SettlingStore {
  readonly store: Store<LocalSettlingState> = createStore<LocalSettlingState>({
    userId: null,
    loaded: false,
    value: EMPTY_SETTLING,
  });

  constructor(private readonly cache: CacheStorage) {}

  /** Reads the learner's copy (once per learner); a copy that doesn't parse starts empty. */
  async load(userId: string): Promise<void> {
    const current = this.store.get();
    if (current.userId === userId) return;
    this.store.set({ userId, loaded: false, value: EMPTY_SETTLING });
    let value = EMPTY_SETTLING;
    try {
      const raw = await this.cache.get(keyOf(userId));
      const parsed = raw === null ? null : LocalSettling.safeParse(JSON.parse(raw));
      if (parsed?.success) value = parsed.data;
    } catch {
      // Unreadable: start empty; the server's copy and the call records fill it again.
    }
    if (this.store.get().userId !== userId) return;
    this.store.set((s) => ({ userId, loaded: true, value: mergeLocal(value, s.value) }));
  }

  /** Changes the learner's copy and writes it; a failing cache never fails the caller. */
  async update(userId: string, change: (current: LocalSettling) => LocalSettling): Promise<void> {
    await this.load(userId);
    const state = this.store.get();
    if (state.userId !== userId) return;
    const next = change(state.value);
    if (JSON.stringify(next) === JSON.stringify(state.value)) return;
    this.store.set({ ...state, value: next });
    await this.cache.set(keyOf(userId), JSON.stringify(next)).catch(() => undefined);
  }
}

/** Two copies of the same learner's record: the chapters of both, the first one's days. */
function mergeLocal(a: LocalSettling, b: LocalSettling): LocalSettling {
  return {
    visitor: a.visitor || b.visitor,
    chapters: mergeChapters(a.chapters, b.chapters),
    storyStartedOn: a.storyStartedOn ?? b.storyStartedOn,
    restedOn: a.restedOn ?? b.restedOn,
    goodnightOn: a.goodnightOn ?? b.goodnightOn,
  };
}

/** The app's one store, on the data cache. */
export const settlingStore = new SettlingStore(sqliteCache);

export function useLocalSettling(): LocalSettlingState {
  return useStore(settlingStore.store);
}

/**
 * For the screens that start Settling in (onboarding's "just starting", the "too hard" sheet's
 * "practise with Linh first"): the burrow shows the chapters from now on, even before the server
 * keeps the learner's start path.
 */
export const startSettlingIn = (userId: string): Promise<void> =>
  settlingStore.update(userId, (s) => ({ ...s, visitor: true }));

/**
 * Development only, for the test menu and links (`?visitor=1&chapters=N` on the burrow): start
 * with Linh, and mark chapters up to `upTo` done today, as if their calls had just ended.
 */
export function devSeedSettling(
  userId: string,
  seed: { readonly visitor: boolean; readonly upTo: number; readonly today: LocalDate },
): Promise<void> {
  return settlingStore.update(userId, (s) => {
    const added = Array.from({ length: Math.min(seed.upTo, SETTLING_CHAPTER_COUNT) }, (_, i) => ({
      chapter: i + 1,
      doneOn: seed.today,
      callRecordId: null,
    }));
    return { ...s, visitor: s.visitor || seed.visitor, chapters: mergeChapters(s.chapters, added) };
  });
}
