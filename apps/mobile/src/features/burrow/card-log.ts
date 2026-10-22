import { LocalDate } from '@yapling/contracts';
import { useEffect } from 'react';
import { z } from 'zod';

import { sqliteCache } from '../../data/sqlite-cache';
import type { CacheStorage } from '../../data/storage';
import { createStore, useStore, type Store } from '../../data/store';

/*
 * The card at the top of the burrow on the last day it was opened, kept on this phone, so the
 * next day's card can be a different one (the card is one new thing a day, never yesterday's
 * again). One entry per learner in the app's data cache, so a reset or another learner starts
 * afresh. Losing it only means a card might repeat once.
 */

const Shown = z.object({ on: LocalDate, id: z.string() });
const CardLogFile = z.object({ last: Shown, before: Shown.nullable() });
type CardLogFile = z.infer<typeof CardLogFile>;

/** The card shown on the last day before `today` the burrow was opened; null if none. */
export function previousCardOf(log: CardLogFile | null, today: LocalDate): string | null {
  if (log === null) return null;
  if (log.last.on < today) return log.last.id;
  return log.before !== null && log.before.on < today ? log.before.id : null;
}

/** The log after `id` is shown on `today` (the day's latest card is the one kept for it). */
export function logShown(log: CardLogFile | null, today: LocalDate, id: string): CardLogFile {
  if (log === null) return { last: { on: today, id }, before: null };
  if (log.last.on === today) return { ...log, last: { on: today, id } };
  if (log.last.on > today) return log;
  return { last: { on: today, id }, before: log.last };
}

interface CardLogState {
  readonly userId: string | null;
  readonly loaded: boolean;
  readonly log: CardLogFile | null;
}

const keyOf = (userId: string) => `burrow-card:${userId}`;

export class CardLog {
  readonly store: Store<CardLogState> = createStore<CardLogState>({
    userId: null,
    loaded: false,
    log: null,
  });

  constructor(private readonly cache: CacheStorage) {}

  async load(userId: string): Promise<void> {
    if (this.store.get().userId === userId) return;
    this.store.set({ userId, loaded: false, log: null });
    let log: CardLogFile | null = null;
    try {
      const raw = await this.cache.get(keyOf(userId));
      const parsed = raw === null ? null : CardLogFile.safeParse(JSON.parse(raw));
      if (parsed?.success) log = parsed.data;
    } catch {
      // Unreadable: start empty.
    }
    if (this.store.get().userId !== userId) return;
    this.store.set({ userId, loaded: true, log });
  }

  async shown(userId: string, today: LocalDate, id: string): Promise<void> {
    await this.load(userId);
    const state = this.store.get();
    if (state.userId !== userId) return;
    const log = logShown(state.log, today, id);
    if (JSON.stringify(log) === JSON.stringify(state.log)) return;
    this.store.set({ ...state, log });
    await this.cache.set(keyOf(userId), JSON.stringify(log)).catch(() => undefined);
  }
}

export const cardLog = new CardLog(sqliteCache);

/**
 * Yesterday's card for the learner (undefined while the log loads), and a way to keep today's.
 */
export function useCardLog(
  userId: string | null,
  today: LocalDate | null,
): { readonly previous: string | null | undefined; readonly shown: (id: string) => void } {
  const state = useStore(cardLog.store);
  useEffect(() => {
    if (userId !== null) void cardLog.load(userId);
  }, [userId]);
  const mine = state.loaded && state.userId === userId;
  return {
    previous: !mine || today === null ? undefined : previousCardOf(state.log, today),
    shown: (id: string) => {
      if (userId !== null && today !== null) void cardLog.shown(userId, today, id);
    },
  };
}
