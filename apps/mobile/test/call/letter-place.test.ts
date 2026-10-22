import { describe, expect, it } from '@jest/globals';
import { findScene } from '@yapling/story';

import {
  bandOf,
  collides,
  homeFor,
  letterBox,
  peekScale,
  peekSpot,
} from '../../src/features/call/letter-place';
import { FRAME_WIDTH, layoutFor } from '../../src/features/call/scene-layout';

const scene = findScene('s1-e1');
if (!scene) throw new Error('no episode call');
const layout = layoutFor(scene);
const spots = layout.letter;
if (!spots) throw new Error('the café has no letter spots');

/** The faces on the café stage, in frame points, as the art draws them. */
const MEI_FACE = { left: 104, right: 236, top: 270, bottom: 372 };
const PIP_FACE = { left: 268, right: 382, top: 510, bottom: 622 };
/** The counter's top edge: below it the host is hidden. */
const COUNTER_TOP = 409;

/** The phones the app runs on: the smallest, a Pro and a Pro Max (width, height, status bar). */
const PHONES = [
  { name: 'iPhone SE', width: 375, height: 667, inset: 20 },
  { name: 'iPhone 16 Pro', width: 393, height: 852, inset: 62 },
  { name: 'iPhone 16 Pro Max', width: 440, height: 956, inset: 62 },
];

const frameOf = (p: (typeof PHONES)[number]) => {
  const k = p.width / FRAME_WIDTH;
  const pillTop = Math.max(58, p.inset + 4);
  return { k, width: p.width, topBound: pillTop + 40, bottomBound: p.height - 24 - 104 };
};

const overlaps = (
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const scaled = (r: typeof MEI_FACE, k: number) => ({
  left: r.left * k,
  right: r.right * k,
  top: r.top * k,
  bottom: r.bottom * k,
});

describe('the letter on the call frame', () => {
  it('opens where the bubble on screen is not', () => {
    const mei = layout.bubbles.mei;
    const pip = layout.bubbles.pip;
    const office = layout.bubbles.office;
    if (!mei || !pip || !office) throw new Error('missing bubble spots');
    expect(bandOf(spots, mei)).toBe('high');
    expect(bandOf(spots, office)).toBe('high');
    expect(bandOf(spots, pip)).toBe('low');
    expect(homeFor('high')).toBe('low');
    expect(homeFor(null)).toBe('low');
    expect(homeFor('low')).toBe('high');
  });

  it('gives way when a bubble comes to its home, and only then', () => {
    expect(collides('low', 'low')).toBe(true);
    expect(collides('high', 'high')).toBe(true);
    expect(collides('low', 'high')).toBe(false);
    expect(collides('high', 'low')).toBe(false);
    expect(collides('low', null)).toBe(false);
  });

  for (const phone of PHONES) {
    it(`keeps both faces clear on an ${phone.name}`, () => {
      const f = frameOf(phone);
      for (const home of ['low', 'high'] as const) {
        const box = letterBox(spots, home, f);
        const rect = {
          left: box.left,
          right: box.left + box.width,
          top: box.top,
          bottom: box.top + box.maxHeight,
        };
        expect(overlaps(rect, scaled(MEI_FACE, f.k))).toBe(false);
        expect(overlaps(rect, scaled(PIP_FACE, f.k))).toBe(false);
        expect(rect.right).toBeLessThanOrEqual(phone.width - 16);
        if (home === 'low') {
          expect(rect.top).toBeGreaterThan(COUNTER_TOP * f.k);
          expect(rect.bottom).toBeLessThanOrEqual(Math.max(f.bottomBound, rect.top + 56));
        } else {
          expect(rect.top).toBeGreaterThan(f.topBound);
        }
      }
    });

    it(`tucks into the corner left of the roommate's bubble on an ${phone.name}`, () => {
      const f = frameOf(phone);
      const pip = layout.bubbles.pip;
      if (!pip) throw new Error('missing bubble spot');
      const peek = peekSpot(spots, f.k);
      const width = letterBox(spots, 'low', f).width;
      expect(peek.left + width * peekScale(spots, width)).toBeLessThan(pip.left);
      expect(peek.top).toBeGreaterThan(COUNTER_TOP * f.k);
    });
  }
});
