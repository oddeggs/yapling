import { beforeAll, describe, expect, it } from 'vitest';

import { Player } from './canvas/ops';
import { critterOps, critterParts, MOODS, MOUTHS, recordCritter, type Species } from './critter';
import { diff } from './golden/compare';
import { loadNodeSkia, rasterize, readPixels } from './node';
import { loadPrototype, type Prototype } from './runtime/prototype';
import type { SkiaApi } from './skia/api';

const SPECIES: Species[] = [
  'redpanda',
  'capybara',
  'cat',
  'pangolin',
  'otter',
  'tarsier',
  'raccoon',
  'koala',
  'bulldog',
  'bison',
  'tiger',
];

let skia: SkiaApi;
let proto: Prototype;
beforeAll(async () => {
  skia = await loadNodeSkia();
  proto = loadPrototype(skia);
});

const keys = (ops: readonly { key: string }[]) => ops.map((o) => o.key);

describe('the critter parts', () => {
  it('cover the cast rig', () => {
    expect([...proto.art.MOODS]).toEqual([...MOODS]);
    expect(Object.keys(proto.art.SPECIES).sort()).toEqual([...SPECIES].sort());
  });

  it.each(SPECIES)(
    '%s: put back together, draw every mood, mouth and blink as the generator does',
    (species) => {
      for (const mood of MOODS) {
        const spec = { species, mood, size: 200 };
        const parts = critterParts(proto, skia, spec);
        expect(parts.outline.length, `${mood} outline`).toBe(25);
        for (const mouth of MOUTHS) {
          expect(keys(critterOps(parts, mouth)), `${mood} ${mouth}`).toEqual(
            keys(recordCritter(proto, skia, spec, { mouth })),
          );
        }
        expect(keys(critterOps(parts, 'rest', true)), `${mood} blinking`).toEqual(
          keys(recordCritter(proto, skia, spec, { blink: true })),
        );
        // Every talking mouth is its own small part; only arcs of joy have no eyes to blink.
        for (const mouth of MOUTHS) expect(parts.mouths[mouth].length).toBeGreaterThan(0);
        expect(parts.eyes === null).toBe(mood === 'laugh' || mood === 'warm');
      }
    },
  );

  it('draw the same pixels as the generator, outline included', () => {
    const player = new Player(skia, null);
    for (const [species, mood, mouth] of [
      ['otter', 'happy', 'A'],
      ['redpanda', 'shy', 'O'],
      ['bulldog', 'think', 'M'],
    ] as const) {
      const spec = { species, mood, size: 200 };
      const parts = critterParts(proto, skia, spec);
      const draw = (ops: readonly Parameters<typeof player.play>[1][number][]) =>
        readPixels(
          rasterize(skia, 232, 272, (c) => {
            c.translate(16, 16);
            player.play(c, ops);
          }),
        );
      const a = draw(critterOps(parts, mouth));
      const b = draw(recordCritter(proto, skia, spec, { mouth }));
      expect(diff(a, b, 232, 272).mean).toBe(0);
    }
  });
});
