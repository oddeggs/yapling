import type { EpochMs } from '@yapling/contracts';

/**
 * The app's clock, which "what day is it" reads: the phone's own, or in the test builds the test
 * menu's, which can move to any day of the first week. `subscribe` tells when it moved.
 */
export interface AppClock {
  now(): EpochMs;
  subscribe(listener: () => void): () => void;
}

export const phoneClock: AppClock = {
  now: () => Date.now(),
  subscribe: () => () => undefined,
};
