/**
 * A least-recently-used cache with a memory cap: entries carry their size in bytes, the oldest go
 * once the total passes the cap, and `flush` drops everything (on a memory warning).
 */
interface Entry<T> {
  value: T;
  bytes: number;
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
    if (old) {
      this.entries.delete(key);
      this.total -= old.bytes;
      if (old.value !== value) this.dispose(old.value);
    }
    this.entries.set(key, { value, bytes });
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

  private evict(): void {
    // The newest entry stays even if it alone passes the cap: it is about to be drawn.
    while (this.total > this.capBytes && this.entries.size > 1) {
      const first = this.entries.entries().next().value;
      if (!first) break;
      const [key, e] = first;
      this.entries.delete(key);
      this.total -= e.bytes;
      this.dispose(e.value);
    }
  }

  flush(): void {
    const all = [...this.entries.values()];
    this.entries.clear();
    this.total = 0;
    for (const e of all) this.dispose(e.value);
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
