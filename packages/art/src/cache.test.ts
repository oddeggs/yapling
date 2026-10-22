import { describe, expect, it } from 'vitest';

import { LruCache } from './cache';

describe('the picture cache', () => {
  it('evicts the oldest entry past its cap, keeping the newest', () => {
    const gone: string[] = [];
    const c = new LruCache<string>(10, (v) => gone.push(v));
    c.set('a', 'A', 4);
    c.set('b', 'B', 4);
    c.get('a');
    c.set('c', 'C', 4);
    expect(c.has('b')).toBe(false);
    expect(c.has('a')).toBe(true);
    expect(c.bytes).toBe(8);
    // Never pinned: let go of, not disposed (something may still hold it).
    expect(gone).toEqual([]);
    c.set('huge', 'H', 50);
    expect(c.has('huge')).toBe(true);
  });

  it('never evicts what is on screen, and disposes what was drawn once it goes', () => {
    const gone: string[] = [];
    const c = new LruCache<string>(10, (v) => gone.push(v));
    c.set('pip', 'P', 6);
    expect(c.pin('pip')).toBe(true);
    c.set('mei', 'M', 6);
    c.set('linh', 'L', 6);
    // Pip is the oldest but pinned: Mei goes instead.
    expect(c.has('pip')).toBe(true);
    expect(c.has('mei')).toBe(false);
    expect(c.pinnedBytes).toBe(6);
    c.unpin('pip');
    // Unpinned and over the cap: the oldest unused goes, and is disposed.
    expect(c.has('pip')).toBe(false);
    expect(gone).toEqual(['P']);
  });

  it('counts pins per user and flushes only what is not drawn', () => {
    const gone: string[] = [];
    const c = new LruCache<string>(100, (v) => gone.push(v));
    c.set('a', 'A', 1);
    c.set('b', 'B', 1);
    c.pin('a');
    c.pin('a');
    c.pin('b');
    c.unpin('a');
    c.unpin('b');
    expect(c.isPinned('a')).toBe(true);
    c.flush();
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
    expect(gone).toEqual(['B']);
    expect(c.pin('missing')).toBe(false);
  });
});
