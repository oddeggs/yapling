import type {
  SkCanvas,
  SkImage,
  SkPaint,
  SkPath,
  SkPicture,
  SkShader,
} from '@shopify/react-native-skia';

import {
  BlendMode,
  ClipOp,
  type FillType,
  FilterMode,
  MipmapMode,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkiaApi,
} from '../skia/api';
import type { Rgba } from './color';
import { multiply, toSk, type Mat } from './matrix';

/**
 * A recorded Canvas 2D drawing: a flat list of self-contained operations, each with its own
 * transform and clips. Any run of them can be replayed on its own, so a drawing can be cut into
 * layers (a critter's body, its eyes, its mouth) and each recorded into its own picture.
 */

export type FillRule = (typeof FillType)[keyof typeof FillType];

/** A clip, already in the drawing's own coordinates. */
export interface Clip {
  readonly path: SkPath;
  readonly key: string;
}

export interface GradientStop {
  readonly offset: number;
  readonly color: Rgba;
}

export type Source =
  | { readonly kind: 'color'; readonly color: Rgba }
  | {
      readonly kind: 'radial';
      readonly x0: number;
      readonly y0: number;
      readonly r0: number;
      readonly x1: number;
      readonly y1: number;
      readonly r1: number;
      readonly stops: readonly GradientStop[];
    }
  | {
      readonly kind: 'linear';
      readonly x0: number;
      readonly y0: number;
      readonly x1: number;
      readonly y1: number;
      readonly stops: readonly GradientStop[];
    };

export interface PaintSpec {
  readonly style: (typeof PaintStyle)[keyof typeof PaintStyle];
  readonly source: Source;
  /** `globalAlpha`. */
  readonly alpha: number;
  readonly blend: number;
  readonly width: number;
  readonly cap: number;
  readonly join: number;
  readonly miter: number;
  readonly dash: readonly number[];
  readonly dashOffset: number;
  readonly key: string;
}

interface Placed {
  /** The user-space transform. */
  readonly m: Mat;
  readonly clips: readonly Clip[];
  /** What is drawn, wherever it is placed. */
  readonly body: string;
  /** Equal for operations that draw the same pixels: the body, transform and clips. */
  readonly key: string;
}

export interface PathOp extends Placed {
  readonly kind: 'path';
  readonly path: SkPath;
  readonly paint: PaintSpec;
}

export interface TextOp extends Placed {
  readonly kind: 'text';
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly font: string;
  readonly align: string;
  readonly baseline: string;
  readonly paint: PaintSpec;
}

/**
 * Another canvas drawn in isolation: as a layer (`layer`, when it composites with something other
 * than source-over), or as its own pixels (`image`, the browser's way).
 */
export interface LayerOp extends Placed {
  readonly kind: 'layer' | 'image';
  readonly width: number;
  readonly height: number;
  readonly ops: readonly Op[];
  readonly alpha: number;
  readonly blend: number;
  /** A silhouette: the canvas ends by filling everything with one colour, `source-in`. */
  readonly mask: boolean;
}

export type Op = PathOp | TextOp | LayerOp;

export const matKey = (m: Mat) => m.join(',');
export const clipsKey = (clips: readonly Clip[]) => clips.map((c) => c.key).join('&');
export const opKey = (body: string, m: Mat, clips: readonly Clip[]) =>
  `${body}|${matKey(m)}|${clipsKey(clips)}`;

/** A copy of `path` mapped by `m`. */
export function transformPath(skia: SkiaApi, path: SkPath, m: Mat): SkPath {
  return skia.PathBuilder.MakeFromPath(path).transform(toSk(m)).build();
}

/** Whether drawing `ops` straight onto another canvas gives what drawing them in isolation would. */
export function composesInline(ops: readonly Op[]): boolean {
  return ops.every((op) =>
    op.kind === 'path' || op.kind === 'text'
      ? op.paint.blend === BlendMode.SrcOver
      : op.blend === BlendMode.SrcOver,
  );
}

const paintKey = (spec: PaintSpec, tint?: Rgba) =>
  tint ? `${spec.key}#${tint.join(',')}` : spec.key;

/** The colour of a silhouette layer (a canvas that ends by filling one colour `source-in`). */
export function silhouetteOf(op: LayerOp): Rgba | null {
  const last = op.ops[op.ops.length - 1];
  if (!op.mask || last?.kind !== 'path' || last.paint.source.kind !== 'color') return null;
  if (last.paint.alpha !== 1 || last.paint.source.color[3] !== 1) return null;
  return op.ops.slice(0, -1).every((o) => o.kind !== 'path' || o.paint.blend === BlendMode.SrcOver)
    ? last.paint.source.color
    : null;
}

/** Text drawing, supplied by the renderer (it owns the fonts). */
export interface TextDrawer {
  /** `paintKey` names `paint` (the op's own, or tinted). */
  draw(canvas: SkCanvas, op: TextOp, paint: SkPaint, paintKey: string): void;
}

/** Recording bounds for pictures: generous, so nothing the art draws is culled. */
export const PICTURE_BOUNDS = { x: -4096, y: -4096, width: 8192, height: 8192 };

const BOUNDS_KEY = (w: number, h: number) => `B${w}x${h}`;

/**
 * Moves operations recorded on one canvas onto another: `m` is where the source canvas's origin
 * lands, `clips` the destination's clips, and the source's own bounds clip what it drew.
 */
export function placeOps(
  skia: SkiaApi,
  ops: readonly Op[],
  m: Mat,
  clips: readonly Clip[],
  width: number,
  height: number,
): Op[] {
  const bounds: Clip = {
    path: transformPath(skia, skia.Path.Rect({ x: 0, y: 0, width, height }), m),
    key: `${BOUNDS_KEY(width, height)}@${matKey(m)}`,
  };
  const mk = matKey(m);
  const moved = new Map<Clip, Clip>();
  const move = (c: Clip): Clip => {
    let out = moved.get(c);
    if (!out) {
      out = { path: transformPath(skia, c.path, m), key: `${c.key}@${mk}` };
      moved.set(c, out);
    }
    return out;
  };
  return ops.map((op) => {
    const nm = multiply(m, op.m);
    const nc = [...clips, bounds, ...op.clips.map(move)];
    return { ...op, m: nm, clips: nc, key: opKey(op.body, nm, nc) };
  });
}

/** Replays recorded operations onto a Skia canvas, making each paint once. */
export class Player {
  private readonly paints = new Map<string, SkPaint>();
  private readonly shaders = new Map<string, SkShader>();
  private readonly rasters = new WeakMap<readonly Op[], SkImage>();
  private readonly pictures = new WeakMap<readonly Op[], Map<string, SkPicture>>();

  constructor(
    readonly skia: SkiaApi,
    readonly text: TextDrawer | null,
  ) {}

  /**
   * Replays `ops[from, to)`. With `tint`, every paint draws that colour at its own alpha instead
   * (a silhouette: what a canvas filled `source-in` with one colour shows).
   */
  play(canvas: SkCanvas, ops: readonly Op[], from = 0, to = ops.length, tint?: Rgba): void {
    for (let i = from; i < to; i++) {
      const op = ops[i];
      if (op) this.playOp(canvas, op, tint);
    }
  }

  private playOp(canvas: SkCanvas, op: Op, tint: Rgba | undefined): void {
    canvas.save();
    for (const c of op.clips) canvas.clipPath(c.path, ClipOp.Intersect, true);
    canvas.concat(toSk(op.m));
    if (op.kind === 'path') {
      canvas.drawPath(op.path, this.paint(op.paint, tint));
    } else if (op.kind === 'text') {
      this.text?.draw(canvas, op, this.paint(op.paint, tint), paintKey(op.paint, tint));
    } else if (op.kind === 'image') {
      const p = this.skia.Paint();
      p.setAlphaf(op.alpha);
      p.setBlendMode(op.blend);
      if (tint)
        p.setColorFilter(
          this.skia.ColorFilter.MakeBlend(Float32Array.of(...tint), BlendMode.SrcIn),
        );
      canvas.drawImageOptions(this.raster(op), 0, 0, FilterMode.Linear, MipmapMode.None, p);
    } else {
      canvas.clipRect({ x: 0, y: 0, width: op.width, height: op.height }, ClipOp.Intersect, true);
      const silhouette = silhouetteOf(op);
      if (silhouette && op.alpha === 1 && op.blend === BlendMode.SrcOver) {
        // The same pixels as the layer, without one: each shape in the silhouette colour, at its
        // own alpha, composites to the colour at the shapes' combined alpha.
        canvas.drawPicture(this.picture(op.ops, 0, op.ops.length - 1, tint ?? silhouette));
      } else {
        const p = this.skia.Paint();
        p.setAlphaf(op.alpha);
        p.setBlendMode(op.blend);
        canvas.saveLayer(p);
        canvas.drawPicture(this.picture(op.ops, 0, op.ops.length, tint));
        canvas.restore();
      }
    }
    canvas.restore();
  }

  /** Operations recorded once into a picture (a canvas drawn many times is replayed as one). */
  picture(ops: readonly Op[], from = 0, to = ops.length, tint?: Rgba): SkPicture {
    let byRange = this.pictures.get(ops);
    if (!byRange) {
      byRange = new Map();
      this.pictures.set(ops, byRange);
    }
    const key = `${from}:${to}:${tint?.join(',') ?? ''}`;
    const hit = byRange.get(key);
    if (hit) return hit;
    const recorder = this.skia.PictureRecorder();
    this.play(recorder.beginRecording(PICTURE_BOUNDS), ops, from, to, tint);
    const pic = recorder.finishRecordingAsPicture();
    byRange.set(key, pic);
    return pic;
  }

  /** A canvas's pixels, drawn once per distinct content. */
  private raster(op: LayerOp): SkImage {
    const hit = this.rasters.get(op.ops);
    if (hit) return hit;
    const surface = this.skia.Surface.Make(op.width, op.height);
    if (!surface) throw new Error('@yapling/art: could not make a raster surface');
    const c = surface.getCanvas();
    c.clear(Float32Array.of(0, 0, 0, 0));
    this.play(c, op.ops);
    surface.flush();
    const image = surface.makeImageSnapshot();
    surface.dispose?.();
    this.rasters.set(op.ops, image);
    return image;
  }

  private paint(spec: PaintSpec, tint?: Rgba): SkPaint {
    const key = paintKey(spec, tint);
    const hit = this.paints.get(key);
    if (hit) return hit;
    const p = this.skia.Paint();
    p.setAntiAlias(true);
    p.setStyle(spec.style);
    p.setBlendMode(spec.blend);
    const src = spec.source;
    if (src.kind === 'color') {
      const [r, g, b, a] = tint ? [tint[0], tint[1], tint[2], src.color[3] * tint[3]] : src.color;
      p.setColor(Float32Array.of(r, g, b, a * spec.alpha));
    } else {
      p.setColor(Float32Array.of(0, 0, 0, 1));
      p.setShader(this.shader(src));
      p.setAlphaf(spec.alpha);
    }
    if (spec.style === PaintStyle.Stroke) {
      p.setStrokeWidth(spec.width);
      p.setStrokeCap(spec.cap);
      p.setStrokeJoin(spec.join);
      p.setStrokeMiter(spec.miter);
      if (spec.dash.length)
        p.setPathEffect(this.skia.PathEffect.MakeDash([...spec.dash], spec.dashOffset));
    }
    if (tint && src.kind !== 'color') {
      p.setColorFilter(this.skia.ColorFilter.MakeBlend(Float32Array.of(...tint), BlendMode.SrcIn));
    }
    this.paints.set(key, p);
    return p;
  }

  private shader(src: Exclude<Source, { kind: 'color' }>): SkShader {
    const key = JSON.stringify(src);
    const hit = this.shaders.get(key);
    if (hit) return hit;
    const colors = src.stops.map((s) => Float32Array.of(...s.color));
    const pos = src.stops.map((s) => s.offset);
    // Canvas gradients interpolate unpremultiplied colours (flag 0), as Chrome draws them.
    const shader =
      src.kind === 'radial'
        ? this.skia.Shader.MakeTwoPointConicalGradient(
            { x: src.x0, y: src.y0 },
            src.r0,
            { x: src.x1, y: src.y1 },
            src.r1,
            colors,
            pos,
            TileMode.Clamp,
            undefined,
            0,
          )
        : this.skia.Shader.MakeLinearGradient(
            { x: src.x0, y: src.y0 },
            { x: src.x1, y: src.y1 },
            colors,
            pos,
            TileMode.Clamp,
            undefined,
            0,
          );
    this.shaders.set(key, shader);
    return shader;
  }
}

export const CAP: Record<string, number> = {
  butt: StrokeCap.Butt,
  round: StrokeCap.Round,
  square: StrokeCap.Square,
};
export const JOIN: Record<string, number> = {
  miter: StrokeJoin.Miter,
  round: StrokeJoin.Round,
  bevel: StrokeJoin.Bevel,
};
export const COMPOSITE: Record<string, number> = {
  'source-over': BlendMode.SrcOver,
  'source-in': BlendMode.SrcIn,
  'source-out': BlendMode.SrcOut,
  'source-atop': BlendMode.SrcATop,
  'destination-over': BlendMode.DstOver,
  'destination-in': BlendMode.DstIn,
  'destination-out': BlendMode.DstOut,
  'destination-atop': BlendMode.DstATop,
  lighter: BlendMode.Plus,
  copy: BlendMode.Src,
  xor: BlendMode.Xor,
  multiply: BlendMode.Multiply,
  screen: BlendMode.Screen,
  overlay: BlendMode.Overlay,
  darken: BlendMode.Darken,
  lighten: BlendMode.Lighten,
};
