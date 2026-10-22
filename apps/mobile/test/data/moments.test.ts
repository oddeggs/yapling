import { describe, expect, it } from '@jest/globals';
import { findScene } from '@yapling/story';

import { CACHE_KEYS, memoryCacheStorage } from '../../src/data/storage';
import { MOMENT_SCENES, OpenLog, SeenMoments } from '../../src/data/moments';
import { FakeApi, launch, newPhone } from './fake-api';

describe('the moments seen on this phone', () => {
  it('counts nothing as unseen before the cache is read, and keeps each mark', async () => {
    const cache = memoryCacheStorage({ [CACHE_KEYS.seen]: JSON.stringify({ pip_story: 1 }) });
    const seen = new SeenMoments(cache, () => 5);
    expect(seen.store.get().loaded).toBe(false);
    await seen.load();
    expect([...seen.store.get().seen]).toEqual(['pip_story']);
    await seen.mark(['linh_welcome', 'pip_story']);
    expect(JSON.parse(cache.values.get(CACHE_KEYS.seen) ?? '{}')).toEqual({
      pip_story: 1,
      linh_welcome: 5,
    });
    // Another launch reads them back.
    const again = new SeenMoments(cache, () => 9);
    await again.load();
    expect(again.has('linh_welcome')).toBe(true);
  });
});

describe('the moments seen, by scene', () => {
  it('reads the first week’s moments seen before scenes were kept as their scenes', async () => {
    const before = {
      placement_chat: 1,
      linh_welcome: 1,
      pip_story: 2,
      voicemail: 3,
      plus_offer: 4,
    };
    const cache = memoryCacheStorage({ [CACHE_KEYS.seen]: JSON.stringify(before) });
    const seen = new SeenMoments(cache, () => 5);
    await seen.load();
    const state = seen.store.get();
    expect([...state.seen].sort()).toEqual([
      'linh_welcome',
      'pip_story',
      'placement_chat',
      'plus_offer',
      'voicemail',
    ]);
    expect([...state.scenes].sort()).toEqual([
      's1-e1-story',
      's1-e1-voicemail',
      's1-pro-knock',
      's1-pro-unpack',
    ]);
    expect(seen.hasScene('s1-e1-story')).toBe(true);
    expect(seen.hasScene('s1-e1-postcard')).toBe(false);
    // Marking a scene already seen by its name writes nothing.
    await seen.markScenes(['s1-e1-story']);
    expect(JSON.parse(cache.values.get(CACHE_KEYS.seen) ?? '{}')).toEqual(before);
  });

  it('marks later weeks’ scenes by id, and a first-week scene under its name too', async () => {
    const cache = memoryCacheStorage();
    const seen = new SeenMoments(cache, () => 7);
    await seen.markScenes(['s1-e2-story', 's1-e1-postcard']);
    expect(seen.hasScene('s1-e2-story')).toBe(true);
    expect(seen.has('linh_postcard')).toBe(true);
    expect(seen.has('pip_story')).toBe(false);
    expect(JSON.parse(cache.values.get(CACHE_KEYS.seen) ?? '{}')).toEqual({
      's1-e2-story': 7,
      's1-e1-postcard': 7,
      linh_postcard: 7,
    });
    const again = new SeenMoments(cache, () => 9);
    await again.load();
    expect([...again.store.get().scenes].sort()).toEqual(['s1-e1-postcard', 's1-e2-story']);
    expect([...again.store.get().seen]).toEqual(['linh_postcard']);
  });

  it('counts a Visitor version as its scene', async () => {
    const seen = new SeenMoments(memoryCacheStorage(), () => 1);
    await seen.markScenes(['s1-e1-voicemail-visitor']);
    expect(seen.hasScene('s1-e1-voicemail')).toBe(true);
    expect(seen.hasScene('s1-e1-voicemail-visitor')).toBe(true);
    expect(seen.has('voicemail')).toBe(true);
  });

  it('maps the first week’s names onto scenes the story has', () => {
    for (const scene of Object.values(MOMENT_SCENES)) expect(findScene(scene ?? '')).toBeDefined();
  });
});

describe('the open log', () => {
  it('remembers the open before this one, on the app clock', async () => {
    const cache = memoryCacheStorage();
    const log = new OpenLog(cache);
    await log.open(1_000);
    expect(log.store.get()).toEqual({ loaded: true, previousAt: null });
    await log.open(1_000);
    expect(log.store.get().previousAt).toBeNull();
    await log.open(90_000);
    expect(log.store.get().previousAt).toBe(1_000);
    const relaunch = new OpenLog(cache);
    await relaunch.open(200_000);
    expect(relaunch.store.get().previousAt).toBe(90_000);
  });
});

describe('the test menu reset', () => {
  it('forgets the learner, the moments and the opens, and asks for the age check again', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const data = launch(api, phone);
    await data.start();
    await data.seen.mark(['placement_chat']);
    await data.opens.open(10);
    await data.resetLocal();
    expect(data.seen.store.get().seen.size).toBe(0);
    expect(data.opens.store.get().previousAt).toBeNull();
    expect(data.session.state.status).toBe('signed_out');
    expect(phone.cache.values.size).toBe(0);
  });
});

describe('a phrase opened in a call or a story', () => {
  it('is met as a seed once, and not written again', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await data.start();
    await data.progress.meetPhrase({ id: 'can-i-help', text: 'Can I help?' }, 1_000);
    expect(data.progress.resource.data?.phrases).toEqual([
      expect.objectContaining({ id: 'can-i-help', state: 'seed', seedAt: 1_000 }),
    ]);
    await data.progress.meetPhrase({ id: 'can-i-help', text: 'Can I help?' }, 2_000);
    expect(api.requests('PUT', '/api/me/progress')).toHaveLength(1);
  });
});

describe('the ring on the app clock', () => {
  it('opens on the server the calls whose day has come, once', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await data.start();
    await data.progress.openRing(5);
    const slots = data.progress.resource.data?.weeks[0]?.slots.map((s) => s.status);
    expect(slots).toEqual(['open', 'open', 'open']);
    await data.progress.openRing(5);
    expect(api.requests('PUT', '/api/me/progress')).toHaveLength(1);
  });
});
