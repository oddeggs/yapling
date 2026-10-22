import { beforeAll, describe, expect, it } from 'vitest';

import { PIP_SPECIES, type Species } from '../critter';
import { diff } from '../golden/compare';
import { createNodeRenderer, rasterize, readPixels } from '../node';
import type { ArtRenderer } from '../skia/renderer';
import { drawRig, REST_POSE } from './draw';
import { critterRig } from './parts';

const CAST: Species[] = [
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

describe('the critter rig', () => {
  it.each(CAST)('%s: cuts into parts from the synced generator alone', (species) => {
    const rig = critterRig(renderer.proto, renderer.skia, { species, mood: 'happy', size: 200 });
    expect(rig.feet.every((f) => f.length === 1)).toBe(true);
    expect(rig.paws[0].length).toBe(rig.paws[1].length);
    expect(rig.eyes).not.toBeNull();
    for (const eye of rig.eyes ?? []) {
      expect(eye.pupil.length).toBeGreaterThan(0);
      expect(eye.lid?.length).toBe(2);
      expect(eye.closed.length).toBe(1);
    }
    expect(rig.brows.every((b) => b.length === 1)).toBe(true);
    expect(rig.mouths.A.length).toBeGreaterThan(0);
  });

  it('finds the joints the generator turns parts about (red panda: tail root, ear roots)', () => {
    const rig = critterRig(renderer.proto, renderer.skia, {
      species: 'redpanda',
      mood: 'happy',
      size: 200,
    });
    // yap-cast.js: rot(ctx,146,188,…) for the tail, pair(ctx,64,70,…) for the ears; +12 for the
    // critter's translate(0,12).
    expect(rig.pivots.tail?.x).toBeCloseTo(146, 6);
    expect(rig.pivots.tail?.y).toBeCloseTo(200, 6);
    expect(rig.pivots.ears?.[0].x).toBeCloseTo(64, 6);
    expect(rig.pivots.ears?.[0].y).toBeCloseTo(82, 6);
    expect(rig.pivots.ears?.[1].x).toBeCloseTo(136, 6);
  });

  it.each([...PIP_SPECIES, 'otter', 'pangolin'] as const)(
    '%s: at rest draws what today’s critter draws (outlines as pictures and as pixels)',
    (species) => {
      const spec = { species, mood: 'happy' as const, size: 200 };
      const W = 260;
      const H = 300;
      const today = readPixels(
        rasterize(renderer.skia, W, H, (c) => {
          c.translate(30, 30);
          renderer.drawCritter(c, renderer.critter(spec));
        }),
      );
      for (const ratio of [0, 1]) {
        const rig = readPixels(
          rasterize(renderer.skia, W, H, (c) => {
            c.translate(30, 30);
            drawRig(c, renderer.critterRig(spec, ratio), REST_POSE);
          }),
        );
        const d = diff(today, rig, W, H);
        expect(d.mean, `ratio ${ratio}`).toBeLessThan(0.05);
        expect(d.worstTile, `ratio ${ratio}`).toBeLessThan(1);
      }
    },
  );
});
