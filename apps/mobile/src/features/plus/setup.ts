import Constants from 'expo-constants';

import type { AppVariant } from './products';
import { createRevenueCatStore, type RevenueCatSdk } from './revenuecat';
import type { PlusStore } from './store';
import { unavailableStore } from './unavailable';

/*
 * The one store the app uses. With `EXPO_PUBLIC_REVENUECAT_IOS_KEY` set (RevenueCat's public iOS
 * SDK key, inlined at build time) it is RevenueCat's; without it, nothing can be bought, and a
 * development build's paywall shows the design's prices marked dev-only.
 */

/** The key as the build inlined it; `unknown`, as Expo's env types exist only after a build. */
function builtKey(): string | undefined {
  // Spelt out in full: Expo inlines `process.env.EXPO_PUBLIC_*` only as a literal member access.
  const raw: unknown = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  return typeof raw === 'string' ? raw : undefined;
}

/** The public RevenueCat iOS key, or null when this build has none. */
export function revenueCatKey(key: string | undefined = builtKey()): string | null {
  return key === undefined || key.trim() === '' ? null : key.trim();
}

export function appVariant(): AppVariant {
  return Constants.expoConfig?.extra?.['appVariant'] === 'prd' ? 'prd' : 'dev';
}

let store: PlusStore | null = null;

export function plusStore(): PlusStore {
  if (store !== null) return store;
  const key = revenueCatKey();
  if (key === null) {
    store = unavailableStore;
  } else {
    // Loaded only with a key, so builds and tests without one never touch the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = (require('react-native-purchases') as { default: RevenueCatSdk }).default;
    store = createRevenueCatStore(sdk, key, appVariant());
  }
  return store;
}

/** Swaps the store (a test's double). */
export function setPlusStore(next: PlusStore | null): void {
  store = next;
}

/**
 * After every sign-in: RevenueCat's customer becomes the Yapling user, so the webhook names them.
 * The app shell calls this with the session's user id.
 */
export function identifyPurchaser(userId: string): Promise<void> {
  return plusStore().identify(userId);
}

/** Whether this build may show the design's sample prices: development builds only. */
export function devFallbackAllowed(variant: AppVariant = appVariant()): boolean {
  return __DEV__ || variant === 'dev';
}
