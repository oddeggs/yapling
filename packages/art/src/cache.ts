/**
 * A least-recently-used cache with a memory cap: entries carry their size in bytes, the oldest go
 * once the total passes the cap, and `flush` drops everything not in use (on a memory warning).
 *
 * Entries can be pinned while something on screen draws them (`pin` / `unpin`): a pinned entry is
 * never evicted, so a remount finds it again, and eviction goes to the oldest unused one instead.
 * An entry that has been pinned is disposed when it goes (its pictures and images freed at once,
 * not when the garbage collector gets to them): nothing holds it then. Entries that were never
 * pinned are only let go of, as anything may still hold them.
 */
interface Entry<T> {
  value: T;
  bytes: number;
  pins: number;
  /** Pinned at least once: whoever used it says when it is no longer drawn. */
  managed: boolean;
}

export const DEFAULT_CACHE_BYTES = 48 * 1024 * 1024;

export class LruCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private total = 0;

  constructor(
    private capBytes = DEFAULT_CACHE_BYTES,
    private readonly dispose: (value: T) => void = () => {},
  ) {}

  get bytes(): number {
    return this.total;
  }

  get size(): number {
    return this.entries.size;
  }

  get cap(): number {
    return this.capBytes;
  }

  /** Bytes held by pinned entries (on screen). */
  get pinnedBytes(): number {
    let n = 0;
    for (const e of this.entries.values()) if (e.pins > 0) n += e.bytes;
    return n;
  }

  setCap(bytes: number): void {
    this.capBytes = bytes;
    this.evict();
  }

  /** The entry for `key`, now the most recently used. */
  get(key: string): T | undefined {
    const e = this.entries.get(key);
    if (!e) return undefined;
    this.entries.delete(key);
    this.entries.set(key, e);
    return e.value;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  set(key: string, value: T, bytes: number): void {
    const old = this.entries.get(key);
    let pins = 0;
    let managed = false;
    if (old) {
      this.entries.delete(key);
      this.total -= old.bytes;
      pins = old.pins;
      managed = old.managed;
      if (old.value !== value && old.managed && old.pins === 0) this.dispose(old.value);
    }
    this.entries.set(key, { value, bytes, pins, managed });
    this.total += bytes;
    this.evict();
  }

  /** The cached value for `key`, made by `make` (with its size) when missing. */
  getOrSet(key: string, make: () => { value: T; bytes: number }): T {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const { value, bytes } = make();
    this.set(key, value, bytes);
    return value;
  }

  /** Marks `key` as drawn on screen (once per user); false when it is not cached. */
  pin(key: string): boolean {
    const e = this.entries.get(key);
    if (!e) return false;
    e.pins++;
    e.managed = true;
    return true;
  }

  /** One user of `key` no longer draws it; unused entries can go again. */
  unpin(key: string): void {
    const e = this.entries.get(key);
    if (!e || e.pins === 0) return;
    e.pins--;
    if (e.pins === 0) this.evict();
  }

  isPinned(key: string): boolean {
    return (this.entries.get(key)?.pins ?? 0) > 0;
  }

  private drop(key: string, e: Entry<T>): void {
    this.entries.delete(key);
    this.total -= e.bytes;
    if (e.managed) this.dispose(e.value);
  }

  private evict(): void {
    if (this.total <= this.capBytes) return;
    // Oldest first, skipping what is on screen. The newest entry stays even if it alone passes the
    // cap: it is about to be drawn.
    let newest: string | undefined;
    for (const key of this.entries.keys()) newest = key;
    for (const [key, e] of this.entries) {
      if (this.total <= this.capBytes) break;
      if (e.pins > 0 || key === newest) continue;
      this.drop(key, e);
    }
  }

  /** Drops everything not on screen (pinned entries stay: they are drawn, so they are held anyway). */
  flush(): void {
    for (const [key, e] of [...this.entries]) if (e.pins === 0) this.drop(key, e);
  }
}

/** A short, stable key for a long string (53-bit cyrb53 hash plus its length). */
export function hashKey(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}.${s.length.toString(36)}`;
}

/** JSON with object keys sorted, so equal params give equal keys. */
export function stableKey(value: unknown): string {
  return JSON.stringify(value, (_, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : v,
  );
}
