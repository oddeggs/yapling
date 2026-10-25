import type {
  Arrival,
  CharacterId,
  CompanionOption,
  MemoryItem,
  MinutesSummary,
  MomentCard,
  Painting,
} from '@yapling/contracts';
import { isPlaceId, type PlaceId } from '@yapling/scene';
import { randomUUID } from 'expo-crypto';

import { createSessionApi } from '../data/client';
import { apiBase, clientVersion } from '../data/config';
import { isDataError } from '../data/errors';
import { createHttp } from '../data/http';
import { secureStorage } from '../data/secure-storage';
import { SessionManager } from '../data/session';
import { sqliteCache } from '../data/sqlite-cache';
import { createStore, type Store } from '../data/store';
import { createWorldApi, type WorldApi } from './client';
import { deviceTimeZone, momentRequest } from './device';

/*
 * The app's one piece of state outside the scene: the session, the moment to play next (or the
 * director still writing it), the wall, the minutes and the two settings. The wall and the
 * settings are cached on the phone, so they show at once and offline.
 */

export interface Settings {
  /** The learner's own language under the characters' lines. */
  readonly gloss: boolean;
  /** Music and ambience (voices always play). Off until the learner taps once. */
  readonly sound: boolean;
}

export interface WorldState {
  /** The session is ready (a guest is made on the first open). */
  readonly ready: boolean;
  readonly offline: boolean;
  /** The moment to play next, once it is known. */
  readonly moment: MomentCard | null;
  /** The director is writing the next moment. */
  readonly planning: boolean;
  /** What the learner said their name is. */
  readonly name: string | null;
  /** The learner has told the town who they are; false shows the arrival first. */
  readonly arrived: boolean;
  /** The learner's companion, painted wherever they go. */
  readonly companion: CharacterId | null;
  /** Arrived but no companion yet: the two to choose from. */
  readonly companions: readonly CompanionOption[];
  /** The place painted now, and its variant. */
  readonly place: PlaceId;
  readonly variant: number;
  readonly minutes: MinutesSummary | null;
  readonly paintings: readonly Painting[];
  readonly settings: Settings;
}

const CACHE = { wall: 'world.wall', settings: 'world.settings', place: 'world.place' } as const;

const INITIAL: WorldState = {
  ready: false,
  offline: false,
  moment: null,
  planning: false,
  name: null,
  arrived: true,
  companion: null,
  companions: [],
  place: 'room',
  variant: 0,
  minutes: null,
  paintings: [],
  settings: { gloss: true, sound: false },
};

export class World {
  readonly store: Store<WorldState> = createStore(INITIAL);
  readonly session: SessionManager;
  readonly api: WorldApi;
  private started: Promise<void> | null = null;

  constructor() {
    const http = createHttp({ base: apiBase() });
    this.session = new SessionManager({
      api: createSessionApi(http),
      secrets: secureStorage,
      clientVersion: clientVersion(),
      newInstallId: randomUUID,
      timeZone: deviceTimeZone,
    });
    this.api = createWorldApi(http, this.session);
  }

  get state(): WorldState {
    return this.store.get();
  }

  private patch(p: Partial<WorldState>): void {
    this.store.set((s) => ({ ...s, ...p }));
  }

  /** First launch and every launch: the cache at once, then the session and the next moment. */
  start(): Promise<void> {
    this.started ??= this.boot().finally(() => {
      this.started = null;
    });
    return this.started;
  }

  private async boot(): Promise<void> {
    await this.loadCache();
    try {
      // No onboarding wall: the guest is made on the first open.
      await this.session.startGuest();
      this.patch({ ready: true, offline: false });
    } catch (error) {
      this.patch({ offline: isDataError(error, 'network') || !isDataError(error) });
      return;
    }
    await Promise.all([this.next(), this.refreshWall(), this.refreshMinutes()]);
  }

  private async loadCache(): Promise<void> {
    const read = async <T>(key: string): Promise<T | null> => {
      try {
        const raw = await sqliteCache.get(key);
        return raw === null ? null : (JSON.parse(raw) as T);
      } catch {
        return null;
      }
    };
    const [wall, settings, place] = await Promise.all([
      read<Painting[]>(CACHE.wall),
      read<Settings>(CACHE.settings),
      read<{ place: string; variant: number }>(CACHE.place),
    ]);
    this.patch({
      ...(wall ? { paintings: wall } : {}),
      ...(settings ? { settings: { ...INITIAL.settings, ...settings } } : {}),
      ...(place && isPlaceId(place.place) ? { place: place.place, variant: place.variant } : {}),
    });
  }

  /** Asks for the moment to play now. Null while the director is still writing it. */
  async next(): Promise<MomentCard | null> {
    try {
      const r = await this.api.nextMoment(momentRequest());
      this.patch({
        moment: r.moment,
        planning: r.planning,
        name: r.name,
        arrived: r.arrived,
        companion: r.companion,
        companions: r.companions,
        offline: false,
      });
      if (r.moment) this.paint(r.moment);
      return r.moment;
    } catch (error) {
      if (isDataError(error, 'network')) this.patch({ offline: true });
      return null;
    }
  }

  /** The learner's arrival: who they are. Answers with the two companions that fit them. */
  async arrive(
    arrival: Omit<Arrival, 'firstLanguage' | 'country' | 'timezone'>,
  ): Promise<readonly CompanionOption[] | null> {
    try {
      const r = await this.api.arrive({ ...arrival, ...momentRequest() });
      this.patch({ name: arrival.name, companions: r.companions });
      return r.companions;
    } catch (error) {
      if (isDataError(error, 'network')) this.patch({ offline: true });
      return null;
    }
  }

  /** The companion they chose: then the first conversation, off the 45. */
  async chooseCompanion(companion: CharacterId): Promise<boolean> {
    try {
      await this.api.chooseCompanion({ companion });
    } catch (error) {
      if (isDataError(error, 'network')) this.patch({ offline: true });
      return false;
    }
    this.patch({ arrived: true, companion, companions: [] });
    await this.next();
    return true;
  }

  /** Pip's free moment in the burrow, while the director writes. */
  async free(): Promise<MomentCard | null> {
    try {
      const r = await this.api.freeMoment(momentRequest());
      this.patch({ moment: r.moment, planning: false, name: r.name, offline: false });
      if (r.moment) this.paint(r.moment);
      return r.moment;
    } catch (error) {
      if (isDataError(error, 'network')) this.patch({ offline: true });
      return null;
    }
  }

  /** A place chosen from the menu: its resident, for a short visit (the burrow is Pip's free moment). */
  async visit(place: PlaceId, variant: number): Promise<MomentCard | null> {
    if (place === 'room') return this.free();
    try {
      const r = await this.api.visit({ ...momentRequest(), place, variant });
      this.patch({ moment: r.moment, name: r.name, offline: false });
      if (r.moment) this.paint(r.moment);
      return r.moment;
    } catch (error) {
      if (isDataError(error, 'network')) this.patch({ offline: true });
      return null;
    }
  }

  /** Paints a place now (a moment's, or one picked in the menu). */
  paint(at: { place: string; variant: number }): void {
    if (!isPlaceId(at.place)) return;
    this.patch({ place: at.place, variant: at.variant });
    void sqliteCache.set(CACHE.place, JSON.stringify(at)).catch(() => undefined);
  }

  /** The moment was played: it is no longer next (unless another took its place meanwhile). */
  played(id: string): void {
    if (this.state.moment?.id === id) this.patch({ moment: null });
  }

  async refreshWall(): Promise<void> {
    try {
      const { items } = await this.api.paintings();
      this.patch({ paintings: items });
      await sqliteCache.set(CACHE.wall, JSON.stringify(items));
    } catch {
      // The cached wall stays.
    }
  }

  async refreshMinutes(): Promise<void> {
    try {
      this.patch({ minutes: await this.api.minutes() });
    } catch {
      // Shown when it comes.
    }
  }

  /**
   * The painting kept from a call, once its notes are in (a few seconds after the call); the
   * painting as it is after `waitMs` if the notes are slow.
   */
  async paintingFor(callId: string, waitMs = 20_000): Promise<Painting | null> {
    const until = Date.now() + waitMs;
    let last: Painting | null = null;
    for (;;) {
      try {
        last = await this.api.paintingByCall(callId);
        if (last.status !== 'judging') break;
      } catch (error) {
        if (!isDataError(error, 'not_found') || Date.now() > until) break;
      }
      if (Date.now() > until) break;
      await new Promise((r) => setTimeout(r, 1_500));
    }
    if (last) {
      const kept = last;
      this.patch({ paintings: [kept, ...this.state.paintings.filter((p) => p.id !== kept.id)] });
      void sqliteCache.set(CACHE.wall, JSON.stringify(this.state.paintings)).catch(() => undefined);
    }
    return last;
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    const settings = { ...this.state.settings, [key]: value };
    this.patch({ settings });
    void sqliteCache.set(CACHE.settings, JSON.stringify(settings)).catch(() => undefined);
  }

  async memory(): Promise<MemoryItem[]> {
    return (await this.api.memory()).items;
  }

  /** Deletes everything on the server and the phone; the next open is a new learner. */
  async deleteEverything(): Promise<void> {
    await this.api.deleteEverything();
    await sqliteCache.clear().catch(() => undefined);
    await this.session.signOut();
    this.store.set(INITIAL);
  }

  token(): Promise<string> {
    return this.session.token();
  }
}

let shared: World | null = null;

export function world(): World {
  shared ??= new World();
  return shared;
}
