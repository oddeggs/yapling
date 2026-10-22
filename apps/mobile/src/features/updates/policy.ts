/*
 * When an over-the-air update is fetched and when it's applied. The app checks at launch and each
 * time it comes back to the front (at most every few minutes), downloads what it finds, and only
 * restarts into it as it comes back to the front on a calm screen: the burrow, the week or the
 * season map. Never mid-call, mid-story, in onboarding or on a payoff. Otherwise the update waits
 * for the next launch.
 */

/** The fewest minutes between two checks. */
export const CHECK_EVERY_MS = 5 * 60 * 1000;

/** The screens a restart can land on without losing anything. */
const CALM = new Set(['/', '/week', '/season']);

export function isCalm(pathname: string): boolean {
  return CALM.has(pathname);
}

export function shouldCheck(lastCheckAt: number | null, now: number): boolean {
  return lastCheckAt === null || now - lastCheckAt >= CHECK_EVERY_MS;
}

/** Restart into a downloaded update now: only as the app comes to the front, on a calm screen. */
export function shouldApply(pending: boolean, cameToFront: boolean, pathname: string): boolean {
  return pending && cameToFront && isCalm(pathname);
}
