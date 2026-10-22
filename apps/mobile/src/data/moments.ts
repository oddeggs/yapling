import type { EpochMs, Id } from '@yapling/contracts';
import type { WeekOneUnlock } from '@yapling/domain';
import { VISITOR_VERSIONS } from '@yapling/story';
import { z } from 'zod';

import { CACHE_KEYS, readJson, writeJson, type CacheStorage } from './storage';
import { createStore, type Store } from './store';

/*
 * What only this phone keeps about the learner's weeks: the between-call moments they have been
 * through, and when the app was last opened, for the welcome back. Both live in the data cache, so
 * a reset or another learner's session clears them.
 *
 * A moment is a scene seen (a story, a postcard, a voicemail, of any week), by its scene id, or one
 * of the first week's named moments that isn't a scene (the season map, the Plus offer, the
 * next-episode card). The first week's moments that are scenes go by both: seeing Pip's first story
 * marks `pip_story` and `s1-e1-story` alike, so nothing seen before scene ids were kept comes back.
 */

/** The moments the burrow, the story and the season remember by name. */
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

/** The first week's named moments that are scenes, and their scenes. */
export const MOMENT_SCENES: Readonly<Partial<Record<SeenMoment, Id>>> = {
  placement_chat: 's1-pro-unpack',
  linh_welcome: 's1-pro-knock',
  pip_story: 's1-e1-story',
  linh_postcard: 's1-e1-postcard',
  voicemail: 's1-e1-voicemail',
};

const SCENE_MOMENTS: ReadonlyMap<Id, SeenMoment> = new Map(
  Object.entries(MOMENT_SCENES).map(([moment, scene]) => [scene, moment as SeenMoment]),
);

/** A Visitor version stands in for its scene: seeing it is seeing the scene. */
const STANDS_IN_FOR: ReadonlyMap<Id, Id> = new Map(
  Object.entries(VISITOR_VERSIONS).map(([scene, version]) => [version, scene]),
);

/** The scene a seen scene counts as. */
export const seenSceneOf = (sceneId: Id): Id => STANDS_IN_FOR.get(sceneId) ?? sceneId;

const SeenFile = z.record(z.string(), z.number());

export interface SeenState {
  /** The cache has been read: until then nothing counts as unseen. */
  readonly loaded: boolean;
  /** The named moments seen. */
  readonly seen: ReadonlySet<SeenMoment>;
  /** The scenes seen, by id (the first week's named moments that are scenes included). */
  readonly scenes: ReadonlySet<Id>;
}

const isMoment = (id: string): id is SeenMoment => (SEEN_MOMENTS as readonly string[]).includes(id);

/** What the marks kept say was seen: each key is a named moment or a scene id. */
const seenOf = (keys: readonly string[]): Omit<SeenState, 'loaded'> => {
  const seen = new Set<SeenMoment>();
  const scenes = new Set<Id>();
  for (const key of keys) {
    if (isMoment(key)) {
      seen.add(key);
      const scene = MOMENT_SCENES[key];
      if (scene !== undefined) scenes.add(scene);
    } else {
      scenes.add(key);
      const moment = SCENE_MOMENTS.get(key);
      if (moment !== undefined) seen.add(moment);
    }
  }
  return { seen, scenes };
};

/** The moments seen, each with when; a mark is never taken back (only a reset clears them). */
export class SeenMoments {
  readonly store: Store<SeenState> = createStore<SeenState>({
    loaded: false,
    seen: new Set(),
    scenes: new Set(),
  });
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

  /** Whether a scene has been seen (a Visitor version counts as its scene). */
  hasScene(sceneId: Id): boolean {
    return this.store.get().scenes.has(seenSceneOf(sceneId));
  }

  /** Marks named moments seen. */
  mark(moments: readonly SeenMoment[]): Promise<void> {
    return this.write(moments);
  }

  /**
   * Marks scenes seen, by id (a Visitor version as its scene). A first-week scene is written under
   * its moment's name too, so a build that reads only the names still sees it.
   */
  async markScenes(sceneIds: readonly Id[]): Promise<void> {
    await this.load();
    const fresh = sceneIds.map(seenSceneOf).filter((scene) => !this.hasScene(scene));
    await this.write(
      fresh.flatMap((scene) => {
        const moment = SCENE_MOMENTS.get(scene);
        return moment === undefined ? [scene] : [scene, moment];
      }),
    );
  }

  private async write(keys: readonly string[]): Promise<void> {
    await this.load();
    const fresh = [...new Set(keys)].filter((m) => this.at[m] === undefined);
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
    this.store.set({ loaded: true, seen: new Set(), scenes: new Set() });
  }

  private publish(): void {
    this.store.set({ loaded: true, ...seenOf(Object.keys(this.at)) });
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
