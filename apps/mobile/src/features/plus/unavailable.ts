import type { PlusStore } from './store';

/** The store in a build without RevenueCat (no key yet): nothing to buy or restore, and it says so. */
export const unavailableStore: PlusStore = {
  available: false,
  identify: () => Promise.resolve(),
  offers: () => Promise.resolve(null),
  purchase: () => Promise.resolve('unavailable'),
  restore: () => Promise.resolve('unavailable'),
  onEntitlement: () => () => undefined,
};
