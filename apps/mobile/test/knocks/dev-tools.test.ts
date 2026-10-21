import { describe, expect, it, jest } from '@jest/globals';

import type * as DevToolsModule from '../../src/features/devmenu/dev-tools';

type DevTools = typeof DevToolsModule;

/** Loads the flag as a build with this variant and `__DEV__` would. */
const flagFor = (appVariant: string, dev: boolean): boolean => {
  const g = globalThis as { __DEV__?: boolean };
  const before = g.__DEV__;
  g.__DEV__ = dev;
  try {
    let enabled: boolean | undefined;
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({ expoConfig: { extra: { appVariant } } }));
      enabled = jest.requireActual<DevTools>(
        '../../src/features/devmenu/dev-tools',
      ).devToolsEnabled;
    });
    return enabled!;
  } finally {
    g.__DEV__ = before ?? true;
  }
};

describe('the test menu’s builds', () => {
  it('is in development builds and the learner-test variant', () => {
    expect(flagFor('dev', true)).toBe(true);
    expect(flagFor('dev', false)).toBe(true);
  });

  it('is never in the store app', () => {
    expect(flagFor('prd', false)).toBe(false);
  });
});
