import type { SkCanvas, SkImage, SkPicture } from '@shopify/react-native-skia';

import {
  objectCall,
  recordArt,
  sceneCall,
  type ArtCall,
  type BurrowObjectId,
  type SceneName,
  type SceneOptions,
} from '../art';
import { DEFAULT_CACHE_BYTES, LruCache, stableKey } from '../cache';
import { Player, PICTURE_BOUNDS, type Op } from '../canvas/ops';
import { ParagraphText, type FontFamilies } from '../canvas/text';
import { critterParts, MOUTHS, type CritterSpec, type Mouth } from '../critter';
import { critterRig } from '../rig/parts';
import { outlineBox, type Box } from '../rig/parts';
import { disposeRig, rigOps, rigPictures, type RigPictures } from '../rig/pictures';
import { loadPrototype, type Prototype } from '../runtime/prototype';
import { FilterMode, MipmapMode, type SkiaApi } from './api';

/** A generator's drawing as one picture, in its own units. */
export interface ArtPicture {
  picture: SkPicture;
  width: number;
  height: number;
}

/** A critter's parts as pictures, in points (see `CritterParts`). */
export interface CritterPictures {
  width: number;
  height: number;
  /** The shadow and ink outline: the generator's 24 silhouette copies, or their cached pixels. */
  outline: SkPicture;
  /** The outline's pixels when cached at a screen density (see `ArtRenderer.critter`). */
  outlineImage: SkImage | null;
  body: readonly [SkPicture, SkPicture, SkPicture];
  eyes: { open: SkPicture; closed: SkPicture } | null;
  mouths: Readonly<Record<Mouth, SkPicture>>;
}

export interface ArtRendererOptions {
  /** The fonts for the text some art draws (the bus sign, a confused critter's `?`). */
  fonts?: FontFamilies | null;
  /** The picture cache's memory cap. */
  cacheBytes?: number;
}

/** A picture's rough memory: per-operation overhead and its paths. */
const estimate = (ops: readonly Op[]) => 1024 + ops.length * 320;

/** Lets go of a critter's pictures at once (an evicted entry nothing draws any more). */
function disposeCritter(p: CritterPictures): void {
  const all = [
    p.outline,
    ...p.body,
    ...(p.eyes ? [p.eyes.open, p.eyes.closed] : []),
    ...Object.values(p.mouths),
  ];
  for (const x of all) x.dispose?.();
  p.outlineImage?.dispose?.();
}

const isCritter = (v: unknown): v is CritterPictures =>
  typeof v === 'object' && v !== null && 'outlineImage' in v && 'body' in v;
const isRig = (v: unknown): v is RigPictures =>
  typeof v === 'object' && v !== null && 'pivots' in v && 'bodyClip' in v;

/**
 * Draws the prototype's art as Skia pictures. Each drawing is recorded once and cached by the
 * parameters that made it: a critter per species, mood and size (its mouths and eyes as their own
 * small pictures), a scene per name and time of day, an object per id. All of it lives in one
 * cache under a memory cap, oldest first out.
 */
export class ArtRenderer {
  readonly proto: Prototype;
  readonly player: Player;
  readonly cache: LruCache<unknown>;
  /** Draws cached outline pixels (smooth sampling). */
  private readonly smooth: ReturnType<SkiaApi['Paint']>;

  constructor(
    readonly skia: SkiaApi,
    options: ArtRendererOptions = {},
  ) {
    this.proto = loadPrototype(skia);
    this.player = new Player(skia, options.fonts ? new ParagraphText(skia, options.fonts) : null);
    this.smooth = skia.Paint();
    this.smooth.setAntiAlias(true);
    // Evicting only lets go of the cache's reference; a picture still drawing stays valid and
    // Skia frees it once nothing holds it.
    this.cache = new LruCache<unknown>(options.cacheBytes ?? DEFAULT_CACHE_BYTES, (value) => {
      if (isCritter(value)) disposeCritter(value);
      else if (isRig(value)) disposeRig(value);
    });
  }

  /**
   * A picture drawn once into pixels at `pixelRatio` pixels per point, covering `box` (in the
   * picture's points); the image is the box's size times the ratio.
   */
  rasterize(picture: SkPicture, box: Box, pixelRatio: number): SkImage {
    const w = Math.ceil(box.width * pixelRatio);
    const h = Math.ceil(box.height * pixelRatio);
    const surface = this.skia.Surface.Make(w, h);
    if (!surface) throw new Error('@yapling/art: could not make a raster surface');
    const c = surface.getCanvas();
    c.clear(Float32Array.of(0, 0, 0, 0));
    c.scale(pixelRatio, pixelRatio);
    c.translate(-box.x, -box.y);
    c.drawPicture(picture);
    surface.flush();
    const image = surface.makeImageSnapshot();
    surface.dispose?.();
    return image;
  }

  /** Cache keys, for pinning what a component draws (see `LruCache.pin`). */
  static critterKey(spec: CritterSpec, pixelRatio = 0): string {
    return `critter:${spec.species}:${spec.mood}:${spec.size}:${pixelRatio}`;
  }

  static rigKey(spec: CritterSpec, pixelRatio = 0): string {
    return `rig:${spec.species}:${spec.mood}:${spec.size}:${pixelRatio}`;
  }

  /** Records operations into a picture. */
  record(ops: readonly Op[]): SkPicture {
    const recorder = this.skia.PictureRecorder();
    this.player.play(recorder.beginRecording(PICTURE_BOUNDS), ops);
    return recorder.finishRecordingAsPicture();
  }

  /**
   * A sticker critter's parts as pictures, recorded once per species, mood and size. With a
   * `pixelRatio` (the screen's pixels per point) the outline is cached as pixels at that density:
   * its 24 silhouette copies cost more to replay every frame than all of the art, and an outline
   * only moves with its critter. Drawn at that density on whole pixels, the image gives the
   * outline's own pixels.
   */
  critter(spec: CritterSpec, pixelRatio = 0): CritterPictures {
    const key = ArtRenderer.critterKey(spec, pixelRatio);
    return this.cache.getOrSet(key, () => {
      const parts = critterParts(this.proto, this.skia, spec);
      const all = [parts.outline, ...parts.body, ...MOUTHS.map((m) => parts.mouths[m])];
      const vector = this.record(parts.outline);
      let outline = vector;
      let outlineImage: SkImage | null = null;
      let pixels = 0;
      if (pixelRatio > 0) {
        const box = outlineBox(parts.width, parts.height);
        outlineImage = this.rasterize(vector, box, pixelRatio);
        pixels = outlineImage.width() * outlineImage.height();
        const recorder = this.skia.PictureRecorder();
        recorder
          .beginRecording(PICTURE_BOUNDS)
          .drawImageRectOptions(
            outlineImage,
            { x: 0, y: 0, width: outlineImage.width(), height: outlineImage.height() },
            box,
            FilterMode.Linear,
            MipmapMode.None,
            this.smooth,
          );
        outline = recorder.finishRecordingAsPicture();
        vector.dispose?.();
      }
      const value: CritterPictures = {
        width: parts.width,
        height: parts.height,
        outline,
        outlineImage,
        body: [this.record(parts.body[0]), this.record(parts.body[1]), this.record(parts.body[2])],
        eyes: parts.eyes
          ? { open: this.record(parts.eyes.open), closed: this.record(parts.eyes.closed) }
          : null,
        mouths: Object.fromEntries(MOUTHS.map((m) => [m, this.record(parts.mouths[m])])) as Record<
          Mouth,
          SkPicture
        >,
      };
      // The outline replays the body two dozen times; count it as that much (or as its pixels).
      const bytes =
        all.reduce((n, ops) => n + estimate(ops), 0) * (outlineImage ? 1 : 2) + pixels * 4;
      return { value, bytes };
    }) as CritterPictures;
  }

  /**
   * A critter cut into parts on their own pivots (tail, feet, ears, bean, markings, paws, eyes with
   * pupils and lids, brows, nose, mouths), each part a picture, for the rig's motion. Recorded once
   * per species, mood and size, like `critter`.
   */
  critterRig(spec: CritterSpec, pixelRatio = 0): RigPictures {
    const key = ArtRenderer.rigKey(spec, pixelRatio);
    return this.cache.getOrSet(key, () => {
      const rig = critterRig(this.proto, this.skia, spec);
      let pixels = 0;
      // Outlines into pixels at the screen's density (0 keeps them as pictures).
      const raster =
        pixelRatio > 0
          ? (picture: SkPicture, box: Box) => {
              const image = this.rasterize(picture, box, pixelRatio);
              pixels += image.width() * image.height();
              return image;
            }
          : null;
      const smooth = this.skia.Paint();
      smooth.setAntiAlias(true);
      const value = rigPictures(rig, (ops) => this.record(ops), raster, this.skia.Paint(), smooth);
      const bytes = rigOps(rig).reduce((n, ops) => n + estimate(ops), 0) + pixels * 4;
      return { value, bytes };
    }) as RigPictures;
  }

  /** Any generator call as one picture, cached by the call. */
  art(call: ArtCall): ArtPicture {
    return this.cache.getOrSet(`art:${stableKey(call)}`, () => {
      const ops = recordArt(this.proto, this.skia, call);
      return {
        value: { picture: this.record(ops), width: call.w, height: call.h },
        bytes: estimate(ops),
      };
    }) as ArtPicture;
  }

  /** A scene (or its front layer; null when it has none). */
  scene(name: SceneName, opts: SceneOptions = {}): ArtPicture | null {
    const call = sceneCall(name, opts);
    return call ? this.art(call) : null;
  }

  /** A burrow object, in its 60 × 80 box. */
  object(id: BurrowObjectId): ArtPicture {
    return this.art(objectCall(id));
  }

  /** Draws a critter state with its parts, its box's top-left at the origin. */
  drawCritter(canvas: SkCanvas, pictures: CritterPictures, mouth: Mouth = 'rest', blink = false) {
    canvas.drawPicture(pictures.outline);
    canvas.drawPicture(pictures.body[0]);
    if (pictures.eyes) canvas.drawPicture(blink ? pictures.eyes.closed : pictures.eyes.open);
    canvas.drawPicture(pictures.body[1]);
    canvas.drawPicture(pictures.mouths[mouth]);
    canvas.drawPicture(pictures.body[2]);
  }

  /** The rig for `spec` if it is already recorded (recording it costs a frame or more). */
  peekRig(spec: CritterSpec, pixelRatio = 0): RigPictures | undefined {
    return this.cache.get(ArtRenderer.rigKey(spec, pixelRatio)) as RigPictures | undefined;
  }

  /** Drops every cached picture not on screen (as on a memory warning). */
  flush(): void {
    this.cache.flush();
  }
}
