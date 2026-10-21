import * as SQLite from 'expo-sqlite';

import type { CacheStorage } from './storage';

/*
 * The offline cache: one key-value table in the app's own SQLite database. Server copies (profile,
 * progress, memory, minutes, calls) and the offline queue live here as JSON; the server wins.
 */

const DATABASE = 'yapling-data.db';

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

function database(): Promise<SQLite.SQLiteDatabase> {
  opening ??= (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE);
    await db.execAsync(
      `PRAGMA journal_mode = WAL;
       CREATE TABLE IF NOT EXISTS cache (
         key TEXT PRIMARY KEY NOT NULL,
         value TEXT NOT NULL,
         updated_at INTEGER NOT NULL
       );`,
    );
    return db;
  })().catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

export const sqliteCache: CacheStorage = {
  async get(key) {
    const row = await (
      await database()
    ).getFirstAsync<{ value: string }>('SELECT value FROM cache WHERE key = ?', key);
    return row?.value ?? null;
  },
  async set(key, value) {
    const db = await database();
    if (value === null) await db.runAsync('DELETE FROM cache WHERE key = ?', key);
    else
      await db.runAsync(
        `INSERT INTO cache (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        key,
        value,
        Date.now(),
      );
  },
  async clear() {
    await (await database()).runAsync('DELETE FROM cache');
  },
};
