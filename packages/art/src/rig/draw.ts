import type { SkCanvas, SkPicture } from '@shopify/react-native-skia';

import { ClipOp, FilterMode, MipmapMode } from '../skia/api';
import { ARM_REST } from './acts';
import type { RigOutlinePictures, RigPictures } from './pictures';
import type { Pose } from './pose';

/**
 * How far each layer slides on a full head turn, in rig units (the bean is ~140 wide): what sticks
 * out most slides most, the outline stays, the parts at the back slide the other way.
 */
export const DEPTH = {
  nose: 18,
  eyes: 14,
  mouth: 14,
  blush: 11,
  markings: 7,
  chest: 4,
  top: 4,
  ears: -12,
  tail: -8,
} as const;

/** The arm the paws hang from: two segments of this length (rig units), shoulder to paw. */
export const ARM = { upper: 28, fore: 28 } as const;

const RAD = Math.PI / 180;

/** Where a paw sits from its shoulder for angles `a` and `e` (degrees), on the right side. */
export function reach(a: number, e: number): { x: number; y: number } {
  'worklet';
  const f = a + e;
  return {
    x: ARM.upper * Math.sin(a * RAD) + ARM.fore * Math.sin(f * RAD),
    y: ARM.upper * Math.cos(a * RAD) + ARM.fore * Math.cos(f * RAD),
  };
}

const clamp01 = (v: number) => {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

function root(c: SkCanvas, r: RigPictures, p: Pose) {
  'worklet';
  const g = r.pivots.ground;
  c.translate(0, -p.lift * r.unit);
  c.translate(g.x, g.y);
  c.scale(p.sx, p.sy);
  c.translate(-g.x, -g.y);
}

function body(c: SkCanvas, r: RigPictures, p: Pose) {
  'worklet';
  root(c, r, p);
  const g = r.pivots.ground;
  c.rotate(p.lean, g.x, g.y);
}

function head(c: SkCanvas, r: RigPictures, p: Pose, depth: number, tilt = 1) {
  'worklet';
  body(c, r, p);
  const h = r.pivots.head;
  c.rotate(p.tilt * tilt, h.x, h.y);
  c.translate(p.yaw * depth * r.unit, 0);
}

function tail(c: SkCanvas, r: RigPictures, p: Pose) {
  'worklet';
  body(c, r, p);
  const t = r.pivots.tail;
  c.translate(p.yaw * DEPTH.tail * r.unit, 0);
  if (t) c.rotate(p.tail, t.x, t.y);
}

function ear(c: SkCanvas, r: RigPictures, p: Pose, i: 0 | 1) {
  'worklet';
  head(c, r, p, DEPTH.ears);
  const e = r.pivots.ears?.[i];
  if (e) c.rotate(i ? p.earR : p.earL, e.x, e.y);
}

function foot(c: SkCanvas, r: RigPictures, p: Pose, i: 0 | 1) {
  'worklet';
  root(c, r, p);
  const f = r.pivots.feet[i];
  c.rotate(i ? p.footR : p.footL, f.x, f.y);
}

/** A paw at the end of its arm: moved by the arm's reach, turned with the forearm and the wrist. */
function paw(c: SkCanvas, r: RigPictures, p: Pose, i: 0 | 1) {
  'worklet';
  body(c, r, p);
  const at = r.pivots.paws[i];
  const a = i ? p.armRa : p.armLa;
  const e = i ? p.armRe : p.armLe;
  const now = reach(a, e);
  const rest = reach(ARM_REST.a, ARM_REST.e);
  const m = i ? 1 : -1;
  c.translate((now.x - rest.x) * m * r.unit, (now.y - rest.y) * r.unit);
  const turn = (a + e - ARM_REST.a - ARM_REST.e) * -m + (i ? p.wristR : p.wristL) * -m;
  c.rotate(turn, at.x, at.y);
}

/** An outline: its cached pixels when there are some, else its silhouette copies. */
function outline(c: SkCanvas, r: RigPictures, o: RigOutlinePictures) {
  'worklet';
  if (!o.image) {
    c.drawPicture(o.picture);
    return;
  }
  const b = o.box;
  c.drawImageRectOptions(
    o.image,
    { x: 0, y: 0, width: o.image.width(), height: o.image.height() },
    { x: b.x, y: b.y, width: b.width, height: b.height },
    FilterMode.Linear,
    MipmapMode.None,
    r.smooth,
  );
}

function pic(c: SkCanvas, picture: SkPicture | null) {
  'worklet';
  if (picture) c.drawPicture(picture);
}

/** One eye: the white, the pupil gliding inside it, the lid and cheek over it, the ring on top. */
function eye(c: SkCanvas, r: RigPictures, p: Pose, i: 0 | 1) {
  'worklet';
  const e = r.eyes?.[i];
  if (!e) return;
  const lid = i ? p.lidR : p.lidL;
  // The open eye gives way to the generator's closed line only as the lid reaches it.
  const open = 1 - clamp01((lid - 0.9) / 0.1);
  const shut = clamp01((lid - 0.82) / 0.18);
  const travel = 2 * e.ry + 12 * r.unit;
  c.save();
  head(c, r, p, DEPTH.eyes);
  if (open > 0) {
    if (open < 1) {
      r.fade.setAlphaf(open);
      c.saveLayer(r.fade);
    } else c.save();
    c.drawPicture(e.white);
    c.save();
    c.clipPath(e.clip, ClipOp.Intersect, true);
    c.save();
    c.translate(p.lookX * r.unit, p.lookY * r.unit);
    c.drawPicture(e.pupil);
    c.restore();
    if (e.lid) {
      if (lid > 0) {
        c.save();
        c.translate(0, -(1 - lid) * travel);
        c.drawPicture(e.lid);
        c.restore();
      }
      if (p.cheek > 0 && e.cheek) {
        // The cheek is the lid's skin turned over, rising from below.
        c.save();
        c.translate(0, (1 - 0.36 * p.cheek) * travel);
        c.translate(0, e.cy);
        c.scale(1, -1);
        c.translate(0, -e.cy);
        c.drawPicture(e.cheek);
        c.restore();
      }
    }
    c.restore();
    c.drawPicture(e.ring);
    c.restore();
  }
  if (shut > 0) {
    r.fade.setAlphaf(shut);
    c.saveLayer(r.fade);
    c.drawPicture(e.closed);
    c.restore();
  }
  c.restore();
}

/**
 * Draws a rigged critter in `pose`, its box's top-left at the origin, with `mouth` (a viseme picture,
 * or null for its mood's own). Every part is a cached picture moved by transforms about its joint;
 * the outlines of the moving parts go under all of the art, as the sticker outline does.
 */
export function drawRig(c: SkCanvas, r: RigPictures, p: Pose, mouth: SkPicture | null = null) {
  'worklet';
  // The floor shadow stays on the floor and shrinks as the critter rises.
  const s = r.pivots.shadow;
  c.save();
  c.translate(s.x, s.y);
  c.scale(p.shadow, p.shadow);
  c.translate(-s.x, -s.y);
  c.drawPicture(r.ground);
  c.restore();

  // Outlines and hard shadows, each with its part.
  if (r.outline.tail) {
    c.save();
    tail(c, r, p);
    outline(c, r, r.outline.tail);
    c.restore();
  }
  for (const i of [0, 1] as const) {
    c.save();
    foot(c, r, p, i);
    outline(c, r, r.outline.feet[i]);
    c.restore();
    if (r.outline.ears) {
      c.save();
      ear(c, r, p, i);
      outline(c, r, r.outline.ears[i]);
      c.restore();
    }
  }
  c.save();
  body(c, r, p);
  outline(c, r, r.outline.body);
  c.restore();
  for (const i of [0, 1] as const) {
    c.save();
    paw(c, r, p, i);
    outline(c, r, r.outline.paws[i]);
    c.restore();
  }
  if (r.outline.nose) {
    c.save();
    head(c, r, p, DEPTH.nose);
    outline(c, r, r.outline.nose);
    c.restore();
  }
  if (r.outline.top) {
    c.save();
    head(c, r, p, DEPTH.top);
    outline(c, r, r.outline.top);
    c.restore();
  }

  // The art, in the generator's order.
  if (r.tail) {
    c.save();
    tail(c, r, p);
    c.drawPicture(r.tail);
    c.restore();
  }
  for (const i of [0, 1] as const) {
    c.save();
    foot(c, r, p, i);
    c.drawPicture(r.feet[i]);
    c.restore();
  }
  if (r.ears) {
    for (const i of [0, 1] as const) {
      c.save();
      ear(c, r, p, i);
      c.drawPicture(r.ears[i]);
      c.restore();
    }
  }
  c.save();
  body(c, r, p);
  c.drawPicture(r.body);
  // Markings slide inside the bean, which stays put.
  c.save();
  c.clipPath(r.bodyClip, ClipOp.Intersect, true);
  c.save();
  c.translate(p.yaw * DEPTH.chest * r.unit, 0);
  c.drawPicture(r.belly);
  c.restore();
  c.save();
  const h = r.pivots.head;
  c.rotate(p.tilt * 0.6, h.x, h.y);
  c.translate(p.yaw * DEPTH.markings * r.unit, 0);
  c.drawPicture(r.markings);
  c.restore();
  c.translate(p.yaw * DEPTH.chest * r.unit, 0);
  c.drawPicture(r.clothes);
  c.restore();
  c.restore();
  c.save();
  head(c, r, p, DEPTH.mouth);
  c.drawPicture(r.late);
  c.restore();
  c.save();
  body(c, r, p);
  c.drawPicture(r.stroke);
  c.restore();
  for (const i of [0, 1] as const) {
    c.save();
    paw(c, r, p, i);
    c.drawPicture(r.paws[i]);
    c.restore();
  }
  c.save();
  head(c, r, p, DEPTH.blush);
  c.translate(0, -2 * p.cheek * r.unit);
  c.drawPicture(r.blush);
  c.restore();
  eye(c, r, p, 0);
  eye(c, r, p, 1);
  for (const i of [0, 1] as const) {
    c.save();
    head(c, r, p, DEPTH.eyes);
    c.translate(0, -(i ? p.browR : p.browL) * r.unit);
    c.drawPicture(r.brows[i]);
    c.restore();
  }
  c.save();
  head(c, r, p, DEPTH.nose);
  c.drawPicture(r.nose);
  c.restore();
  c.save();
  head(c, r, p, DEPTH.mouth);
  pic(c, mouth ?? r.mouths.rest);
  c.restore();
  c.save();
  head(c, r, p, DEPTH.top);
  c.drawPicture(r.top);
  c.restore();
}

/** The pose that draws the critter exactly as the generator does (every channel at rest). */
export const REST_POSE: Pose = {
  lift: 0,
  sx: 1,
  sy: 1,
  lean: 0,
  tilt: 0,
  yaw: 0,
  tail: 0,
  earL: 0,
  earR: 0,
  footL: 0,
  footR: 0,
  armLa: ARM_REST.a,
  armLe: ARM_REST.e,
  armRa: ARM_REST.a,
  armRe: ARM_REST.e,
  wristL: 0,
  wristR: 0,
  browL: 0,
  browR: 0,
  lookX: 0,
  lookY: 0,
  lidL: 0,
  lidR: 0,
  cheek: 0,
  shadow: 1,
};
