import { BlendMode, PaintStyle, type SkiaApi } from '../skia/api';
import { parseColor, type Rgba } from './color';
import {
  DOMMatrixShim,
  IDENTITY,
  invert,
  isIdentity,
  multiply,
  rotation,
  scaling,
  translation,
  type Mat,
} from './matrix';
import {
  CAP,
  COMPOSITE,
  composesInline,
  JOIN,
  matKey,
  opKey,
  placeOps,
  transformPath,
  type Clip,
  type GradientStop,
  type Op,
  type PaintSpec,
  type Source,
} from './ops';
import { Path2DShim } from './path';

/** `ctx.createRadialGradient(…)` / `createLinearGradient(…)`. */
export class CanvasGradientShim {
  private readonly stops: GradientStop[] = [];

  constructor(
    private readonly geometry:
      | { kind: 'radial'; x0: number; y0: number; r0: number; x1: number; y1: number; r1: number }
      | { kind: 'linear'; x0: number; y0: number; x1: number; y1: number },
  ) {}

  addColorStop(offset: number, color: string): void {
    const c = parseColor(color);
    if (!c || !(offset >= 0 && offset <= 1)) throw new Error(`bad colour stop ${offset} ${color}`);
    this.stops.push({ offset, color: c });
  }

  /** The gradient as it stands now (stops added later do not change what was drawn). */
  source(): Source {
    const stops = [...this.stops].sort((a, b) => a.offset - b.offset);
    return { ...this.geometry, stops };
  }
}

type Style = Rgba | CanvasGradientShim;

interface State {
  m: Mat;
  clips: readonly Clip[];
  fill: Style;
  stroke: Style;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  miterLimit: number;
  dash: readonly number[];
  dashOffset: number;
  alpha: number;
  composite: string;
  font: string;
  textAlign: string;
  textBaseline: string;
}

const BLACK: Rgba = [0, 0, 0, 1];
const fresh = (): State => ({
  m: IDENTITY,
  clips: [],
  fill: BLACK,
  stroke: BLACK,
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  dash: [],
  dashOffset: 0,
  alpha: 1,
  composite: 'source-over',
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
});

/** A style as the browser reads it back: a colour as CSS, a gradient as itself. */
const cssStyle = (s: Style): string | CanvasGradientShim =>
  s instanceof CanvasGradientShim
    ? s
    : `rgba(${s
        .slice(0, 3)
        .map((v) => Math.round(v * 255))
        .join(', ')}, ${s[3]})`;

const styleKey = (s: Style) =>
  s instanceof CanvasGradientShim ? JSON.stringify(s.source()) : s.join(',');

/**
 * How a canvas drawn onto another canvas is replayed. `vector` replays its drawing in place, sharp
 * at any scale (what the app records). `raster` draws it into its own pixels first and then draws
 * those pixels, smoothed, as the browser does: a canvas placed at a fractional pixel comes out
 * slightly soft, as the prototype's faces do.
 */
export type OffscreenMode = 'vector' | 'raster';

/** A `<canvas>` element the generators draw into (`document.createElement('canvas')`). */
export class CanvasElementShim {
  private w: number;
  private h: number;
  private list: Op[] = [];
  private frozen: readonly Op[] | null = null;
  private ctx: Context2DShim | null = null;

  constructor(
    readonly skia: SkiaApi,
    width = 300,
    height = 150,
    readonly mode: OffscreenMode = 'vector',
  ) {
    this.w = width;
    this.h = height;
  }

  get width(): number {
    return this.w;
  }
  set width(v: number) {
    this.w = Math.max(0, Math.floor(v) || 0);
    this.reset();
  }
  get height(): number {
    return this.h;
  }
  set height(v: number) {
    this.h = Math.max(0, Math.floor(v) || 0);
    this.reset();
  }

  /** Everything drawn since the canvas was last cleared, as it stands now. */
  get ops(): readonly Op[] {
    this.frozen ??= [...this.list];
    return this.frozen;
  }

  push(op: Op): void {
    this.list.push(op);
    this.frozen = null;
  }

  clear(): void {
    this.list = [];
    this.frozen = null;
  }

  /** Setting a size clears the canvas and its context's state, as in the browser. */
  private reset(): void {
    this.clear();
    this.ctx?.resetState();
  }

  getContext(kind: string): Context2DShim | null {
    if (kind !== '2d') return null;
    this.ctx ??= new Context2DShim(this);
    return this.ctx;
  }
}

/**
 * The subset of `CanvasRenderingContext2D` the prototype's generators use, recording what they
 * draw as operations (see `ops.ts`). Geometry and state follow Chromium: the current path stays
 * where it was drawn when the transform changes, invalid values are ignored, and canvases drawn
 * onto canvases are clipped to their bounds.
 */
export class Context2DShim {
  private state: State = fresh();
  private stack: State[] = [];
  private path: Path2DShim;

  constructor(readonly canvas: CanvasElementShim) {
    this.path = new Path2DShim(canvas.skia);
  }

  private get skia(): SkiaApi {
    return this.canvas.skia;
  }

  resetState(): void {
    this.state = fresh();
    this.stack = [];
    this.path = new Path2DShim(this.skia);
  }

  // ---- state

  save(): void {
    this.stack.push({ ...this.state });
  }

  restore(): void {
    const s = this.stack.pop();
    if (s) this.setMatrix(s.m, s);
  }

  /** Changes the transform; the current path keeps its place on the canvas. */
  private setMatrix(m: Mat, next: State = this.state): void {
    const old = this.state.m;
    this.state = next;
    if (!this.path.isEmpty && !isIdentity(multiply(invert(m) ?? IDENTITY, old))) {
      const inv = invert(m);
      if (inv) this.path.transformBy(multiply(inv, old));
    }
    this.state.m = m;
  }

  translate(x: number, y: number): void {
    if (Number.isFinite(x) && Number.isFinite(y))
      this.setMatrix(multiply(this.state.m, translation(x, y)));
  }
  scale(x: number, y: number): void {
    if (Number.isFinite(x) && Number.isFinite(y))
      this.setMatrix(multiply(this.state.m, scaling(x, y)));
  }
  rotate(a: number): void {
    if (Number.isFinite(a)) this.setMatrix(multiply(this.state.m, rotation(a)));
  }
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.setMatrix(multiply(this.state.m, [a, b, c, d, e, f]));
  }
  setTransform(
    a: number | { a: number; b: number; c: number; d: number; e: number; f: number } = 1,
    b = 0,
    c = 0,
    d = 1,
    e = 0,
    f = 0,
  ): void {
    const m: Mat = typeof a === 'number' ? [a, b, c, d, e, f] : [a.a, a.b, a.c, a.d, a.e, a.f];
    if (m.every(Number.isFinite)) this.setMatrix(m);
  }
  resetTransform(): void {
    this.setMatrix(IDENTITY);
  }
  getTransform(): DOMMatrixShim {
    return new DOMMatrixShim(this.state.m);
  }

  set fillStyle(v: string | CanvasGradientShim) {
    const s = this.style(v);
    if (s) this.state.fill = s;
  }
  get fillStyle(): string | CanvasGradientShim {
    return cssStyle(this.state.fill);
  }
  set strokeStyle(v: string | CanvasGradientShim) {
    const s = this.style(v);
    if (s) this.state.stroke = s;
  }
  get strokeStyle(): string | CanvasGradientShim {
    return cssStyle(this.state.stroke);
  }
  private style(v: string | CanvasGradientShim): Style | null {
    return v instanceof CanvasGradientShim ? v : parseColor(String(v));
  }

  set lineWidth(v: number) {
    if (Number.isFinite(v) && v > 0) this.state.lineWidth = v;
  }
  get lineWidth(): number {
    return this.state.lineWidth;
  }
  set lineCap(v: string) {
    if (v in CAP) this.state.lineCap = v;
  }
  get lineCap(): string {
    return this.state.lineCap;
  }
  set lineJoin(v: string) {
    if (v in JOIN) this.state.lineJoin = v;
  }
  get lineJoin(): string {
    return this.state.lineJoin;
  }
  set miterLimit(v: number) {
    if (Number.isFinite(v) && v > 0) this.state.miterLimit = v;
  }
  get miterLimit(): number {
    return this.state.miterLimit;
  }
  setLineDash(segments: readonly number[]): void {
    if (!segments.every((n) => Number.isFinite(n) && n >= 0)) return;
    this.state.dash = segments.length % 2 ? [...segments, ...segments] : [...segments];
  }
  getLineDash(): number[] {
    return [...this.state.dash];
  }
  set lineDashOffset(v: number) {
    if (Number.isFinite(v)) this.state.dashOffset = v;
  }
  get lineDashOffset(): number {
    return this.state.dashOffset;
  }
  set globalAlpha(v: number) {
    if (Number.isFinite(v) && v >= 0 && v <= 1) this.state.alpha = v;
  }
  get globalAlpha(): number {
    return this.state.alpha;
  }
  set globalCompositeOperation(v: string) {
    if (v in COMPOSITE) this.state.composite = v;
  }
  get globalCompositeOperation(): string {
    return this.state.composite;
  }
  set font(v: string) {
    this.state.font = v;
  }
  get font(): string {
    return this.state.font;
  }
  set textAlign(v: string) {
    if (['start', 'end', 'left', 'right', 'center'].includes(v)) this.state.textAlign = v;
  }
  get textAlign(): string {
    return this.state.textAlign;
  }
  set textBaseline(v: string) {
    this.state.textBaseline = v;
  }
  get textBaseline(): string {
    return this.state.textBaseline;
  }
  set imageSmoothingEnabled(_v: boolean) {}
  get imageSmoothingEnabled(): boolean {
    return true;
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    return new CanvasGradientShim({ kind: 'radial', x0, y0, r0, x1, y1, r1 });
  }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    return new CanvasGradientShim({ kind: 'linear', x0, y0, x1, y1 });
  }

  // ---- the current path

  beginPath(): void {
    this.path = new Path2DShim(this.skia);
  }
  moveTo(x: number, y: number): void {
    this.path.moveTo(x, y);
  }
  lineTo(x: number, y: number): void {
    this.path.lineTo(x, y);
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.path.quadraticCurveTo(cx, cy, x, y);
  }
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number): void {
    this.path.bezierCurveTo(a, b, c, d, x, y);
  }
  closePath(): void {
    this.path.closePath();
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.path.rect(x, y, w, h);
  }
  roundRect(x: number, y: number, w: number, h: number, r?: number | readonly number[]): void {
    this.path.roundRect(x, y, w, h, r);
  }
  arc(x: number, y: number, r: number, s: number, e: number, ccw?: boolean): void {
    this.path.arc(x, y, r, s, e, ccw);
  }
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rot: number,
    s: number,
    e: number,
    ccw?: boolean,
  ) {
    this.path.ellipse(x, y, rx, ry, rot, s, e, ccw);
  }

  // ---- drawing

  private paint(style: 'fill' | 'stroke', blend?: number): PaintSpec {
    const s = this.state;
    const src = style === 'fill' ? s.fill : s.stroke;
    const source: Source =
      src instanceof CanvasGradientShim ? src.source() : { kind: 'color', color: src };
    const b = blend ?? COMPOSITE[s.composite] ?? BlendMode.SrcOver;
    const stroke = style === 'stroke';
    const spec = {
      style: stroke ? PaintStyle.Stroke : PaintStyle.Fill,
      source,
      alpha: s.alpha,
      blend: b,
      width: s.lineWidth,
      cap: CAP[s.lineCap] ?? 0,
      join: JOIN[s.lineJoin] ?? 0,
      miter: s.miterLimit,
      dash: s.dash.some((n) => n > 0) ? s.dash : [],
      dashOffset: s.dashOffset,
    };
    const key = stroke
      ? `S${styleKey(src)};${s.alpha};${b};${spec.width};${spec.cap};${spec.join};${spec.miter};${spec.dash.join(',')};${spec.dashOffset}`
      : `F${styleKey(src)};${s.alpha};${b}`;
    return { ...spec, key };
  }

  private emit(op: Op): void {
    this.canvas.push(op);
  }

  private drawPath(
    path: Path2DShim,
    evenOdd: boolean,
    style: 'fill' | 'stroke',
    blend?: number,
  ): void {
    if (path.isEmpty || !invert(this.state.m)) return;
    const paint = this.paint(style, blend);
    const sk = path.pathFor(evenOdd && style === 'fill');
    const body = `path|${path.key}|${evenOdd ? 1 : 0}|${paint.key}`;
    const { m, clips } = this.state;
    this.emit({ kind: 'path', path: sk, paint, m, clips, body, key: opKey(body, m, clips) });
  }

  private resolve(a?: Path2DShim | string, b?: string): [Path2DShim, boolean] {
    if (a instanceof Path2DShim) return [a, b === 'evenodd'];
    return [this.path, a === 'evenodd'];
  }

  fill(a?: Path2DShim | string, b?: string): void {
    const [p, eo] = this.resolve(a, b);
    this.drawPath(p, eo, 'fill');
  }

  stroke(p?: Path2DShim): void {
    this.drawPath(p ?? this.path, false, 'stroke');
  }

  clip(a?: Path2DShim | string, b?: string): void {
    const [p, eo] = this.resolve(a, b);
    const m = this.state.m;
    const clip: Clip = {
      path: transformPath(this.skia, p.pathFor(eo), m),
      key: `${p.key}/${eo ? 1 : 0}@${matKey(m)}`,
    };
    this.state.clips = [...this.state.clips, clip];
  }

  private rectPath(x: number, y: number, w: number, h: number): Path2DShim | null {
    if (![x, y, w, h].every(Number.isFinite) || !w || !h) return null;
    const p = new Path2DShim(this.skia);
    p.rect(Math.min(x, x + w), Math.min(y, y + h), Math.abs(w), Math.abs(h));
    return p;
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    const p = this.rectPath(x, y, w, h);
    if (p) this.drawPath(p, false, 'fill');
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    const p = this.rectPath(x, y, w, h);
    if (p) this.drawPath(p, false, 'stroke');
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    const { m, clips } = this.state;
    const c = this.canvas;
    // Clearing the whole canvas drops what it holds.
    const corners = [
      [x, y],
      [x + w, y + h],
    ].map(([px = 0, py = 0]) => [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]]);
    const [[x0 = 0, y0 = 0] = [], [x1 = 0, y1 = 0] = []] = corners;
    if (
      !clips.length &&
      m[1] === 0 &&
      m[2] === 0 &&
      Math.min(x0, x1) <= 0 &&
      Math.min(y0, y1) <= 0 &&
      Math.max(x0, x1) >= c.width &&
      Math.max(y0, y1) >= c.height
    ) {
      c.clear();
      return;
    }
    const p = this.rectPath(x, y, w, h);
    if (!p) return;
    const saved = { fill: this.state.fill, alpha: this.state.alpha };
    this.state.fill = BLACK;
    this.state.alpha = 1;
    this.drawPath(p, false, 'fill', BlendMode.Clear);
    Object.assign(this.state, saved);
  }

  fillText(text: string, x: number, y: number): void {
    if (!invert(this.state.m)) return;
    const s = this.state;
    const paint = this.paint('fill');
    const t = String(text).replace(/[\t\n\f\r]/g, ' ');
    const body = `text|${t}|${x},${y}|${s.font}|${s.textAlign}|${s.textBaseline}|${paint.key}`;
    this.emit({
      kind: 'text',
      text: t,
      x,
      y,
      font: s.font,
      align: s.textAlign,
      baseline: s.textBaseline,
      paint,
      m: s.m,
      clips: s.clips,
      body,
      key: opKey(body, s.m, s.clips),
    });
  }

  /** `drawImage(canvas, dx, dy)`: another canvas, as it is now, with its top-left at (dx, dy). */
  drawImage(image: CanvasElementShim, dx: number, dy: number, ...rest: number[]): void {
    if (rest.length)
      throw new Error('@yapling/art: drawImage with a source or size is not supported');
    if (!(image instanceof CanvasElementShim))
      throw new Error('@yapling/art: drawImage needs a canvas');
    if (!image.ops.length || !image.width || !image.height) return;
    const s = this.state;
    const m = multiply(s.m, translation(dx, dy));
    const blend = COMPOSITE[s.composite] ?? BlendMode.SrcOver;
    const source = image.ops;
    if (
      this.canvas.mode === 'vector' &&
      s.alpha === 1 &&
      blend === BlendMode.SrcOver &&
      composesInline(source)
    ) {
      for (const op of placeOps(this.skia, source, m, s.clips, image.width, image.height)) {
        this.emit(op);
      }
      return;
    }
    const last = source[source.length - 1];
    const mask =
      last?.kind === 'path' &&
      last.paint.blend === BlendMode.SrcIn &&
      last.paint.source.kind === 'color';
    // A silhouette is known by its colour alone: what it was cut from only sets its shape.
    const inner =
      mask && last.kind === 'path' ? `mask:${last.paint.key}` : source.map((o) => o.key).join('\n');
    const kind = this.canvas.mode === 'raster' ? 'image' : 'layer';
    const body = `${kind}|${image.width}x${image.height}|${s.alpha}|${blend}|${inner}`;
    this.emit({
      kind,
      width: image.width,
      height: image.height,
      ops: source,
      alpha: s.alpha,
      blend,
      mask,
      m,
      clips: s.clips,
      body,
      key: opKey(body, m, s.clips),
    });
  }
}
