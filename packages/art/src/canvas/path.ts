import type { SkPath, SkPathBuilder } from '@shopify/react-native-skia';

import { FillType, type SkiaApi } from '../skia/api';
import { multiply, rotation, toSk, translation, type Mat } from './matrix';

const TWO_PI = Math.PI * 2;
const DEG = 180 / Math.PI;
const ROOT2_OVER_2 = Math.SQRT1_2;

/** Chromium's `CanonicalizeAngle`: the start into [0, 2π), the end moved with it. */
function canonicalize(start: number, end: number): [number, number] {
  let s = start % TWO_PI;
  if (s < 0) {
    s += TWO_PI;
    if (s >= TWO_PI) s -= TWO_PI;
  }
  return [s, end + (s - start)];
}

/** Chromium's `AdjustEndAngle`: at most one full turn, in the asked direction. */
function adjustEnd(start: number, end: number, ccw: boolean): number {
  if (!ccw && end - start >= TWO_PI) return start + TWO_PI;
  if (ccw && start - end >= TWO_PI) return start - TWO_PI;
  if (!ccw && start > end) return start + (TWO_PI - ((start - end) % TWO_PI));
  if (ccw && start < end) return start - (TWO_PI - ((end - start) % TWO_PI));
  return end;
}

const nearly = (a: number, b: number) => Math.abs(a - b) <= 1 / 4096;

/** The radii of `roundRect`, as the four corners (tl, tr, br, bl) of the spec. */
function cornerRadii(
  radii: number | readonly number[] | undefined,
): [number, number, number, number] {
  const r = typeof radii === 'number' ? [radii] : radii && radii.length ? radii : [0];
  const v = r.map((n) => Math.max(0, Number(n) || 0));
  const [a = 0, b = a, c = a, d = b] = v;
  switch (v.length) {
    case 1:
      return [a, a, a, a];
    case 2:
      return [a, b, a, b];
    case 3:
      return [a, b, c, b];
    default:
      return [a, b, c, d];
  }
}

/**
 * The browser's `Path2D`, building a Skia path. Geometry follows Chromium's canvas path, so arcs,
 * ellipses and rounded rectangles come out as the prototype's do. Each path keeps a content key,
 * so equal drawings can be recognised.
 */
export class Path2DShim {
  private sk: SkPathBuilder;
  private built: SkPath | null = null;
  private evenOdd: SkPath | null = null;
  private parts: string[] = [];
  private keyMemo: string | null = null;
  /** Whether the path has a current point (canvas semantics: arcs then join it with a line). */
  private open = false;
  /** Bumped on every change; a drawing holds the version it used. */
  version = 0;

  constructor(
    readonly skia: SkiaApi,
    init?: string | Path2DShim,
  ) {
    if (typeof init === 'string') {
      const parsed = skia.Path.MakeFromSVGString(init);
      this.sk = parsed ? skia.PathBuilder.MakeFromPath(parsed) : skia.PathBuilder.Make();
      this.parts.push(`d${init}`);
      this.open = !this.sk.isEmpty();
    } else if (init instanceof Path2DShim) {
      this.sk = skia.PathBuilder.MakeFromPath(init.path);
      this.parts.push(init.key);
      this.open = init.open;
    } else {
      this.sk = skia.PathBuilder.Make();
    }
  }

  get key(): string {
    this.keyMemo ??= this.parts.join(';');
    return this.keyMemo;
  }

  /** The path as built so far (a snapshot, rebuilt after a change). */
  get path(): SkPath {
    this.built ??= this.sk.build();
    return this.built;
  }

  /** The path to fill or clip with the given rule. */
  pathFor(evenOdd: boolean): SkPath {
    if (!evenOdd) return this.path;
    this.evenOdd ??= this.skia.PathBuilder.MakeFromPath(this.path)
      .setFillType(FillType.EvenOdd)
      .build();
    return this.evenOdd;
  }

  get isEmpty(): boolean {
    return this.sk.isEmpty();
  }

  private touch(part: string): void {
    this.parts.push(part);
    this.keyMemo = null;
    this.built = null;
    this.evenOdd = null;
    this.version++;
  }

  /** Maps every point by `m` (the canvas keeps its current path in the current user space). */
  transformBy(m: Mat): void {
    this.sk.transform(toSk(m));
    this.touch(`T${m.join(',')}`);
  }

  moveTo(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.sk.moveTo(x, y);
    this.open = true;
    this.touch(`M${x},${y}`);
  }

  private ensure(x: number, y: number): void {
    if (!this.open) this.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (!this.open) return this.moveTo(x, y);
    this.sk.lineTo(x, y);
    this.touch(`L${x},${y}`);
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    if (![cx, cy, x, y].every(Number.isFinite)) return;
    this.ensure(cx, cy);
    this.sk.quadTo(cx, cy, x, y);
    this.touch(`Q${cx},${cy},${x},${y}`);
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    if (![c1x, c1y, c2x, c2y, x, y].every(Number.isFinite)) return;
    this.ensure(c1x, c1y);
    this.sk.cubicTo(c1x, c1y, c2x, c2y, x, y);
    this.touch(`C${c1x},${c1y},${c2x},${c2y},${x},${y}`);
  }

  closePath(): void {
    if (this.sk.isEmpty()) return;
    this.sk.close();
    this.touch('Z');
  }

  rect(x: number, y: number, w: number, h: number): void {
    if (![x, y, w, h].every(Number.isFinite)) return;
    this.sk.moveTo(x, y);
    this.sk.lineTo(x + w, y);
    this.sk.lineTo(x + w, y + h);
    this.sk.lineTo(x, y + h);
    this.sk.close();
    this.sk.moveTo(x, y);
    this.open = true;
    this.touch(`R${x},${y},${w},${h}`);
  }

  roundRect(x: number, y: number, w: number, h: number, radii?: number | readonly number[]): void {
    if (![x, y, w, h].every(Number.isFinite)) return;
    let [tl, tr, br, bl] = cornerRadii(radii);
    const aw = Math.abs(w);
    const ah = Math.abs(h);
    const scale = Math.min(
      tl + tr > 0 ? aw / (tl + tr) : Infinity,
      bl + br > 0 ? aw / (bl + br) : Infinity,
      tl + bl > 0 ? ah / (tl + bl) : Infinity,
      tr + br > 0 ? ah / (tr + br) : Infinity,
    );
    if (scale < 1) [tl, tr, br, bl] = [tl * scale, tr * scale, br * scale, bl * scale];
    // A negative width or height mirrors the rectangle, as the spec flips its corners.
    if (w < 0) [tl, tr, br, bl] = [tr, tl, bl, br];
    if (h < 0) [tl, tr, br, bl] = [bl, br, tr, tl];
    const l = Math.min(x, x + w);
    const t = Math.min(y, y + h);
    const r = l + aw;
    const b = t + ah;
    const p = this.sk;
    const W = ROOT2_OVER_2;
    p.moveTo(l + tl, t);
    p.lineTo(r - tr, t);
    if (tr) p.conicTo(r, t, r, t + tr, W);
    p.lineTo(r, b - br);
    if (br) p.conicTo(r, b, r - br, b, W);
    p.lineTo(l + bl, b);
    if (bl) p.conicTo(l, b, l, b - bl, W);
    p.lineTo(l, t + tl);
    if (tl) p.conicTo(l, t, l + tl, t, W);
    p.close();
    p.moveTo(x, y);
    this.open = true;
    this.touch(`RR${x},${y},${w},${h},${tl},${tr},${br},${bl}`);
  }

  arc(x: number, y: number, r: number, start: number, end: number, ccw = false): void {
    this.ellipse(x, y, r, r, 0, start, end, ccw);
  }

  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rot: number,
    start: number,
    end: number,
    ccw = false,
  ): void {
    if (![x, y, rx, ry, rot, start, end].every(Number.isFinite)) return;
    if (rx < 0 || ry < 0) throw new RangeError('The radius provided is negative.');
    const [s, e0] = canonicalize(start, end);
    const e = adjustEnd(s, e0, ccw);
    this.touch(`E${x},${y},${rx},${ry},${rot},${s},${e}`);
    if (!rot) {
      this.addEllipse(this.sk, x, y, rx, ry, s, e);
      this.open = true;
      return;
    }
    const local = this.skia.PathBuilder.Make();
    this.addEllipse(local, 0, 0, rx, ry, s, e);
    local.transform(toSk(multiply(translation(x, y), rotation(rot))));
    // Joined to the current point with a line, as arcTo would.
    this.sk.addPath(local.build(), undefined, this.open);
    this.open = true;
  }

  /** Chromium's `Path::AddEllipse`: arcs of the oval, a full turn as two half turns. */
  private addEllipse(
    p: SkPathBuilder,
    x: number,
    y: number,
    rx: number,
    ry: number,
    start: number,
    end: number,
  ): void {
    const oval = { x: x - rx, y: y - ry, width: 2 * rx, height: 2 * ry };
    const s = Math.fround(start * DEG);
    const sweep = Math.fround((end - start) * DEG);
    const forceMove = !this.open && p === this.sk;
    if (nearly(sweep, 360)) {
      p.arcToOval(oval, s, 180, forceMove);
      p.arcToOval(oval, s + 180, 180, false);
    } else if (nearly(sweep, -360)) {
      p.arcToOval(oval, s, -180, forceMove);
      p.arcToOval(oval, s - 180, -180, false);
    } else {
      p.arcToOval(oval, s, sweep, forceMove);
    }
  }

  /** `Path2D.addPath(path, transform?)`. */
  addPath(
    other: Path2DShim,
    m?: { a: number; b: number; c: number; d: number; e: number; f: number },
  ): void {
    const mat: Mat | null = m ? [m.a, m.b, m.c, m.d, m.e, m.f] : null;
    this.sk.addPath(other.path, mat ? this.skia.Matrix(toSk(mat)) : undefined, false);
    this.open = this.open || other.open;
    this.touch(`P(${other.key})${mat ? mat.join(',') : ''}`);
  }
}
