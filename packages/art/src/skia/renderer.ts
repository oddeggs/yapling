import type { SkCanvas, SkPicture } from '@shopify/react-native-skia';

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
import { loadPrototype, type Prototype } from '../runtime/prototype';
import type { SkiaApi } from './api';

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
  outline: SkPicture;
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

  constructor(
    readonly skia: SkiaApi,
    options: ArtRendererOptions = {},
  ) {
    this.proto = loadPrototype(skia);
    this.player = new Player(skia, options.fonts ? new ParagraphText(skia, options.fonts) : null);
    // Evicting only lets go of the cache's reference; a picture still drawing stays valid and
    // Skia frees it once nothing holds it.
    this.cache = new LruCache<unknown>(options.cacheBytes ?? DEFAULT_CACHE_BYTES);
  }

  /** Records operations into a picture. */
  record(ops: readonly Op[]): SkPicture {
    const recorder = this.skia.PictureRecorder();
    this.player.play(recorder.beginRecording(PICTURE_BOUNDS), ops);
    return recorder.finishRecordingAsPicture();
  }

  /** A sticker critter's parts as pictures, recorded once per species, mood and size. */
  critter(spec: CritterSpec): CritterPictures {
    const key = `critter:${spec.species}:${spec.mood}:${spec.size}`;
    return this.cache.getOrSet(key, () => {
      const parts = critterParts(this.proto, this.skia, spec);
      const all = [parts.outline, ...parts.body, ...MOUTHS.map((m) => parts.mouths[m])];
      const value: CritterPictures = {
        width: parts.width,
        height: parts.height,
        outline: this.record(parts.outline),
        body: [this.record(parts.body[0]), this.record(parts.body[1]), this.record(parts.body[2])],
        eyes: parts.eyes
          ? { open: this.record(parts.eyes.open), closed: this.record(parts.eyes.closed) }
          : null,
        mouths: Object.fromEntries(MOUTHS.map((m) => [m, this.record(parts.mouths[m])])) as Record<
          Mouth,
          SkPicture
        >,
      };
      // The outline replays the body two dozen times; count it as that much.
      const bytes = all.reduce((n, ops) => n + estimate(ops), 0) * 2;
      return { value, bytes };
    }) as CritterPictures;
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

  /** Drops every cached picture (as on a memory warning). */
  flush(): void {
    this.cache.flush();
  }
}
