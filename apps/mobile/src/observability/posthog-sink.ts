import type PostHogClient from 'posthog-react-native';

import type { AnalyticsSink } from './analytics';

/*
 * PostHog as the analytics sink. Only the events in the dictionary go out: no autocapture, no
 * screen or lifecycle events, no session replay, no exception capture (Sentry has errors), no
 * feature flags and no GeoIP location. A person profile exists only once identified, by the
 * learner's opaque user id.
 */

export interface PostHogSinkConfig {
  readonly apiKey: string;
  readonly host: string;
  /** PostHog's own state (its anonymous id, the queue), kept on the phone. */
  readonly storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
}

export function createPostHogSink(config: PostHogSinkConfig): AnalyticsSink {
  // Loaded only with a key, so builds and tests without one never load the SDK.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PostHog } = require('posthog-react-native') as { PostHog: typeof PostHogClient };
  const client = new PostHog(config.apiKey, {
    host: config.host,
    customStorage: config.storage,
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    preloadFeatureFlags: false,
    sendFeatureFlagEvent: false,
    personProfiles: 'identified_only',
    errorTracking: { autocapture: false },
    disableGeoip: true,
  });
  return {
    capture: (event, properties) => client.capture(event, properties as never),
    identify: (userId) => client.identify(userId),
    reset: () => client.reset(),
  };
}
