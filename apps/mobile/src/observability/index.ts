// Crash reports (Sentry): a silent no-op in a build without its key.
import { observabilityConfig } from './config';
import { setSentryUser, startSentry } from './sentry';

export { reportError } from './sentry';

let started = false;

/** Starts crash reports once, at module load of the root layout. */
export function startCrashReports(): void {
  if (started) return;
  started = true;
  startSentry(observabilityConfig());
}

/** Tags crash reports with the learner's id (never their name). */
export function identifyLearner(userId: string | null): void {
  setSentryUser(userId);
}
