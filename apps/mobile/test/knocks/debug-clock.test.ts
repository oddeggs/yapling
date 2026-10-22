import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { dayIndexOf, instantOf, localTimeOf } from '@yapling/domain';

import type * as ClockModule from '../../src/features/devmenu/debug-clock';
import type * as DevStorageModule from '../../src/features/devmenu/dev-storage';

const mockStore = new Map<string, string>();

jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItemSync: (key: string) => mockStore.get(key) ?? null,
    setItemSync: (key: string, value: string) => void mockStore.set(key, value),
    removeItemSync: (key: string) => mockStore.delete(key),
    getAllKeysSync: () => [...mockStore.keys()],
  },
}));

jest.mock('expo-constants', () => ({ expoConfig: { extra: { appVariant: 'dev' } } }));

type Clock = typeof ClockModule;
type DevStorage = typeof DevStorageModule;

/** A fresh copy of the clock, as after the app restarts. */
const restart = (): Promise<Clock & DevStorage> => {
  let modules: (Clock & DevStorage) | undefined;
  jest.isolateModules(() => {
    modules = {
      ...jest.requireActual<Clock>('../../src/features/devmenu/debug-clock'),
      ...jest.requireActual<DevStorage>('../../src/features/devmenu/dev-storage'),
    };
  });
  return Promise.resolve(modules!);
};

const tz = 'Asia/Ho_Chi_Minh';
const installedOn = '2026-10-20';

beforeEach(() => mockStore.clear());

describe('the debug clock', () => {
  it('is the phone’s clock until the test menu moves it', async () => {
    const clock = await restart();
    const before = Date.now();
    expect(clock.now()).toBeGreaterThanOrEqual(before);
    expect(clock.now()).toBeLessThanOrEqual(Date.now());
    expect(clock.debugClock()).toEqual(clock.REAL_CLOCK);
  });

  it('jumps to a day of the first week at the same wall-clock time', async () => {
    const { offsetForDay } = await restart();
    const realNow = instantOf(installedOn, '07:55', tz) + 12_345;
    for (const day of [1, 3, 8]) {
      const moved = realNow + offsetForDay(day, installedOn, tz, realNow);
      expect(dayIndexOf(installedOn, moved, tz)).toBe(day);
      expect(localTimeOf(moved, tz)).toBe('07:55');
      expect(moved % 60_000).toBe(realNow % 60_000);
    }
    // Back to day 1 from a later real day is a negative offset.
    const later = instantOf('2026-10-24', '21:00', tz);
    expect(dayIndexOf(installedOn, later + offsetForDay(1, installedOn, tz, later), tz)).toBe(1);
  });

  it('keeps the jump across restarts, and the reset clears it', async () => {
    const first = await restart();
    first.jumpToDay(5, installedOn, tz);
    first.setCameBackAfterAway(true);
    expect(dayIndexOf(installedOn, first.now(), tz)).toBe(5);

    const second = await restart();
    expect(second.debugClock().cameBackAfterAway).toBe(true);
    expect(dayIndexOf(installedOn, second.now(), tz)).toBe(5);

    second.resetDebugClock();
    expect((await restart()).debugClock()).toEqual(second.REAL_CLOCK);
  });

  it('forgets everything when the test menu clears its keys, and nothing else', async () => {
    mockStore.set('someone.else', 'kept');
    const clock = await restart();
    clock.jumpToDay(4, installedOn, tz);
    clock.devStorage.clear();
    clock.reloadDebugClock();
    expect(clock.debugClock()).toEqual(clock.REAL_CLOCK);
    expect([...mockStore.keys()]).toEqual(['someone.else']);
  });

  it('reads a damaged record as the real clock', async () => {
    mockStore.set('yapling.devmenu.clock', '{not json');
    expect((await restart()).debugClock()).toEqual({
      offsetMs: 0,
      cameBackAfterAway: false,
      awayDays: 3,
    });
  });

  it('keeps how many days away a return stands for, three at least', async () => {
    const clock = await restart();
    clock.setBackAfterDays(14);
    expect(clock.debugClock()).toMatchObject({ cameBackAfterAway: true, awayDays: 14 });
    expect((await restart()).debugClock().awayDays).toBe(14);
    clock.setBackAfterDays(1);
    expect(clock.debugClock().awayDays).toBe(3);
    clock.setBackAfterDays(0);
    expect(clock.debugClock().cameBackAfterAway).toBe(false);
    // A record from before the days were kept reads as three.
    mockStore.set(
      'yapling.devmenu.clock',
      JSON.stringify({ offsetMs: 0, cameBackAfterAway: true }),
    );
    expect((await restart()).debugClock()).toMatchObject({ cameBackAfterAway: true, awayDays: 3 });
  });
});

describe('the store app', () => {
  it('always runs on the phone’s clock', () => {
    mockStore.set(
      'yapling.devmenu.clock',
      JSON.stringify({ offsetMs: 86_400_000 * 3, cameBackAfterAway: true }),
    );
    const g = globalThis as { __DEV__?: boolean };
    const dev = g.__DEV__;
    g.__DEV__ = false;
    try {
      jest.isolateModules(() => {
        jest.doMock('expo-constants', () => ({ expoConfig: { extra: { appVariant: 'prd' } } }));
        const clock = jest.requireActual<Clock>('../../src/features/devmenu/debug-clock');
        clock.jumpToDay(8, installedOn, tz);
        expect(clock.debugClock()).toEqual(clock.REAL_CLOCK);
        expect(Math.abs(clock.now() - Date.now())).toBeLessThan(1000);
      });
    } finally {
      g.__DEV__ = dev ?? true;
    }
  });
});
