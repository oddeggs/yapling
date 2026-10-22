/*
 * Contact sheets of the living critters, drawn through the app's own rig code on CanvasKit: per
 * species, an overview (a row per act, twelve moments each) and a sheet per act (every 4th frame at
 * 60 fps, left to right, top to bottom), with the species' tuning and the mood's raised paws. Each
 * act plays once through, held acts included (their release is seen once).
 *
 *   pnpm --filter @yapling/art rig:sheets <out dir> [mood] [species…]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PIP_SPECIES, type Mood, type Species } from '../critter';
import { ACT_NAMES, ACTS } from '../rig/acts';
import { drawRig } from '../rig/draw';
import { poseAt, seedOf } from '../rig/pose';
import { raisedPaws } from '../rig/support';
import { tuneOf } from '../rig/tuning';
import { createNodeRenderer, encodePng, rasterize } from './index';

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

const [outDir = 'rig-sheets', mood = 'happy', ...only] = process.argv.slice(2);
const species = only.length ? (only as Species[]) : SPECIES;
const SIZE = 110;
const PAD = Math.round(SIZE * 0.3);
const CELL_W = SIZE + 2 * PAD;
const CELL_H = Math.round(SIZE * 1.2) + 2 * PAD;
/** The sticker paper (LIL2), and every other cell a shade darker to tell frames apart. */
const PAPER = Float32Array.of(0.976, 0.855, 0.984, 1);
const SHADE = Float32Array.of(0.95, 0.83, 0.96, 1);

const renderer = await createNodeRenderer();
mkdirSync(outDir, { recursive: true });

for (const sp of species) {
  const rig = renderer.critterRig({ species: sp, mood: mood as Mood, size: SIZE }, 1);
  const seed = seedOf(`${sp}${SIZE}`);
  const options = {
    tune: tuneOf(sp),
    raised: raisedPaws(rig.pivots.ground, rig.pivots.paws, rig.unit),
  };
  const sheet = (cols: number, frames: readonly { act: (typeof ACT_NAMES)[number]; a: number }[]) =>
    rasterize(renderer.skia, cols * CELL_W, Math.ceil(frames.length / cols) * CELL_H, (c) => {
      c.clear(PAPER);
      frames.forEach(({ act, a }, i) => {
        const x = (i % cols) * CELL_W;
        const y = Math.floor(i / cols) * CELL_H;
        c.save();
        c.translate(x, y);
        if ((i + Math.floor(i / cols)) % 2) {
          const p = renderer.skia.Paint();
          p.setColor(SHADE);
          c.drawRect({ x: 0, y: 0, width: CELL_W, height: CELL_H }, p);
        }
        c.translate(PAD, PAD);
        // The idle runs on the same clock as the act, as on screen.
        drawRig(c, rig, poseAt(a, a, ACTS[act], 1, seed, options));
        c.restore();
      });
    });

  const overview = ACT_NAMES.flatMap((act) =>
    Array.from({ length: 12 }, (_, i) => ({ act, a: (i / 11) * ACTS[act].duration })),
  );
  writeFileSync(join(outDir, `${sp}-${mood}.png`), encodePng(sheet(12, overview)));
  for (const act of ACT_NAMES) {
    const n = Math.ceil((ACTS[act].duration / 1000) * 15);
    const frames = Array.from({ length: n + 1 }, (_, f) => ({ act, a: (f / 15) * 1000 }));
    writeFileSync(join(outDir, `${sp}-${mood}-${act}.png`), encodePng(sheet(15, frames)));
  }
  console.log(sp, mood);
}
