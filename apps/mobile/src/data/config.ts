import Constants from 'expo-constants';

/*
 * Where the API is and what the app calls itself, from the app config (`app.config.ts`): `extra.
 * apiBase` is `API_BASE` when set, else the variant's default (dev: `wrangler dev` on this Mac).
 */

/** Used when the config names no API: `wrangler dev` on this Mac, as the simulator sees it. */
export const DEV_API_BASE = 'http://127.0.0.1:8787/api';

export function apiBase(): string {
  const extra = Constants.expoConfig?.extra as { apiBase?: unknown } | undefined;
  const base = extra?.apiBase;
  if (typeof base === 'string' && base !== '') return base;
  if (__DEV__) return DEV_API_BASE;
  throw new Error('the app config names no API (extra.apiBase)');
}

/** `major.minor.patch`, as the guest request carries it. */
export function clientVersion(): string {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version) ? version : '0.0.0';
}
