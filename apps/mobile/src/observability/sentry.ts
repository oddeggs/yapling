import type * as SentrySdk from '@sentry/react-native';

import type { ObservabilityConfig } from './config';

/*
 * Crash and error reports. With a DSN in the build (`EXPO_PUBLIC_SENTRY_DSN`), the native SDK
 * catches native crashes and the JavaScript SDK unhandled errors; development (Metro) sessions
 * never report. The native SDK names the release (`<bundle id>@<version>+<build>`). Without a DSN
 * the SDK is never loaded. Nothing personal is attached: no IP, no
 * screenshots or view hierarchy, and the learner only as their opaque user id.
 */

let sdk: typeof SentrySdk | null = null;

/** Starts reporting when the build has a DSN. Returns whether it started. */
export function startSentry(config: ObservabilityConfig): boolean {
  if (sdk !== null || config.sentryDsn === null || __DEV__) return sdk !== null;
  // Loaded only with a DSN, so builds and tests without one never touch the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/react-native') as typeof SentrySdk;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.appVariant,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // Errors only: performance tracing stays off until there is a reason to pay for it.
    tracesSampleRate: 0,
  });
  Sentry.setTag('app_variant', config.appVariant);
  sdk = Sentry;
  return true;
}

/** The learner reports belong to (their opaque user id), or nobody after a reset. */
export function setSentryUser(userId: string | null): void {
  sdk?.setUser(userId === null ? null : { id: userId });
}

/** Reports an error the app caught and handled. */
export function reportError(error: unknown, context?: Record<string, string>): void {
  if (sdk === null) return;
  sdk.captureException(error, context ? { tags: context } : undefined);
}
