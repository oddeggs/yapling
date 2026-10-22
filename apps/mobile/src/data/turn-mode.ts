import { TurnMode } from '@yapling/contracts';
import { z } from 'zod';

import { CACHE_KEYS, readJson, writeJson, type CacheStorage } from './storage';
import { createStore, type Store } from './store';

/*
 * How the learner takes their turns in a call: holding the mic (the default, which onboarding
 * teaches) or hands-free. Kept on this phone only, beside the other things the phone remembers;
 * the server's profile has no field for it yet. A reset or another learner's session clears it
 * back to holding the mic.
 */

export const DEFAULT_TURN_MODE: TurnMode = 'hold_to_talk';

const TurnModeFile = z.object({ turnMode: TurnMode });

export interface TurnModeState {
  /** The cache has been read. */
  readonly loaded: boolean;
  readonly turnMode: TurnMode;
}

export class TurnModePreference {
  readonly store: Store<TurnModeState> = createStore<TurnModeState>({
    loaded: false,
    turnMode: DEFAULT_TURN_MODE,
  });
  private loading: Promise<void> | null = null;
  /** Set before the cache was read: the learner's choice wins over the stored one. */
  private chosen = false;

  constructor(private readonly cache: CacheStorage) {}

  get turnMode(): TurnMode {
    return this.store.get().turnMode;
  }

  load(): Promise<void> {
    this.loading ??= (async () => {
      const file = await readJson(this.cache, CACHE_KEYS.turnMode, TurnModeFile);
      if (this.chosen) return;
      this.store.set({ loaded: true, turnMode: file?.turnMode ?? DEFAULT_TURN_MODE });
    })();
    return this.loading;
  }

  async set(turnMode: TurnMode): Promise<void> {
    this.chosen = true;
    this.store.set({ loaded: true, turnMode });
    await writeJson(this.cache, CACHE_KEYS.turnMode, { turnMode });
  }

  /** Back to the default (the cache itself is cleared by the caller). */
  reset(): void {
    this.chosen = false;
    this.loading = null;
    this.store.set({ loaded: true, turnMode: DEFAULT_TURN_MODE });
  }
}
