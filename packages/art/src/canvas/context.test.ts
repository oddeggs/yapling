import { beforeAll, describe, expect, it } from 'vitest';

import { loadNodeSkia, requireFromSkia, SKIA_TYPES_PATH } from '../node/skia';
import {
  AlphaType,
  BlendMode,
  ClipOp,
  ColorType,
  FillType,
  FilterMode,
  ImageFormat,
  MipmapMode,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkiaApi,
} from '../skia/api';
import { parseColor } from './color';
import { CanvasElementShim, type Context2DShim } from './context';
import type { Op, PathOp } from './ops';

let skia: SkiaApi;
beforeAll(async () => {
  skia = await loadNodeSkia();
});

function canvas(mode: 'vector' | 'raster' = 'vector'): [CanvasElementShim, Context2DShim] {
  const el = new CanvasElementShim(skia, 100, 100, mode);
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('no context');
  return [el, ctx];
}

const only = (ops: readonly Op[]): PathOp => {
  expect(ops).toHaveLength(1);
  const op = ops[0];
  if (op?.kind !== 'path') throw new Error('not a path');
  return op;
};

describe('the Skia enums', () => {
  it("are React Native Skia's", () => {
    const t = requireFromSkia<Record<string, Record<string, number>>>(SKIA_TYPES_PATH);
    const pick = (name: string, mine: Record<string, number>) =>
      expect(Object.fromEntries(Object.keys(mine).map((k) => [k, t[name]?.[k]]))).toEqual(mine);
    pick('PaintStyle', PaintStyle);
    pick('StrokeCap', StrokeCap);
    pick('StrokeJoin', StrokeJoin);
    pick('ClipOp', ClipOp);
    pick('FillType', FillType);
    pick('TileMode', TileMode);
    pick('FilterMode', FilterMode);
    pick('MipmapMode', MipmapMode);
    pick('BlendMode', BlendMode);
    pick('ColorType', ColorType);
    pick('AlphaType', AlphaType);
    pick('ImageFormat', ImageFormat);
  });
});

describe('the Canvas 2D stand-in', () => {
  it('parses the colours the generators write, at 8 bits a channel', () => {
    expect(parseColor('#fff')).toEqual([1, 1, 1, 1]);
    expect(parseColor('#17131C')).toEqual([0x17 / 255, 0x13 / 255, 0x1c / 255, 1]);
    expect(parseColor('rgba(43,35,32,.13)')).toEqual([43 / 255, 35 / 255, 32 / 255, 33 / 255]);
    expect(parseColor('rgba(34,191,242,0.30)')?.[3]).toBe(77 / 255);
    expect(parseColor('nope')).toBeNull();
  });

  it('closes an arc past a full turn into a circle, as Chromium does', () => {
    const [el, ctx] = canvas();
    ctx.beginPath();
    ctx.arc(50, 50, 10, 0, 7);
    ctx.fill();
    const b = only(el.ops).path.getBounds();
    expect([b.x, b.y, b.width, b.height].map((v) => Math.round(v * 1000) / 1000)).toEqual([
      40, 40, 20, 20,
    ]);
  });

  it('ignores a zero line width and a global alpha out of range', () => {
    const [, ctx] = canvas();
    ctx.lineWidth = 4;
    ctx.lineWidth = 0;
    ctx.globalAlpha = 0.5;
    ctx.globalAlpha = 2;
    expect(ctx.lineWidth).toBe(4);
    expect(ctx.globalAlpha).toBe(0.5);
  });

  it('keeps the current path where it was drawn when the transform changes', () => {
    const [el, ctx] = canvas();
    ctx.beginPath();
    ctx.rect(10, 10, 10, 10);
    ctx.translate(30, 0);
    ctx.scale(2, 2);
    ctx.fill();
    const op = only(el.ops);
    const b = op.path.getBounds();
    // In the new user space the square sits at (-15, 5); the transform maps it back to (10, 10).
    expect([b.x, b.y, b.width, b.height]).toEqual([-10, 5, 5, 5]);
    expect(op.m).toEqual([2, 0, 0, 2, 30, 0]);
  });

  it('draws a source-over canvas in place, clipped to its bounds', () => {
    const [src, sctx] = canvas();
    sctx.fillRect(0, 0, 10, 10);
    const [el, ctx] = canvas();
    ctx.translate(5, 5);
    ctx.drawImage(src, 20, 0);
    const op = only(el.ops);
    expect(op.m).toEqual([1, 0, 0, 1, 25, 5]);
    expect(op.clips).toHaveLength(1);
  });

  it('draws a source-in canvas as a silhouette known by its colour, not its shapes', () => {
    const silhouette = (size: number) => {
      const [src, s] = canvas();
      s.fillRect(0, 0, size, size);
      s.globalCompositeOperation = 'source-in';
      s.fillStyle = '#17131C';
      s.fillRect(0, 0, 100, 100);
      const [el, ctx] = canvas();
      ctx.drawImage(src, 0.5, 1);
      return el.ops;
    };
    const [a] = silhouette(10);
    const [b] = silhouette(20);
    expect(a?.kind).toBe('layer');
    expect(a?.kind === 'layer' && a.mask).toBe(true);
    expect(a?.key).toBe(b?.key);
  });

  it("draws a canvas as its own pixels in the browser's way when asked", () => {
    const [src, s] = canvas('raster');
    s.fillRect(0, 0, 10, 10);
    const [el, ctx] = canvas('raster');
    ctx.drawImage(src, 0, 0);
    expect(el.ops.map((o) => o.kind)).toEqual(['image']);
  });

  it('forgets what a canvas held when it is cleared or resized', () => {
    const [el, ctx] = canvas();
    ctx.fillRect(0, 0, 10, 10);
    ctx.clearRect(0, 0, 100, 100);
    expect(el.ops).toHaveLength(0);
    ctx.fillRect(0, 0, 10, 10);
    ctx.fillStyle = '#f00';
    el.width = 50;
    expect(el.ops).toHaveLength(0);
    ctx.fillRect(0, 0, 10, 10);
    const op = only(el.ops);
    expect(op.paint.source).toEqual({ kind: 'color', color: [0, 0, 0, 1] });
  });
});
