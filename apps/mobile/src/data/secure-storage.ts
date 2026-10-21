import * as SecureStore from 'expo-secure-store';

import type { SecretStorage } from './storage';

/*
 * The session and the install id in the Keychain: readable after the first unlock (a call that
 * reconnects with the phone locked still finds the token), never synced to another device. The
 * Keychain outlives a reinstall, so the same install id brings back the same guest.
 */

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const secureStorage: SecretStorage = {
  get: (key) => SecureStore.getItemAsync(key, OPTIONS),
  set: (key, value) =>
    value === null
      ? SecureStore.deleteItemAsync(key, OPTIONS)
      : SecureStore.setItemAsync(key, value, OPTIONS),
};
