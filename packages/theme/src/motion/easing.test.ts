import { describe, expect, it } from 'vitest';

import { bezierAt, cssEasing, curves } from './easing';

describe('bezierAt', () => {
  it('starts at 0 and ends at 1 on every curve', () => {
    for (const c of [...Object.values(curves), ...Object.values(cssEasing)]) {
      expect(bezierAt(c, 0)).toBeCloseTo(0);
      expect(bezierAt(c, 1)).toBeCloseTo(1);
    }
  });

  it('is the identity on linear and follows CSS ease-out', () => {
    expect(bezierAt(cssEasing.linear, 0.3)).toBeCloseTo(0.3);
    // CSS ease-out at half time is 0.685 of the way.
    expect(bezierAt(cssEasing.easeOut, 0.5)).toBeCloseTo(0.6846, 3);
  });

  it('overshoots on the house pop and the zoom, and never on the glide', () => {
    const peak = (c: readonly [number, number, number, number]) =>
      Math.max(...Array.from({ length: 101 }, (_, i) => bezierAt(c, i / 100)));
    expect(peak(curves.pop)).toBeGreaterThan(1.05);
    expect(peak(curves.zoom)).toBeGreaterThan(1);
    expect(peak(curves.glide)).toBeLessThanOrEqual(1);
  });
});
