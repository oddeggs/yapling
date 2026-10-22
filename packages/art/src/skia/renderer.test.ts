import { beforeAll, describe, expect, it } from 'vitest';

import { MOODS, PIP_SPECIES, type Species } from '../critter';
import { diff } from '../golden/compare';
import { createNodeRenderer, rasterize, readPixels } from '../node';
import type { ArtRenderer } from './renderer';

const SPECIES: Species[] = [
  ...PIP_SPECIES,
  'otter',
  'pangolin',
  'tarsier',
  'raccoon',
  'koala',
  'bulldog',
  'bison',
  'tiger',
];

let renderer: ArtRenderer;
beforeAll(async () => {
  renderer = await createNodeRenderer();
});

/** A critter drawn at `ratio` pixels per point on whole pixels, as a screen draws it. */
function draw(
  species: Species,
  mood: (typeof MOODS)[number],
  size: number,
  ratio: number,
  cached: boolean,
) {
  const pad = Math.ceil(size * 0.15);
  const W = Math.ceil((size + 2 * pad) * ratio);
  const H = Math.ceil((size * 1.2 + 2 * pad) * ratio);
  const pics = renderer.critter({ species, mood, size }, cached ? ratio : 0);
  const pixels = readPixels(
    rasterize(renderer.skia, W, H, (c) => {
      c.scale(ratio, ratio);
      c.translate(pad, pad);
      renderer.drawCritter(c, pics, 'A', false);
    }),
  );
  return { pixels, W, H };
}

describe('the cached outline', () => {
  it.each(SPECIES)('%s: draws the outline’s own pixels in every mood', (species) => {
    let worst = 0;
    let worstTile = 0;
    for (const mood of MOODS) {
      // Every mood at the renders' density; a few at a phone's, at a burrow critter's size.
      const at = ['happy', 'shy', 'wave'].includes(mood)
        ? [
            [200, 2],
            [110, 3],
          ]
        : [[200, 2]];
      for (const [size, ratio] of at as [number, number][]) {
        const a = draw(species, mood, size, ratio, false);
        const b = draw(species, mood, size, ratio, true);
        const d = diff(a.pixels, b.pixels, a.W, a.H);
        worst = Math.max(worst, d.mean);
        worstTile = Math.max(worstTile, d.worstTile);
      }
    }
    // Measured: mean under 0.002/255, worst 32-px tile under 0.06/255.
    expect(worst).toBeLessThan(0.01);
    expect(worstTile).toBeLessThan(0.25);
  });
});
