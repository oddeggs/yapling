import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { buildConfig } from '../../app.config';
import type * as SentryModule from '../../src/observability/sentry';

const mockInit = jest.fn();
const mockSetUser = jest.fn();
jest.mock('@sentry/react-native', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  setTag: () => undefined,
  setUser: (...args: unknown[]) => mockSetUser(...args),
  captureException: () => undefined,
}));

/** A fresh copy of the module, as a build with `__DEV__` set this way loads it. */
function load(dev: boolean): typeof SentryModule {
  const g = globalThis as { __DEV__?: boolean };
  g.__DEV__ = dev;
  let loaded: typeof SentryModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<typeof SentryModule>('../../src/observability/sentry');
  });
  if (loaded === undefined) throw new Error('not loaded');
  return loaded;
}

const config = {
  posthogKey: null,
  posthogHost: 'https://eu.i.posthog.com',
  appVariant: 'dev',
} as const;

afterEach(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  mockInit.mockClear();
  mockSetUser.mockClear();
});

describe('crash reports', () => {
  it('never start without a DSN, and the learner calls do nothing', () => {
    const sentry = load(false);
    expect(sentry.startSentry({ ...config, sentryDsn: null })).toBe(false);
    sentry.setSentryUser('user-1');
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it('never start in a development session', () => {
    expect(load(true).startSentry({ ...config, sentryDsn: 'https://key@sentry.example/1' })).toBe(
      false,
    );
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('start once with a DSN, with nothing personal attached', () => {
    const sentry = load(false);
    const dsn = 'https://key@sentry.example/1';
    expect(sentry.startSentry({ ...config, sentryDsn: dsn })).toBe(true);
    expect(sentry.startSentry({ ...config, sentryDsn: dsn })).toBe(true);
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit.mock.calls[0]?.[0]).toMatchObject({
      dsn,
      environment: 'dev',
      sendDefaultPii: false,
      attachScreenshot: false,
    });
    sentry.setSentryUser('user-1');
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'user-1' });
  });
});

describe('the Sentry build steps', () => {
  const sentryPlugin = (sentryUpload?: boolean) =>
    buildConfig({}, 'dev', {
      easProjectId: undefined,
      apiBase: undefined,
      sentryUpload,
    }).plugins?.find((p) => Array.isArray(p) && p[0] === '@sentry/react-native/expo');

  it('skip the upload unless the build can upload', () => {
    expect(sentryPlugin()).toEqual([
      '@sentry/react-native/expo',
      { url: 'https://sentry.io/', disableAutoUpload: true },
    ]);
    expect(sentryPlugin(false)?.[1]).toMatchObject({ disableAutoUpload: true });
    expect(sentryPlugin(true)?.[1]).toMatchObject({ disableAutoUpload: false });
  });
});
