import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { SkImage } from '@shopify/react-native-skia';

import { CanvasElementShim } from '../canvas/context';
import { Player, type Op } from '../canvas/ops';
import { ParagraphText, type FontFamilies } from '../canvas/text';
import { loadPrototype, type Prototype } from '../runtime/prototype';
import { AlphaType, ColorType, ImageFormat, type SkiaApi } from '../skia/api';
import { ArtRenderer, type ArtRendererOptions } from '../skia/renderer';
import { extractFace } from './fonts';
import { loadNodeSkia } from './skia';

export { loadNodeSkia, requireFromSkia, SKIA_TYPES_PATH, SKIA_WEB_PATH } from './skia';

export const REPO_ROOT = join(import.meta.dirname, '../../../..');
/** The embedded Lexend cuts (`tools/fonts`). */
export const LEXEND_DIR = join(REPO_ROOT, 'tools/fonts/files');
const LEXEND = ['Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black'];
/**
 * `sans-serif` on this Mac: the prototype's Chrome draws the critters' `?` and `z` (`ui-rounded,
 * Nunito, sans-serif` — the first two are not available to its canvas) in Helvetica Bold. It is not
 * ours to ship; Node uses it only to compare with the renders.
 */
export const SANS_SERIF = '/System/Library/Fonts/Helvetica.ttc';

/** Lexend from `tools/fonts`, and Helvetica for `sans-serif` when this machine has it. */
export function nodeFonts(skia: SkiaApi): FontFamilies {
  const provider = skia.TypefaceFontProvider.Make();
  const add = (bytes: Uint8Array, family: string) => {
    const face = skia.Typeface.MakeFreeTypeFaceFromData(skia.Data.fromBytes(bytes));
    if (!face) throw new Error(`@yapling/art: could not read a ${family} face`);
    provider.registerFont(face, family);
  };
  for (const cut of LEXEND) {
    add(new Uint8Array(readFileSync(join(LEXEND_DIR, `Lexend-${cut}.ttf`))), 'Lexend');
  }
  const families: FontFamilies['families'] = { Lexend: { family: 'Lexend' } };
  if (existsSync(SANS_SERIF)) {
    add(extractFace(SANS_SERIF, 700), 'Helvetica');
    families['sans-serif'] = { family: 'Helvetica' };
  }
  return { provider, families, fallback: 'Lexend' };
}

/** The prototype's generators on CanvasKit, with the fonts and a player for what they record. */
export interface NodeArt {
  skia: SkiaApi;
  /** The generators recording as the app does: canvases on canvases replayed as vectors. */
  proto: Prototype;
  /** The generators recording as the browser draws: canvases on canvases as their own pixels. */
  raster: Prototype;
  player: Player;
}

/** The app's renderer (pictures and their cache) on CanvasKit, with Node's fonts. */
export async function createNodeRenderer(options: ArtRendererOptions = {}): Promise<ArtRenderer> {
  const skia = await loadNodeSkia();
  return new ArtRenderer(skia, { fonts: nodeFonts(skia), ...options });
}

export async function createNodeArt(): Promise<NodeArt> {
  const skia = await loadNodeSkia();
  return {
    skia,
    proto: loadPrototype(skia),
    raster: loadPrototype(skia, {}, 'raster'),
    player: new Player(skia, new ParagraphText(skia, nodeFonts(skia))),
  };
}

/** One generator call, as the render tool's manifest records it. */
export interface DrawSpec {
  fn: string;
  w: number;
  h: number;
  o: object;
  canvas: { width: number; height: number };
  transform: readonly [number, number, number, number, number, number];
}

/** What a generator call records: a canvas of the given size, the transform, then the call. */
export function recordSpec(proto: Prototype, skia: SkiaApi, spec: DrawSpec): readonly Op[] {
  const el = new CanvasElementShim(skia, spec.canvas.width, spec.canvas.height, proto.mode);
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('no context');
  ctx.setTransform(...spec.transform);
  proto.generator(spec.fn)(ctx, spec.w, spec.h, spec.o);
  return el.ops;
}

/** Draws on a transparent raster surface of `width` × `height` and returns the image. */
export function rasterize(
  skia: SkiaApi,
  width: number,
  height: number,
  draw: (
    canvas: ReturnType<NonNullable<ReturnType<SkiaApi['Surface']['Make']>>['getCanvas']>,
  ) => void,
): SkImage {
  const surface = skia.Surface.Make(width, height);
  if (!surface) throw new Error('@yapling/art: could not make a raster surface');
  const canvas = surface.getCanvas();
  canvas.clear(Float32Array.of(0, 0, 0, 0));
  draw(canvas);
  surface.flush();
  const image = surface.makeImageSnapshot();
  surface.dispose();
  return image;
}

/** A manifest state drawn directly from what its generator call records. */
export function renderSpec(art: NodeArt, spec: DrawSpec, proto = art.proto): SkImage {
  const ops = recordSpec(proto, art.skia, spec);
  return rasterize(art.skia, spec.canvas.width, spec.canvas.height, (c) => art.player.play(c, ops));
}

/** RGBA pixels, row by row, premultiplied unless asked otherwise. */
export function readPixels(image: SkImage, premul = true): Uint8Array {
  const px = image.readPixels(0, 0, {
    width: image.width(),
    height: image.height(),
    colorType: ColorType.RGBA_8888 as never,
    alphaType: (premul ? AlphaType.Premul : AlphaType.Unpremul) as never,
  });
  if (!(px instanceof Uint8Array)) throw new Error('@yapling/art: could not read the pixels');
  return px;
}

export function encodePng(image: SkImage): Uint8Array {
  return image.encodeToBytes(ImageFormat.PNG, 100);
}

export function decodePng(skia: SkiaApi, bytes: Uint8Array): SkImage {
  const image = skia.Image.MakeImageFromEncoded(skia.Data.fromBytes(bytes));
  if (!image) throw new Error('@yapling/art: could not decode the PNG');
  return image;
}
