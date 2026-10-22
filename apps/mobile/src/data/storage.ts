import type { z } from 'zod';

/*
 * Where the phone keeps things, as small strings by key:
 * - `SecretStorage`: the session and the install id, in the Keychain (`secure-storage.ts`).
 * - `CacheStorage`: cached server copies and the offline queue, in SQLite (`sqlite-cache.ts`).
 * Both have in-memory versions for tests.
 */

export interface SecretStorage {
  get(key: string): Promise<string | null>;
  /** `null` removes the key. */
  set(key: string, value: string | null): Promise<void>;
}

export interface CacheStorage {
  get(key: string): Promise<string | null>;
  /** `null` removes the key. */
  set(key: string, value: string | null): Promise<void>;
  /** Forgets everything (account deletion, another learner signing in). */
  clear(): Promise<void>;
}

export const SECRET_KEYS = {
  installId: 'yapling.install-id',
  session: 'yapling.session',
} as const;

export const CACHE_KEYS = {
  /** The user the cache belongs to; another user's session clears it. */
  owner: 'owner',
  profile: 'profile',
  progress: 'progress',
  memory: 'memory',
  minutes: 'minutes',
  calls: 'calls',
  call: (id: string) => `call:${id}`,
  outbox: 'outbox',
  /** The between-call moments seen on this phone. */
  seen: 'seen',
  /** When the app was last opened. */
  lastOpen: 'last-open',
  /** Holding the mic or hands-free in calls. */
  turnMode: 'turn-mode',
} as const;

/** A cached JSON value, checked against its schema; a value that no longer parses is dropped. */
export async function readJson<T>(
  storage: CacheStorage,
  key: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  let raw: string | null;
  try {
    raw = await storage.get(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // Not JSON: dropped below.
  }
  await storage.set(key, null).catch(() => undefined);
  return null;
}

/** Writes a JSON value; a failing cache never fails the caller. */
export async function writeJson(storage: CacheStorage, key: string, value: unknown): Promise<void> {
  await storage.set(key, value === null ? null : JSON.stringify(value)).catch(() => undefined);
}

export function memorySecretStorage(initial: Record<string, string> = {}): SecretStorage & {
  readonly values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get: (key) => Promise.resolve(values.get(key) ?? null),
    set: (key, value) => {
      if (value === null) values.delete(key);
      else values.set(key, value);
      return Promise.resolve();
    },
  };
}

export function memoryCacheStorage(initial: Record<string, string> = {}): CacheStorage & {
  readonly values: Map<string, string>;
} {
  const secret = memorySecretStorage(initial);
  return {
    ...secret,
    clear: () => {
      secret.values.clear();
      return Promise.resolve();
    },
  };
}
