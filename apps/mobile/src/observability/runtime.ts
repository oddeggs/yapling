import { Storage } from 'expo-sqlite/kv-store';

import { debugClock } from '../features/devmenu/debug-clock';
import { Analytics, type AnalyticsStorage } from './analytics';
import { observabilityConfig } from './config';
import type { AnalyticsEvent, AnalyticsEvents } from './events';
import { createPostHogSink } from './posthog-sink';
import { setSentryUser, startSentry } from './sentry';

/*
 * The app's one analytics instance, made on first use from the build's settings. Without a PostHog
 * key it has no sink: tracking is a no-op and PostHog's SDK is never loaded.
 */

const kvStorage: AnalyticsStorage = {
  get: (key) => Storage.getItemSync(key),
  set: (key, value) => Storage.setItemSync(key, value),
  remove: (key) => void Storage.removeItemSync(key),
};

let shared: Analytics | null = null;

export function analytics(): Analytics {
  if (shared !== null) return shared;
  const config = observabilityConfig();
  const sink =
    config.posthogKey === null
      ? null
      : createPostHogSink({
          apiKey: config.posthogKey,
          host: config.posthogHost,
          storage: {
            getItem: (key) => Storage.getItemSync(key),
            setItem: (key, value) => Storage.setItemSync(key, value),
          },
        });
  shared = new Analytics({
    sink,
    storage: kvStorage,
    appVariant: config.appVariant,
    debugClock: () => {
      const clock = debugClock();
      return clock.offsetMs !== 0 || clock.cameBackAfterAway;
    },
  });
  return shared;
}

/** Starts crash reports when the build has a Sentry DSN; called once, before the first render. */
export function startCrashReports(): void {
  startSentry(observabilityConfig());
}

/** Analytics and crash reports belong to this learner from now on. */
export function identifyLearner(userId: string): void {
  analytics().identify(userId);
  setSentryUser(userId);
}

/** A fresh start on this phone: a new anonymous person, the funnel from the top. */
export function resetObservability({ testSession }: { readonly testSession: boolean }): void {
  analytics().reset({ testSession });
  setSentryUser(null);
}

/** Sends one event (a no-op without a PostHog key). */
export function track<E extends AnalyticsEvent>(event: E, properties: AnalyticsEvents[E]): void {
  analytics().track(event, properties);
}
