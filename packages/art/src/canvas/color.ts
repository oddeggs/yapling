/** A CSS colour as unpremultiplied RGBA, each 0–1. */
export type Rgba = readonly [r: number, g: number, b: number, a: number];

const NAMED: Record<string, Rgba> = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [1, 1, 1, 1],
};

const cache = new Map<string, Rgba>();

/** Parses the colour forms the generators write: `#rgb`, `#rrggbb`, `rgb()`, `rgba()` and a few names. */
export function parseColor(input: string): Rgba | null {
  const hit = cache.get(input);
  if (hit) return hit;
  const s = input.trim().toLowerCase();
  let out: Rgba | null = NAMED[s] ?? null;
  if (!out && s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(h)) {
      const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
      out = [n(0), n(2), n(4), h.length === 8 ? n(6) : 1];
    }
  }
  if (!out) {
    const m = /^rgba?\(\s*([^)]*)\)$/.exec(s);
    if (m?.[1] !== undefined) {
      const parts = m[1].split(/[\s,/]+/).filter(Boolean);
      const ch = (p: string | undefined) =>
        p === undefined ? NaN : p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p) / 255;
      const al = (p: string | undefined) =>
        p === undefined ? 1 : p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p);
      const c: Rgba = [ch(parts[0]), ch(parts[1]), ch(parts[2]), al(parts[3])];
      if (c.every((v) => Number.isFinite(v))) {
        out = c.map((v) => Math.min(1, Math.max(0, v))) as unknown as Rgba;
      }
    }
  }
  if (out) {
    // Canvas stores colours as 8-bit values; round as the browser does.
    const q = (v: number) => Math.round(v * 255) / 255;
    out = [q(out[0]), q(out[1]), q(out[2]), q(out[3])];
    cache.set(input, out);
  }
  return out;
}
