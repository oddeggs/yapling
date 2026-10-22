import type { SkImage, SkPaint, SkPath, SkPicture } from '@shopify/react-native-skia';

import type { Op } from '../canvas/ops';
import { PaintStyle } from '../skia/api';
import { MOUTHS, type Mouth } from '../critter';
import type { Box, CritterRig, Pair, Point, RigOutline } from './parts';

/**
 * A part's outline and hard shadow, drawn once into pixels: 24 silhouette copies are far too many
 * to replay every frame (they cost more than all of the art), and a silhouette only moves with its
 * part, so a cached image does. `picture` is the vector form (kept for when no image is made).
 */
export interface RigOutlinePictures {
  readonly picture: SkPicture;
  readonly image: SkImage | null;
  readonly box: Box;
}

/** One eye's pictures (see `RigEye`). */
export interface RigEyePictures {
  readonly white: SkPicture;
  readonly pupil: SkPicture;
  readonly ring: SkPicture;
  readonly lid: SkPicture | null;
  /** The lid's skin without its edge line: the cheek, turned over, rising from below. */
  readonly cheek: SkPicture | null;
  readonly closed: SkPicture;
  readonly clip: SkPath;
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** A rigged critter's parts as pictures, recorded once and only moved after (see `CritterRig`). */
export interface RigPictures {
  readonly width: number;
  readonly height: number;
  readonly unit: number;
  readonly ground: SkPicture;
  readonly outline: {
    readonly body: RigOutlinePictures;
    readonly tail: RigOutlinePictures | null;
    readonly feet: Pair<RigOutlinePictures>;
    readonly ears: Pair<RigOutlinePictures> | null;
    readonly paws: Pair<RigOutlinePictures>;
    readonly nose: RigOutlinePictures | null;
    readonly top: RigOutlinePictures | null;
  };
  readonly tail: SkPicture | null;
  readonly feet: Pair<SkPicture>;
  readonly ears: Pair<SkPicture> | null;
  readonly body: SkPicture;
  readonly belly: SkPicture;
  readonly markings: SkPicture;
  readonly clothes: SkPicture;
  readonly bodyClip: SkPath;
  readonly late: SkPicture;
  readonly stroke: SkPicture;
  readonly paws: Pair<SkPicture>;
  readonly blush: SkPicture;
  readonly eyes: Pair<RigEyePictures> | null;
  readonly brows: Pair<SkPicture>;
  readonly nose: SkPicture;
  readonly mouths: Readonly<Record<Mouth, SkPicture>>;
  readonly top: SkPicture;
  readonly pivots: CritterRig['pivots'];
  /** Fades a part in or out (a closing eye's line): its alpha is set as it draws. */
  readonly fade: SkPaint;
  /** Draws the outline images (smooth sampling). */
  readonly smooth: SkPaint;
}

/**
 * Records every part of `rig` with `record`, and each outline into an image with `raster` (null
 * keeps outlines as pictures); `fade` and `smooth` are fresh paints.
 */
export function rigPictures(
  rig: CritterRig,
  record: (ops: readonly Op[]) => SkPicture,
  raster: ((picture: SkPicture, box: Box) => SkImage) | null,
  fade: SkPaint,
  smooth: SkPaint,
): RigPictures {
  const pair = (p: Pair<readonly Op[]>): Pair<SkPicture> => [record(p[0]), record(p[1])];
  const out = (o: RigOutline): RigOutlinePictures => {
    const picture = record(o.ops);
    return { picture, image: raster ? raster(picture, o.box) : null, box: o.box };
  };
  return {
    width: rig.width,
    height: rig.height,
    unit: rig.unit,
    ground: record(rig.ground),
    outline: {
      body: out(rig.outline.body),
      tail: rig.outline.tail ? out(rig.outline.tail) : null,
      feet: [out(rig.outline.feet[0]), out(rig.outline.feet[1])],
      ears: rig.outline.ears ? [out(rig.outline.ears[0]), out(rig.outline.ears[1])] : null,
      paws: [out(rig.outline.paws[0]), out(rig.outline.paws[1])],
      nose: rig.outline.nose ? out(rig.outline.nose) : null,
      top: rig.outline.top ? out(rig.outline.top) : null,
    },
    tail: rig.tail ? record(rig.tail) : null,
    feet: pair(rig.feet),
    ears: rig.ears ? pair(rig.ears) : null,
    body: record(rig.body),
    belly: record(rig.belly),
    markings: record(rig.markings),
    clothes: record(rig.clothes),
    bodyClip: rig.bodyClip,
    late: record(rig.late),
    stroke: record(rig.stroke),
    paws: pair(rig.paws),
    blush: record(rig.blush),
    eyes: rig.eyes
      ? (rig.eyes.map((e) => ({
          white: record(e.white),
          pupil: record(e.pupil),
          ring: record(e.ring),
          lid: e.lid ? record(e.lid) : null,
          cheek: e.lid
            ? record(e.lid.filter((op) => op.kind === 'path' && op.paint.style === PaintStyle.Fill))
            : null,
          closed: record(e.closed),
          clip: e.clip,
          cx: e.centre.x,
          cy: e.centre.y,
          rx: e.rx,
          ry: e.ry,
        })) as unknown as Pair<RigEyePictures>)
      : null,
    brows: pair(rig.brows),
    nose: record(rig.nose),
    mouths: Object.fromEntries(MOUTHS.map((m) => [m, record(rig.mouths[m])])) as Record<
      Mouth,
      SkPicture
    >,
    top: record(rig.top),
    pivots: rig.pivots,
    fade,
    smooth,
  };
}

/** Every operation list of a rig, for sizing its cache entry. */
export function rigOps(rig: CritterRig): (readonly Op[])[] {
  const eyes = rig.eyes?.flatMap((e) => [e.white, e.pupil, e.ring, e.lid ?? [], e.closed]) ?? [];
  return [
    rig.ground,
    rig.outline.body.ops,
    rig.outline.tail?.ops ?? [],
    ...rig.outline.feet.map((o) => o.ops),
    ...(rig.outline.ears ?? []).map((o) => o.ops),
    ...rig.outline.paws.map((o) => o.ops),
    rig.outline.nose?.ops ?? [],
    rig.outline.top?.ops ?? [],
    rig.tail ?? [],
    ...rig.feet,
    ...(rig.ears ?? []),
    rig.body,
    rig.belly,
    rig.markings,
    rig.clothes,
    rig.late,
    rig.stroke,
    ...rig.paws,
    rig.blush,
    ...eyes,
    ...rig.brows,
    rig.nose,
    ...MOUTHS.map((m) => rig.mouths[m]),
    rig.top,
  ];
}

export type { Point };

/** Lets go of a rig's pictures and outline pixels at once (an evicted entry nothing draws). */
export function disposeRig(r: RigPictures): void {
  const outlines = [
    r.outline.body,
    r.outline.tail,
    ...r.outline.feet,
    ...(r.outline.ears ?? []),
    ...r.outline.paws,
    r.outline.nose,
    r.outline.top,
  ];
  for (const o of outlines) {
    o?.picture.dispose?.();
    o?.image?.dispose?.();
  }
  const eyes = (r.eyes ?? []).flatMap((e) => [e.white, e.pupil, e.ring, e.lid, e.cheek, e.closed]);
  const pictures = [
    r.ground,
    r.tail,
    ...r.feet,
    ...(r.ears ?? []),
    r.body,
    r.belly,
    r.markings,
    r.clothes,
    r.late,
    r.stroke,
    ...r.paws,
    r.blush,
    ...eyes,
    ...r.brows,
    r.nose,
    ...Object.values(r.mouths),
    r.top,
  ];
  for (const p of pictures) p?.dispose?.();
}
