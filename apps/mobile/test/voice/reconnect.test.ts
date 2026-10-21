import { describe, expect, it } from '@jest/globals';

import { DEFAULT_BACKOFF, Reconnector } from '../../src/voice/reconnect';

describe('reconnecting', () => {
  it('backs off exponentially up to a cap', () => {
    const r = new Reconnector(DEFAULT_BACKOFF, () => 0.5); // no jitter
    r.dropped(0);
    const delays = Array.from({ length: 8 }, () => r.nextDelay(0));
    expect(delays).toEqual([250, 500, 1000, 2000, 4000, 8000, 8000, 8000]);
  });

  it('spreads retries by the jitter fraction', () => {
    const low = new Reconnector(DEFAULT_BACKOFF, () => 0);
    const high = new Reconnector(DEFAULT_BACKOFF, () => 1);
    expect(low.nextDelay(0)).toBe(200);
    expect(high.nextDelay(0)).toBe(300);
  });

  it('gives up two minutes after the drop, never scheduling past the window', () => {
    const r = new Reconnector(DEFAULT_BACKOFF, () => 0.5);
    r.dropped(1000);
    let now = 1000;
    let attempts = 0;
    for (;;) {
      const d = r.nextDelay(now);
      if (d === null) break;
      now += d;
      attempts++;
      expect(now).toBeLessThanOrEqual(1000 + 120_000);
    }
    expect(now).toBe(121_000);
    expect(attempts).toBeGreaterThan(10);
    expect(r.nextDelay(now + 5)).toBeNull();
  });

  it('starts over after a successful reconnect', () => {
    const r = new Reconnector(DEFAULT_BACKOFF, () => 0.5);
    r.dropped(0);
    r.nextDelay(0);
    r.nextDelay(0);
    r.succeeded();
    expect(r.active).toBe(false);
    r.dropped(500_000);
    expect(r.nextDelay(500_000)).toBe(250);
  });

  it('keeps the first drop time while still retrying', () => {
    const r = new Reconnector(DEFAULT_BACKOFF, () => 0.5);
    r.dropped(0);
    r.dropped(100_000);
    expect(r.nextDelay(119_900)).toBe(100);
  });
});
