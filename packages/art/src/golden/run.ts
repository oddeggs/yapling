import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { SkImage } from '@shopify/react-native-skia';

import { recordArt } from '../art';
import {
  createNodeRenderer,
  decodePng,
  encodePng,
  loadNodeSkia,
  rasterize,
  readPixels,
} from '../node';
import { loadPrototype, type Prototype } from '../runtime/prototype';
import { AlphaType, ColorType } from '../skia/api';
import type { ArtRenderer } from '../skia/renderer';
import { diff, diffImage, type Diff } from './compare';
import { RENDERS_DIR, stateId, type ArtState } from './states';

export const PACKAGE_DIR = join(import.meta.dirname, '../..');
/** Failing states leave their render and a diff picture here (ignored by git). */
export const OUT_DIR = join(PACKAGE_DIR, 'golden/out');

/** Whether this checkout has the reference renders (CI does not: they are not committed). */
export function rendersPresent(states: readonly ArtState[]): boolean {
  return states.length > 0 && states.every((s) => existsSync(join(RENDERS_DIR, s.file)));
}

export const SKIP_MESSAGE =
  'art goldens skipped: no reference renders in design/renders/art. Build them with ' +
  '`node tools/design/src/render.ts --only art` (about a minute) to run the goldens.';

export interface Golden {
  renderer: ArtRenderer;
  /** The generators drawing canvases onto canvases as pixels, as the browser does (faces). */
  raster: Prototype;
}

let golden: Promise<Golden> | null = null;

export function goldenArt(): Promise<Golden> {
  golden ??= (async () => {
    const renderer = await createNodeRenderer();
    return { renderer, raster: loadPrototype(await loadNodeSkia(), {}, 'raster') };
  })();
  return golden;
}

/**
 * Draws a manifest state the way the app does: a critter from its cached part pictures (outline,
 * body, eyes, mouth), a scene or object from its cached picture, each recorded in points and drawn
 * at the render's scale. A face is drawn as the browser composites it (its canvas at a fractional
 * pixel, smoothed); the app draws faces sharp.
 */
export function renderState({ renderer, raster }: Golden, s: ArtState): SkImage {
  const { skia } = renderer;
  const [a, , , d, e, f] = s.transform;
  const place = (draw: (c: Parameters<typeof renderer.drawCritter>[0]) => void) =>
    rasterize(skia, s.canvas.width, s.canvas.height, (c) => {
      c.translate(e, f);
      c.scale(a, d);
      draw(c);
    });
  if (s.kind === 'critter' && s.species && s.mood) {
    const pics = renderer.critter({ species: s.species, mood: s.mood, size: s.w });
    return place((c) => renderer.drawCritter(c, pics, s.mouth ?? 'rest'));
  }
  if (s.kind === 'face') {
    const ops = recordArt(raster, skia, s, s.transform, s.canvas);
    return rasterize(skia, s.canvas.width, s.canvas.height, (c) => renderer.player.play(c, ops));
  }
  const pic = renderer.art({ fn: s.fn, w: s.w, h: s.h, o: s.o });
  return place((c) => c.drawPicture(pic.picture));
}

export interface GoldenResult extends Diff {
  state: ArtState;
}

function reference(renderer: ArtRenderer, s: ArtState): SkImage {
  return decodePng(renderer.skia, new Uint8Array(readFileSync(join(RENDERS_DIR, s.file))));
}

/** Draws the state and compares it with its reference render. */
export function compareState(g: Golden, s: ArtState): GoldenResult {
  const ref = reference(g.renderer, s);
  const img = renderState(g, s);
  try {
    if (img.width() !== ref.width() || img.height() !== ref.height()) {
      throw new Error(
        `${stateId(s)}: drew ${img.width()}×${img.height()}, reference ${ref.width()}×${ref.height()}`,
      );
    }
    return { state: s, ...diff(readPixels(ref), readPixels(img), ref.width(), ref.height()) };
  } finally {
    img.dispose();
    ref.dispose();
  }
}

/** Writes the state's render and a diff picture to `golden/out` for a look. */
export function writeFailure(g: Golden, s: ArtState): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const { skia } = g.renderer;
  const img = renderState(g, s);
  const ref = reference(g.renderer, s);
  writeFileSync(join(OUT_DIR, `${stateId(s)}.png`), encodePng(img));
  const d = diffImage(readPixels(ref), readPixels(img));
  const pic = skia.Image.MakeImage(
    {
      width: ref.width(),
      height: ref.height(),
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    },
    skia.Data.fromBytes(d),
    ref.width() * 4,
  );
  if (pic) writeFileSync(join(OUT_DIR, `${stateId(s)}.diff.png`), encodePng(pic));
  img.dispose();
  ref.dispose();
}
