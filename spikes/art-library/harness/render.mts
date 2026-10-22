// Spike harness: the app's own renderer (@yapling/art ArtRenderer on CanvasKit) with the spike's
// generator files loaded after the prototype's, plus a style linter that watches every draw call.
//
//   tsx harness/render.ts <specs.json> [--out <dir>] [--gen <dir>]
//
// specs.json: [{ file, fn, w, h, o, scale?=2, pad?=8, bg?, lint? }]. Writes PNGs and <out>/metrics.json.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const SRC = '/Users/kbm5pro/oddeggs/yapling/packages/art/src';
const node = await import(`${SRC}/node/index.ts`);
const { Path2DShim } = await import(`${SRC}/canvas/path.ts`);
const { CanvasElementShim, Context2DShim } = await import(`${SRC}/canvas/context.ts`);

const HERE = dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1]! : d;
};
const specsPath = resolve(args[0]!);
const outDir = resolve(opt('--out', join(HERE, '../out')));
const genDir = resolve(opt('--gen', join(HERE, '../gen')));

// ---- style linter: wraps the context's draw calls -------------------------------------------
const PALETTE = new Set(
  [
    '#17131C', '#EFA3F4', '#F9DAFB', '#22BFF2', '#CFF0FD', '#5FD98A', '#D7F7E2', '#D3CCDC', '#FFFFFF',
    '#F2CFA8', '#E6BE93', '#C99A6E', '#FFE48A', '#FFD66B', '#FFC27A', '#F5B38A', '#FF8D6B', '#FFE9C2',
    '#8C6A4E', '#7A4E33', '#5B4A8C', '#2E2740', '#241B38', '#3B3160', '#E8E4EE', '#B9B0C4', '#FBFAFD',
    '#A8E4FA', '#F6DCBC', '#FFF3C4', '#3E3470', '#E4F7FE', '#F4FCFF', '#D9B184', '#FFF6EA', '#5D5366',
    '#F4F1F7', '#E4DEEA', '#FFFDF6', '#9A90A6',
  ].map((c) => c.toUpperCase()),
);
const okRgba = /^rgba\((23,19,28|255,255,255|28,20,52|255,170,130|240,110,150|110,130,170|255,205,150|34,150,220|255,226,154|255,230,140|255,227,160|255,190,120|255,225,170|255,160,90|207,240,253|249,218,251|239,163,244|34,191,242|255,214,107)/;
type Lint = { colours: Record<string, number>; offPalette: string[]; inkStrokes: number[]; thin: number; thick: number; draws: number; gradients: number };
let lint: Lint | null = null;
const hex2 = (n: string) => Number(n).toString(16).padStart(2, '0');
const norm = (c: unknown) => {
  if (typeof c !== 'string') return 'GRADIENT';
  const s = c.replace(/\s+/g, '').toLowerCase();
  const m = /^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/.exec(s);
  if (m && (m[4] === undefined || Number(m[4]) === 1)) return `#${hex2(m[1]!)}${hex2(m[2]!)}${hex2(m[3]!)}`.toUpperCase();
  return s.startsWith('#') ? s.toUpperCase() : s;
};
function noteColour(c: unknown) {
  if (!lint) return;
  const k = norm(c);
  if (k === 'GRADIENT') { lint.gradients++; return; }
  lint.colours[k] = (lint.colours[k] ?? 0) + 1;
  const ok = PALETTE.has(k) || okRgba.test(k) || k === 'rgba(0,0,0,0)';
  if (!ok && !lint.offPalette.includes(k)) lint.offPalette.push(k);
}
const P = Context2DShim.prototype as any;
for (const m of ['fill', 'fillRect', 'fillText']) {
  const f = P[m];
  P[m] = function (this: any, ...a: unknown[]) {
    if (lint) { lint.draws++; noteColour(this.fillStyle); }
    return f.apply(this, a);
  };
}
for (const m of ['stroke', 'strokeRect']) {
  const f = P[m];
  P[m] = function (this: any, ...a: unknown[]) {
    if (lint) {
      lint.draws++;
      noteColour(this.strokeStyle);
      const t = this.getTransform();
      const k = Math.sqrt(Math.abs(t.a * t.d - t.b * t.c));
      const lw = this.lineWidth * k;
      if (norm(this.strokeStyle) === '#17131C') {
        lint.inkStrokes.push(Math.round(lw * 10) / 10);
        if (lw < 1.6) lint.thin++;
        if (lw > 7.5) lint.thick++;
      }
    }
    return f.apply(this, a);
  };
}

// ---- renderer + spike generators ------------------------------------------------------------
const renderer = await node.createNodeRenderer();
const skia = renderer.skia;
const win = renderer.proto.window as Record<string, unknown>;
class Path2D extends Path2DShim {
  constructor(init?: unknown) { super(skia, init as never); }
}
const doc = { createElement: (t: string) => (t === 'canvas' ? new CanvasElementShim(skia, 300, 150, 'vector') : { tagName: t }) };
const genFiles = readdirSync(genDir).filter((f) => f.endsWith('.js')).sort();
const genBytes: Record<string, { raw: number; gz: number }> = {};
for (const f of genFiles) {
  const src = readFileSync(join(genDir, f), 'utf8');
  genBytes[f] = { raw: Buffer.byteLength(src), gz: gzipSync(src).length };
  try {
    new Function('window', 'document', 'Path2D', 'setTimeout', src)(win, doc, Path2D, () => {
      throw new Error(`${f}: boot waited (load order)`);
    });
  } catch (e) {
    console.error(`LOAD FAIL ${f}: ${(e as Error).message}`);
  }
}

// ---- render ----------------------------------------------------------------------------------
type Spec = { file: string; fn: string; w: number; h: number; o: object; scale?: number; pad?: number; bg?: string; lint?: boolean };
const specs: Spec[] = JSON.parse(readFileSync(specsPath, 'utf8'));
const metrics: Record<string, unknown>[] = [];
for (const s of specs) {
  const scale = s.scale ?? 2, pad = s.pad ?? 8;
  const W = Math.ceil((s.w + 2 * pad) * scale), H = Math.ceil((s.h + 2 * pad) * scale);
  lint = { colours: {}, offPalette: [], inkStrokes: [], thin: 0, thick: 0, draws: 0, gradients: 0 };
  let keepLint: Lint | null = null;
  let err: string | null = null, rec = 0, bytes = 0, ser = 0, ops = 0;
  try {
    const t0 = performance.now();
    const ops0 = node.recordSpec(renderer.proto, skia, { fn: s.fn, w: s.w, h: s.h, o: s.o, canvas: { width: Math.ceil(s.w), height: Math.ceil(s.h) }, transform: [1, 0, 0, 1, 0, 0] });
    ops = ops0.length;
    keepLint = lint; lint = null;
    const before = renderer.cache.bytes;
    const pic = renderer.art({ fn: s.fn, w: s.w, h: s.h, o: s.o });
    rec = performance.now() - t0;
    bytes = renderer.cache.bytes - before;
    ser = pic.picture.serialize()?.length ?? 0;
    const img = node.rasterize(skia, W, H, (c: any) => {
      if (s.bg) c.drawColor(skia.Color(s.bg));
      c.translate(pad * scale, pad * scale);
      c.scale(scale, scale);
      c.drawPicture(pic.picture);
    });
    const file = join(outDir, s.file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, node.encodePng(img));
    // Bounds check: opaque pixels beyond the box (shadow allowance 6 units) and the lowest opaque row.
    if (s.lint !== false && !s.bg && keepLint) {
      const px = node.readPixels(img);
      let outside = 0, lowest = -1, topmost = H;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (px[(y * W + x) * 4 + 3]! > 24) {
          const ux = x / scale - pad, uy = y / scale - pad;
          if (ux < -6 || uy < -6 || ux > s.w + 6 || uy > s.h + 6) outside++;
          if (uy > lowest) lowest = uy;
          if (uy < topmost) topmost = uy;
        }
      }
      (keepLint as any).outsidePx = outside;
      (keepLint as any).baseline = Math.round((lowest / s.h) * 100) / 100;
      (keepLint as any).fillsHeight = Math.round(((lowest - topmost) / s.h) * 100) / 100;
    }
    img.dispose();
  } catch (e) {
    err = (e as Error).message;
  }
  const L = (keepLint ?? lint)!;
  const strokes = L.inkStrokes;
  metrics.push({
    file: s.file, fn: s.fn, o: s.o, err, recordMs: Math.round(rec * 10) / 10, ops, cacheBytes: bytes, pictureBytes: ser,
    draws: L.draws, gradients: L.gradients, offPalette: L.offPalette, colours: Object.keys(L.colours).length,
    inkStroke: strokes.length ? { min: Math.min(...strokes), max: Math.max(...strokes), n: strokes.length } : null,
    thin: L.thin, thick: L.thick, outsidePx: (L as any).outsidePx, baseline: (L as any).baseline, fillsHeight: (L as any).fillsHeight,
  });
  lint = null;
  const m = metrics[metrics.length - 1] as any;
  const flags = [m.offPalette.length ? `offPalette=${m.offPalette.join('/')}` : '', m.gradients ? `gradients=${m.gradients}` : '', m.thin ? `thin=${m.thin}` : '', m.thick ? `thick=${m.thick}` : '', m.outsidePx > 40 ? `outsidePx=${m.outsidePx}` : ''].filter(Boolean).join(' ');
  console.log(`${err ? 'ERR ' : 'ok  '}${s.file}${err ? ' ' + err : ''}  ops=${m.ops} ink=${m.inkStroke ? m.inkStroke.min + '-' + m.inkStroke.max : '-'} base=${m.baseline ?? '-'} h=${m.fillsHeight ?? '-'} ${flags ? 'FLAGS ' + flags : ''}`);
}
mkdirSync(outDir, { recursive: true });
const mfile = join(outDir, opt('--metrics', 'metrics.json'));
writeFileSync(mfile, JSON.stringify({ genBytes, metrics }, null, 1));
console.log(`wrote ${metrics.length} → ${outDir}, metrics ${mfile}`);
