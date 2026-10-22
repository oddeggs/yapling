import { describe, expect, it } from 'vitest';

import { bezierAt, curves } from './easing';
import { liveCurves } from './live';

describe('the living-art curves', () => {
  it('travel eases in and out, always forward, with no overshoot', () => {
    let last = 0;
    for (let i = 0; i <= 100; i++) {
      const v = bezierAt(liveCurves.travel, i / 100);
      expect(v).toBeGreaterThanOrEqual(last - 1e-9);
      expect(v).toBeLessThanOrEqual(1);
      last = v;
    }
    // Slow at both ends, fast in the middle.
    expect(bezierAt(liveCurves.travel, 0.1)).toBeLessThan(0.05);
    expect(bezierAt(liveCurves.travel, 0.9)).toBeGreaterThan(0.95);
  });

  it('arrive is the theme’s own rise curve', () => {
    expect(liveCurves.arrive).toBe(curves.rise);
  });
});
