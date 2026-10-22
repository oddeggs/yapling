import Constants from 'expo-constants';

/*
 * What analytics and crash reports need, from the build: PostHog's project key and host and
 * Sentry's DSN (public client keys, inlined from `EXPO_PUBLIC_*` at build time, per EAS profile or
 * `.env.local`), and the app variant from the app config. A missing key turns its part off: the
 * app then makes no call to PostHog or Sentry at all.
 */

export type AppVariant = 'dev' | 'prd';

export interface ObservabilityConfig {
  readonly posthogKey: string | null;
  readonly posthogHost: string;
  readonly sentryDsn: string | null;
  readonly appVariant: AppVariant;
}

/** PostHog's EU cloud, as for Bricked Party; `EXPO_PUBLIC_POSTHOG_HOST` points elsewhere. */
export const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

/** The raw values, before they are checked. */
export interface RawObservabilityConfig {
  readonly posthogKey?: unknown;
  readonly posthogHost?: unknown;
  readonly sentryDsn?: unknown;
  readonly appVariant?: unknown;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

export function readObservabilityConfig(raw: RawObservabilityConfig): ObservabilityConfig {
  return {
    posthogKey: text(raw.posthogKey),
    posthogHost: text(raw.posthogHost) ?? DEFAULT_POSTHOG_HOST,
    sentryDsn: text(raw.sentryDsn),
    appVariant: raw.appVariant === 'prd' ? 'prd' : 'dev',
  };
}

/** This build's settings. */
export function observabilityConfig(): ObservabilityConfig {
  return readObservabilityConfig({
    // Spelt out in full: Expo inlines `process.env.EXPO_PUBLIC_*` only as a literal member access.
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    appVariant: Constants.expoConfig?.extra?.['appVariant'],
  });
}
