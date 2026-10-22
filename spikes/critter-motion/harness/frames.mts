/*
 * Renders the rig's acts offline through the app's own drawing code (CanvasKit in Node): every
 * frame at 60 fps as PNG, a contact sheet of every 4th frame per act, and an MP4 per act.
 *
 *   cd packages/art && ./node_modules/.bin/tsx ../../spikes/critter-motion/harness/frames.mts <out dir> [species] [size]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createNodeRenderer, encodePng, rasterize } from '../../../packages/art/src/node/index.ts';
import { ACTS, ACT_NAMES } from '../../../packages/art/src/rig/acts.ts';
import { drawRig } from '../../../packages/art/src/rig/draw.ts';
import { poseAt, seedOf } from '../../../packages/art/src/rig/pose.ts';

const [outDir = 'out', species = 'redpanda', sizeArg = '200'] = process.argv.slice(2);
const size = Number(sizeArg);
const renderer = await createNodeRenderer();
const rig = renderer.critterRig({ species: species as never, mood: 'happy', size }, 1);
const today = renderer.critter({ species: species as never, mood: 'happy', size });
const pad = Math.round(size * 0.3);
const W = size + 2 * pad;
const H = Math.round(size * 1.2) + 2 * pad;
const seed = seedOf(`${species}${size}`);
const bg = Float32Array.of(0.976, 0.855, 0.984, 1); // the sticker paper (LIL2)

for (const name of ACT_NAMES) {
  const act = ACTS[name];
  const dir = join(outDir, `${species}-${name}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = Math.ceil((act.duration / 1000) * 60);
  for (let f = 0; f <= frames; f++) {
    const a = (f / 60) * 1000;
    const pose = poseAt(a, a, act, 1, seed);
    const img = rasterize(renderer.skia, W * 2, H, (c) => {
      c.clear(bg);
      c.save();
      c.translate(pad, pad);
      renderer.drawCritter(c, today);
      c.restore();
      c.translate(W + pad, pad);
      drawRig(c, rig, pose);
    });
    writeFileSync(join(dir, `${String(f).padStart(4, '0')}.png`), encodePng(img));
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', join(dir, '%04d.png'), '-vf', 'format=yuv420p', '-c:v', 'libx264', '-crf', '18', join(outDir, `${species}-${name}.mp4`)]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', join(dir, '%04d.png'), '-vf', `select='not(mod(n\\,4))',scale=${W}:-1,tile=8x${Math.ceil(frames / 4 / 8)}`, '-frames:v', '1', join(outDir, `${species}-${name}-sheet.png`)]);
  console.log(name, frames, 'frames');
}
