import { describe, expect, it } from '@jest/globals';

import { CACHE_KEYS, memoryCacheStorage } from '../../src/data/storage';
import { DEFAULT_TURN_MODE, TurnModePreference } from '../../src/data/turn-mode';
import { FakeApi, launch, newPhone } from './fake-api';

describe('the turn mode preference', () => {
  it('holds the mic by default', async () => {
    const pref = new TurnModePreference(memoryCacheStorage());
    expect(pref.store.get()).toEqual({ loaded: false, turnMode: 'hold_to_talk' });
    await pref.load();
    expect(pref.store.get()).toEqual({ loaded: true, turnMode: DEFAULT_TURN_MODE });
    expect(DEFAULT_TURN_MODE).toBe('hold_to_talk');
  });

  it('keeps hands-free across launches', async () => {
    const cache = memoryCacheStorage();
    const pref = new TurnModePreference(cache);
    await pref.load();
    await pref.set('hands_free');
    expect(pref.turnMode).toBe('hands_free');
    const relaunch = new TurnModePreference(cache);
    await relaunch.load();
    expect(relaunch.store.get()).toEqual({ loaded: true, turnMode: 'hands_free' });
    await relaunch.set('hold_to_talk');
    const again = new TurnModePreference(cache);
    await again.load();
    expect(again.turnMode).toBe('hold_to_talk');
  });

  it('lets a choice made before the cache was read win', async () => {
    const cache = memoryCacheStorage({
      [CACHE_KEYS.turnMode]: JSON.stringify({ turnMode: 'hold_to_talk' }),
    });
    const pref = new TurnModePreference(cache);
    const loading = pref.load();
    await pref.set('hands_free');
    await loading;
    expect(pref.turnMode).toBe('hands_free');
  });

  it('drops a stored value it no longer understands', async () => {
    const cache = memoryCacheStorage({ [CACHE_KEYS.turnMode]: '{"turnMode":"shout"}' });
    const pref = new TurnModePreference(cache);
    await pref.load();
    expect(pref.turnMode).toBe('hold_to_talk');
    expect(cache.values.has(CACHE_KEYS.turnMode)).toBe(false);
  });

  it('goes back to holding the mic on the test menu reset', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const data = launch(api, phone);
    await data.start();
    await data.turnMode.set('hands_free');
    await data.resetLocal();
    expect(data.turnMode.store.get()).toEqual({ loaded: true, turnMode: 'hold_to_talk' });
    const relaunch = launch(api, phone);
    await relaunch.start();
    expect(relaunch.turnMode.turnMode).toBe('hold_to_talk');
  });
});
