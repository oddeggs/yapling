/*
 * What drawing costs, on CanvasKit's CPU raster in Node (relative numbers only; the phone draws on
 * the GPU): today's critter, the rig, and the rig's parts without their outlines, per frame, for
 * Pip, Mei and Linh at the lab's size. Also recording time and picture sizes per part.
 *
 *   cd packages/art && ./node_modules/.bin/tsx ../../spikes/critter-motion/harness/raster-cost.mts
 */
import { createNodeRenderer } from '../../../packages/art/src/node/index.ts';
import { ACTS } from '../../../packages/art/src/rig/acts.ts';
import { drawRig } from '../../../packages/art/src/rig/draw.ts';
import { critterRig } from '../../../packages/art/src/rig/parts.ts';
import { poseAt } from '../../../packages/art/src/rig/pose.ts';
import { critterParts } from '../../../packages/art/src/critter.ts';

const r = await createNodeRenderer();
const size = 110;
const cast = ['redpanda', 'otter', 'pangolin'] as const;
const W = 3 * 200;
const H = 240;
const surface = r.skia.Surface.Make(W, H);
if (!surface) throw new Error('no surface');
const c = surface.getCanvas();

const time = (label: string, frames: number, draw: (f: number) => void) => {
  for (let f = 0; f < 20; f++) draw(f);
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) {
    c.clear(Float32Array.of(1, 1, 1, 1));
    draw(f);
    surface.flush();
  }
  const ms = (performance.now() - t0) / frames;
  console.log(`${label}: ${ms.toFixed(2)} ms/frame`);
};

// Recording cost (fresh renderer state per species: the rig's comparisons dominate).
for (const species of cast) {
  const spec = { species, mood: 'happy' as const, size };
  let t0 = performance.now();
  critterParts(r.proto, r.skia, spec);
  const tParts = performance.now() - t0;
  t0 = performance.now();
  const rig = critterRig(r.proto, r.skia, spec);
  const tRig = performance.now() - t0;
  t0 = performance.now();
  r.critter(spec);
  const tToday = performance.now() - t0;
  t0 = performance.now();
  r.critterRig(spec);
  const tRigPics = performance.now() - t0;
  const ops = (o: readonly unknown[]) => o.length;
  console.log(
    `${species}: cut today ${tParts.toFixed(1)} ms, rig ${tRig.toFixed(1)} ms; record+cut today ${tToday.toFixed(1)} ms, rig ${tRigPics.toFixed(1)} ms; ` +
      `rig parts ops: tail ${rig.tail?.length ?? 0}, ears ${rig.ears?.map(ops).join('/') ?? 0}, markings ${rig.markings.length}, eyes ${rig.eyes?.map((e) => e.white.length + e.pupil.length + e.ring.length + (e.lid?.length ?? 0)).join('/') ?? 0}`,
  );
}

const today = cast.map((species) => r.critter({ species, mood: 'happy', size }));
const rigs = cast.map((species) => r.critterRig({ species, mood: 'happy', size }));
const imaged = cast.map((species) => r.critterRig({ species, mood: 'happy', size }, 1));
const bare = rigs.map((p) => {
  const empty = r.record([]);
  return {
    ...p,
    ground: empty,
    outline: {
      body: { ...p.outline.body, picture: empty, image: null },
      tail: null,
      feet: p.outline.feet.map((o) => ({ ...o, picture: empty, image: null })) as unknown as typeof p.outline.feet,
      ears: null,
      paws: p.outline.paws.map((o) => ({ ...o, picture: empty, image: null })) as unknown as typeof p.outline.paws,
    },
  };
});
time('three today', 300, () => {
  today.forEach((p, i) => {
    c.save();
    c.translate(20 + i * 200, 20);
    r.drawCritter(c, p);
    c.restore();
  });
});
for (const [label, set] of [
  ['three rigs, outlines as pictures', rigs],
  ['three rigs, outlines as images', imaged],
  ['three rigs, no outlines', bare],
] as const) {
  time(label, 300, (f) => {
    set.forEach((p, i) => {
      c.save();
      c.translate(20 + i * 200, 20);
      const t = (f * 1000) / 60;
      drawRig(c, p, poseAt(t, t % 3400, ACTS.wave, 1, i / 3));
      c.restore();
    });
  });
}
const t0 = performance.now();
for (let f = 0; f < 3000; f++) poseAt(f * 16.7, (f * 16.7) % 6400, ACTS.listen, 1, 0.3);
console.log(`poseAt: ${((performance.now() - t0) / 3000).toFixed(3)} ms per critter (Node JIT; Hermes on the UI thread is slower)`);

// Memory: the cache's own estimate per entry, and the outline pixels at the phone's density.
for (const species of cast) {
  for (const ratio of [3]) {
    const before = r.cache.bytes;
    r.critterRig({ species, mood: 'happy', size: 140 }, ratio);
    const rigBytes = r.cache.bytes - before;
    const b2 = r.cache.bytes;
    r.critter({ species, mood: 'happy', size: 140 });
    console.log(`${species} @140pt ×${ratio}: rig ${(rigBytes / 1024).toFixed(0)} KB (outline pixels included), today ${((r.cache.bytes - b2) / 1024).toFixed(0)} KB (estimate)`);
  }
}
