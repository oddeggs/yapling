import { Storage } from 'expo-sqlite/kv-store';

/** Every key the test menu keeps on the phone starts with this, so a reset finds them all. */
const PREFIX = 'yapling.devmenu.';

/** The debug clock's state. */
export const CLOCK_KEY = `${PREFIX}clock`;

/** Synchronous reads, so the first frame already runs on the debug clock. */
export const devStorage = {
  get: (key: string): string | null => Storage.getItemSync(key),
  set: (key: string, value: string): void => Storage.setItemSync(key, value),
  /** Removes every key the test menu owns. */
  clear: (): void => {
    for (const key of Storage.getAllKeysSync()) {
      if (key.startsWith(PREFIX)) Storage.removeItemSync(key);
    }
  },
};
