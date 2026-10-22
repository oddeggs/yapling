import { randomUUID } from 'expo-crypto';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { AppClock } from './clock';
import { apiBase, clientVersion } from './config';
import { Data } from './data';
import { secureStorage } from './secure-storage';
import { sqliteCache } from './sqlite-cache';

/*
 * One `Data` for the app, on the Keychain, SQLite and fetch. Mounting starts it: the cache shows at
 * once, the stored session is read (a first launch waits for onboarding's age check to make a
 * guest), and everything refreshes. Coming back to the foreground sends what waited offline and
 * refreshes again.
 */

let shared: Data | null = null;

/** The app's data, made on first use; outside React too (the call socket's token). */
export function appData(): Data {
  shared ??= new Data({
    base: apiBase(),
    secrets: secureStorage,
    cache: sqliteCache,
    clientVersion: clientVersion(),
    newInstallId: randomUUID,
  });
  return shared;
}

/** The session token for the call socket's `hello` (there is none before onboarding's age check). */
export function getSessionToken(): Promise<string> {
  return appData().getSessionToken();
}

const DataContext = createContext<Data | null>(null);

export function DataProvider({
  children,
  data,
  clock,
}: {
  children: ReactNode;
  data?: Data;
  /** The app's clock (the test menu's in test builds); the phone's otherwise. */
  clock?: AppClock;
}) {
  const [value] = useState(() => {
    const made = data ?? appData();
    if (clock) made.setClock(clock);
    return made;
  });
  useEffect(() => {
    void value.start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void value.resume();
    });
    return () => {
      sub.remove();
      value.stop();
    };
  }, [value]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Data {
  const data = useContext(DataContext);
  if (data === null) throw new Error('useData needs a DataProvider');
  return data;
}
