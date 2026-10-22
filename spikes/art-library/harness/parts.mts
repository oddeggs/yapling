// Checks that worn items land in the critter's body runs, not in the eye or mouth parts the app swaps.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const SRC = '/Users/kbm5pro/oddeggs/yapling/packages/art/src';
const node = await import(`${SRC}/node/index.ts`);
const { critterParts } = await import(`${SRC}/critter.ts`);
const { Path2DShim } = await import(`${SRC}/canvas/path.ts`);
const { CanvasElementShim } = await import(`${SRC}/canvas/context.ts`);
const gen = process.argv[2]!;
const r = await node.createNodeRenderer();
const skia = r.skia, win = r.proto.window as any;
class Path2D extends Path2DShim { constructor(i?: unknown) { super(skia, i as never); } }
const doc = { createElement: (t: string) => (t === 'canvas' ? new CanvasElementShim(skia, 300, 150, 'vector') : { tagName: t }) };
for (const f of readdirSync(gen).filter((f) => f.endsWith('.js')).sort()) new Function('window','document','Path2D','setTimeout', readFileSync(join(gen, f), 'utf8'))(win, doc, Path2D, () => {});
const orig = win.YapArt.s_critter;
const n = (l: readonly unknown[]) => l.length;
for (const sp of ['redpanda', 'capybara', 'cat']) for (const mood of ['happy', 'excited']) {
  win.YapArt.s_critter = orig;
  const bare = critterParts(r.proto, skia, { species: sp, mood, size: 200 });
  win.YapArt.s_critter = (c: any, w: number, h: number, o: any) => orig(c, w, h, { ...o, wear: ['glasses', 'scarf', 'sun-hat'] });
  const worn = critterParts(r.proto, skia, { species: sp, mood, size: 200 });
  const eq = (a: any, b: any) => n(a) === n(b) && a.every((op: any, i: number) => op.key === b[i].key);
  const eyesSame = bare.eyes && worn.eyes ? eq(bare.eyes.open, worn.eyes.open) && eq(bare.eyes.closed, worn.eyes.closed) : bare.eyes === worn.eyes;
  const mouthsSame = Object.keys(bare.mouths).every((m) => eq(bare.mouths[m], worn.mouths[m]));
  console.log(`${sp} ${mood}: body ops bare ${bare.body.map(n).join('/')} -> worn ${worn.body.map(n).join('/')}; outline ${n(bare.outline)} -> ${n(worn.outline)}; eyes identical ${eyesSame}; all 8 mouths identical ${mouthsSame}`);
}
