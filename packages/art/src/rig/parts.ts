import type { SkPath } from '@shopify/react-native-skia';

import { invert, multiply, type Mat } from '../canvas/matrix';
import { opKey, transformPath, type LayerOp, type Op, type PathOp } from '../canvas/ops';
import { recordArt } from '../art';
import { MOUTHS, type CritterSpec, type Mouth } from '../critter';
import type { Prototype } from '../runtime/prototype';
import { PaintStyle, type SkiaApi } from '../skia/api';

/**
 * A sticker critter cut into the parts that move on their own pivots, from the synced generator
 * alone: no part is redrawn and the generator is not changed. Each part is a run of the
 * operations the generator records, found by drawing the critter again with an option it already
 * has and comparing (`noTail`, `look`, `blink`, `pose`, `mouth`, `pal.lid`, `t`, a mood with
 * perked ears), or by the rig's fixed drawing order (feet, ears, body, markings, outline stroke,
 * paws, blush, eyes, brows, nose, mouth, what sits on top). Pivots come from the same comparisons:
 * a part the generator rotates (the tail's sway, the ears' perk) turns about a point that the two
 * drawings share, and that point is its joint.
 *
 * Coordinates are the critter's box in points (`width` × `height`), as `critterParts` records it.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** One eye, cut so the pupil can glide and a lid can lower over it. */
export interface RigEye {
  /** The eye white and its shading, under the pupil. */
  readonly white: readonly Op[];
  /** The pupil and its shines, without the eye's clip (the rig clips them as they move). */
  readonly pupil: readonly Op[];
  /** What the generator draws over the pupil: the ink ring (and a mood's own half lid). */
  readonly ring: readonly Op[];
  /** The generator's own lid fully down (`pal.lid` = 1), without the eye's clip; null for a lidded mood. */
  readonly lid: readonly Op[] | null;
  /** The generator's closed eye (its blink line). */
  readonly closed: readonly Op[];
  /** The eye white's outline, which the pupil and lid are clipped to. */
  readonly clip: SkPath;
  readonly centre: Point;
  readonly rx: number;
  readonly ry: number;
}

export type Pair<T> = readonly [left: T, right: T];

/** A rectangle in the box's points. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A part's share of the sticker outline, and the box it can reach. */
export interface RigOutline {
  readonly ops: readonly Op[];
  readonly box: Box;
}

export interface CritterRig {
  readonly width: number;
  readonly height: number;
  /** The floor shadow: it stays on the floor. */
  readonly ground: readonly Op[];
  /**
   * Each moving part's share of the sticker outline and hard shadow: the generator's own 24
   * silhouette copies, each cut to the part's operations, so the outline turns with the part.
   * `body` is everything that does not move on its own (the bean, the face, what sits on top).
   */
  readonly outline: {
    readonly body: RigOutline;
    readonly tail: RigOutline | null;
    readonly feet: Pair<RigOutline>;
    readonly ears: Pair<RigOutline> | null;
    readonly paws: Pair<RigOutline>;
    readonly nose: RigOutline | null;
    readonly top: RigOutline | null;
  };
  readonly tail: readonly Op[] | null;
  readonly feet: Pair<readonly Op[]>;
  readonly ears: Pair<readonly Op[]> | null;
  /** The bean: head and body are one shape in the cast rig. */
  readonly body: readonly Op[];
  /** The belly, without the bean's clip (the rig clips the markings as they slide). */
  readonly belly: readonly Op[];
  /** The face markings, without the bean's clip. */
  readonly markings: readonly Op[];
  /** Clothes on the chest (drawn over the face markings), without the bean's clip. */
  readonly clothes: readonly Op[];
  /** The bean's outline, which the markings are clipped to. */
  readonly bodyClip: SkPath;
  /** What a species draws on the face after the markings (a bison's beard), unclipped. */
  readonly late: readonly Op[];
  /** The bean's ink stroke. */
  readonly stroke: readonly Op[];
  readonly paws: Pair<readonly Op[]>;
  readonly blush: readonly Op[];
  /** Null for moods whose eyes are arcs of joy (laugh, warm). */
  readonly eyes: Pair<RigEye> | null;
  readonly brows: Pair<readonly Op[]>;
  /** Nose and whiskers. */
  readonly nose: readonly Op[];
  readonly mouths: Readonly<Record<Mouth, readonly Op[]>>;
  /** What sits on top: a capybara's orange, a hat, a mood's sparkles. */
  readonly top: readonly Op[];
  readonly pivots: {
    /** Where the feet meet the floor (centre of the box, bottom of the feet). */
    readonly ground: Point;
    /** The centre of the floor shadow. */
    readonly shadow: Point;
    /** Between the eyes: the head turns and tilts about it. */
    readonly head: Point;
    readonly tail: Point | null;
    readonly ears: Pair<Point> | null;
    readonly feet: Pair<Point>;
    readonly paws: Pair<Point>;
  };
  /** Points per rig unit: the generator draws in a 200-wide box. */
  readonly unit: number;
  /** The species' size in that box (a tarsier is drawn at 0.64): its motion scales with it. */
  readonly scale: number;
}

/**
 * Where a sticker critter's outline reaches, in points: its box, out by the outline's radius and
 * the hard shadow's offset (yap-sticker's `outline`: r = max(1.4, 3.2k), sh = max(2, 5k),
 * k = w / 200; the silhouettes are copies of the box moved by up to r + 0.35 sh across and r + sh
 * down), plus a point for anti-aliasing.
 */
export function outlineBox(width: number, height: number): Box {
  const k = width / 200;
  const r = Math.max(1.4, 3.2 * k);
  const sh = Math.max(2, 5 * k);
  const x = Math.floor(-r - 1);
  const y = Math.floor(-r - 1);
  return {
    x,
    y,
    width: Math.ceil(width + r + 0.35 * sh + 1) - x,
    height: Math.ceil(height + r + sh + 1) - y,
  };
}

const keyOf = (op: Op | undefined) => op?.key;

/** The run `[from, to)` of `base` that `variant` replaces (everything around it is shared). */
function changedRun(
  base: readonly Op[],
  variant: readonly Op[],
): { from: number; to: number; vTo: number } {
  const max = Math.min(base.length, variant.length);
  let p = 0;
  while (p < max && base[p]?.key === variant[p]?.key) p++;
  let s = 0;
  while (s < max - p && keyOf(base[base.length - 1 - s]) === keyOf(variant[variant.length - 1 - s]))
    s++;
  return { from: p, to: base.length - s, vTo: variant.length - s };
}

/** What an operation draws and where, ignoring drawing state that does not change its look. */
const shapeKey = (op: Op | undefined) =>
  op ? `${op.body.split('|').slice(0, 2).join('|')}@${op.m.join(',')}` : '';

/**
 * The operations of `base` that `variant` leaves out (one option drawing fewer things). Shapes and
 * places are compared, not keys: drawing state a left-out run set (a line cap) can change the keys
 * of later operations without changing their look (the cap of a closed stroke).
 */
function removed(base: readonly Op[], variant: readonly Op[]): Set<number> {
  const out = new Set<number>();
  let j = 0;
  for (let i = 0; i < base.length; i++) {
    if (j < variant.length && shapeKey(base[i]) === shapeKey(variant[j])) j++;
    else out.add(i);
  }
  return j === variant.length ? out : new Set();
}

/** The one run `[from, to)` of indices in `set` (empty when there is none). */
function runOf(set: Set<number>): { from: number; to: number } | null {
  if (set.size === 0) return null;
  const from = Math.min(...set);
  const to = Math.max(...set) + 1;
  return to - from === set.size ? { from, to } : null;
}

/** The first to last operation a same-length variant changes. */
function changedSpan(base: readonly Op[], variant: readonly Op[]): { from: number; to: number } {
  if (base.length !== variant.length) return { from: 0, to: 0 };
  let from = -1;
  let to = -1;
  for (let i = 0; i < base.length; i++) {
    if (base[i]?.key !== variant[i]?.key) {
      if (from < 0) from = i;
      to = i + 1;
    }
  }
  return from < 0 ? { from: 0, to: 0 } : { from, to };
}

const isPath = (op: Op | undefined): op is PathOp => op?.kind === 'path';

/** The bounds of an operation's path where it is drawn (the box's coordinates). */
function placedBounds(skia: SkiaApi, op: Op) {
  if (!isPath(op)) return null;
  return transformPath(skia, op.path, op.m).computeTightBounds();
}

function unionBounds(skia: SkiaApi, ops: readonly Op[]) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const op of ops) {
    const b = placedBounds(skia, op);
    if (!b || !isPath(op)) continue;
    // A stroke reaches half its width past its path.
    const w =
      op.paint.style === PaintStyle.Stroke
        ? (op.paint.width / 2) * Math.hypot(op.m[0], op.m[1])
        : 0;
    x0 = Math.min(x0, b.x - w);
    y0 = Math.min(y0, b.y - w);
    x1 = Math.max(x1, b.x + b.width + w);
    y1 = Math.max(y1, b.y + b.height + w);
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** The point that `m` → `n` leaves in place: the joint a part turned about between two drawings. */
function fixedPoint(m: Mat, n: Mat): Point | null {
  const inv = invert(m);
  if (!inv) return null;
  const [a, b, c, d, e, f] = multiply(n, inv);
  // Solve (I − A)·p = t.
  const det = (1 - a) * (1 - d) - b * c;
  if (Math.abs(det) < 1e-9) return null;
  return { x: ((1 - d) * e + c * f) / det, y: (b * e + (1 - a) * f) / det };
}

/** A copy of `op` without the clip named `clipKey` (the rig applies that clip itself). */
function unclip(op: Op, clipKey: string): Op {
  const clips = op.clips.filter((c) => c.key !== clipKey);
  return { ...op, clips, key: opKey(op.body, op.m, clips) };
}

function isInk90Stroke(op: Op | undefined): boolean {
  if (!isPath(op) || op.paint.style !== PaintStyle.Stroke || op.paint.source.kind !== 'color')
    return false;
  const [r, g, b, a] = op.paint.source.color;
  return (
    Math.abs(r - 23 / 255) < 0.01 &&
    Math.abs(g - 19 / 255) < 0.01 &&
    Math.abs(b - 28 / 255) < 0.01 &&
    Math.abs(a - 0.9) < 0.01
  );
}

function sameBounds(skia: SkiaApi, a: Op | undefined, b: Op | undefined): boolean {
  if (!a || !b) return false;
  const p = placedBounds(skia, a);
  const q = placedBounds(skia, b);
  if (!p || !q) return false;
  return (
    Math.abs(p.x - q.x) < 0.01 &&
    Math.abs(p.y - q.y) < 0.01 &&
    Math.abs(p.width - q.width) < 0.01 &&
    Math.abs(p.height - q.height) < 0.01
  );
}

function fail(spec: CritterSpec, what: string): never {
  throw new Error(`@yapling/art rig: ${spec.species} ${spec.mood}: ${what}`);
}

/**
 * Cuts the critter into rig parts (see `CritterRig`), at the mood's own tilt: the motion leans it
 * from there. Moods that hold a paw to the face (`cheeks`, `chin` poses) are not rigged: their paws
 * are drawn over the face, and the rig has no arm to move them by (it throws).
 */
export function critterRig(proto: Prototype, skia: SkiaApi, spec: CritterSpec): CritterRig {
  // The generator's own options, as `recordCritter` passes them, plus the ones the rig compares by.
  const raw = (o: Record<string, unknown>) =>
    recordArt(proto, skia, {
      fn: 's_critter',
      w: spec.size,
      h: spec.size * 1.2,
      o: { sp: spec.species, mood: spec.mood, mouth: 'rest', t: 0, ...o },
    });
  // A mood's own tilt (a listening head on one side) stays in every drawing the rig compares, so
  // at rest it draws exactly what the generator does; the rig's motion turns it from there.
  const tilt = moodTilt(raw({ tilt: 0 }), raw({}));
  const rec = (o: Record<string, unknown> = {}) => raw({ tilt, ...o });
  const base = rec();
  const unit = spec.size / 200;

  // The sticker outline: the floor shadow, then 24 silhouette copies of the art.
  let outlineEnd = 0;
  for (let i = 0; i < base.length; i++) {
    const op = base[i];
    if (op && (op.kind === 'layer' || op.kind === 'image') && op.mask) outlineEnd = i + 1;
  }
  const masks = base
    .slice(0, outlineEnd)
    .filter((op): op is LayerOp => op.kind === 'layer' && op.mask);
  const ground = base.slice(0, outlineEnd).filter((op) => !(op.kind === 'layer' && op.mask));
  const art = base.length - outlineEnd;
  const sub = masks[0]?.ops;
  if (masks.length !== 24 || !sub || sub.length !== art + 1)
    fail(spec, 'the outline is not 24 copies of the art');
  if (
    masks.some((m) => m.ops.length !== sub.length || m.ops.some((o, i) => o.body !== sub[i]?.body))
  )
    fail(spec, 'the outline copies differ');

  // Tail: the run `noTail` leaves out.
  const tailRun = runOf(removed(base, rec({ noTail: true }))) ?? {
    from: outlineEnd,
    to: outlineEnd,
  };
  const hasTail = tailRun.to > tailRun.from;
  const feetAt = hasTail ? tailRun.to : outlineEnd;
  if (hasTail && tailRun.from !== outlineEnd) fail(spec, 'the tail is not drawn first');
  const feet: Pair<readonly Op[]> = [
    base.slice(feetAt, feetAt + 1),
    base.slice(feetAt + 1, feetAt + 2),
  ];
  for (const f of feet) {
    const b = f[0] && isPath(f[0]) ? f[0].path.computeTightBounds() : null;
    if (!b || Math.abs(b.width - 30) > 0.01 || Math.abs(b.height - 13) > 0.01)
      fail(spec, 'no feet after the tail');
  }

  // The bean: its ink stroke, and the fill with the same outline before it.
  const strokeAt = base.findIndex((op, i) => i > feetAt + 1 && isInk90Stroke(op));
  if (strokeAt < 0) fail(spec, 'no outline stroke on the bean');
  let bodyAt = -1;
  for (let i = feetAt + 2; i < strokeAt; i++) {
    const op = base[i];
    if (isPath(op) && op.paint.style === PaintStyle.Fill && sameBounds(skia, op, base[strokeAt])) {
      bodyAt = i;
      break;
    }
  }
  if (bodyAt < 0) fail(spec, 'no bean fill');
  const ears = bodyAt > feetAt + 2 ? base.slice(feetAt + 2, bodyAt) : null;
  if (ears && ears.length % 2) fail(spec, 'the ears are not a pair');

  // Markings: inside the bean's clip, up to the first that is not (a species' late drawing).
  const bodyOp = base[bodyAt] as Op;
  const inside = base[bodyAt + 1];
  const bodyClip = inside?.clips.find((c) => !bodyOp.clips.some((d) => d.key === c.key));
  if (!bodyClip) fail(spec, 'no markings inside the bean');
  let lateAt = bodyAt + 1;
  while (lateAt < strokeAt && base[lateAt]?.clips.some((c) => c.key === bodyClip.key)) lateAt++;
  // The belly is the first marking and the clothes the ones `acc: false` leaves out (drawn last):
  // they sit on the chest. The rest are on the face.
  const clothes = removed(base, rec({ acc: false }));
  const isBelly = (i: number) => i === bodyAt + 1;
  const marks = Array.from({ length: lateAt - bodyAt - 1 }, (_, k) => bodyAt + 1 + k);
  const markingOps = (pick: (i: number) => boolean) =>
    marks.filter(pick).map((i) => unclip(base[i] as Op, bodyClip.key));

  // Paws: the run another pose moves.
  let pawRun = changedSpan(base, rec({ pose: 'belly' }));
  if (pawRun.to <= pawRun.from) pawRun = changedSpan(base, rec({ pose: 'rest' }));
  if (pawRun.from !== strokeAt + 1) fail(spec, 'the paws are drawn over the face (a front pose)');
  const pawLen = (pawRun.to - pawRun.from) / 2;
  const paws: Pair<readonly Op[]> = [
    base.slice(pawRun.from, pawRun.from + pawLen),
    base.slice(pawRun.from + pawLen, pawRun.to),
  ];

  // Mouths, as `critterParts` finds them.
  const variants = MOUTHS.map((mouth) => (mouth === 'rest' ? base : rec({ mouth })));
  const mouthRun = MOUTHS.map((_, i) => changedRun(base, variants[i] ?? base));
  const mFrom = Math.min(...mouthRun.slice(1).map((r) => r.from));
  const mTo = Math.max(...mouthRun.slice(1).map((r) => r.to));
  const suffix = base.length - mTo;
  const mouths = {} as Record<Mouth, readonly Op[]>;
  MOUTHS.forEach((m, i) => {
    const v = variants[i] ?? base;
    mouths[m] = v.slice(mFrom, v.length - suffix);
  });

  // Eyes: the run a blink replaces; null when the mood's eyes do not blink.
  const blink = rec({ blink: true });
  const eyeRun = changedRun(base, blink);
  // A pose that holds the paws to the face (`cheeks`, `chin`) draws them after it: the run the
  // other pose moves then reaches over the eyes and the mouth.
  if (pawRun.to > (eyeRun.to > eyeRun.from ? eyeRun.from : mFrom))
    fail(spec, 'the paws are drawn over the face (a front pose)');
  const eyes = eyeRun.to > eyeRun.from ? cutEyes(skia, spec, rec, base, blink, eyeRun) : null;
  const eyeFrom = eyeRun.from;
  const eyeTo = eyeRun.to;
  // Without blinking eyes (arcs of joy) the whole face between the paws and the mouth is one part.
  const blush = base.slice(pawRun.to, eyes ? eyeFrom : mFrom);
  const browsAt = eyes ? eyeTo : mFrom;
  const brows: Pair<readonly Op[]> = eyes
    ? [base.slice(browsAt, browsAt + 1), base.slice(browsAt + 1, browsAt + 2)]
    : [[], []];
  if (eyes && brows.some((b) => !isPath(b[0]) || b[0].paint.style !== PaintStyle.Stroke))
    fail(spec, 'no brows after the eyes');
  const centreOf = (ops: readonly Op[]): Point => {
    const b = unionBounds(skia, ops);
    return { x: b.cx, y: b.cy };
  };

  // Pivots.
  const bottom = unionBounds(skia, [...feet[0], ...feet[1]]).y1;
  const head: Point = eyes
    ? { x: (eyes[0].centre.x + eyes[1].centre.x) / 2, y: (eyes[0].centre.y + eyes[1].centre.y) / 2 }
    : { x: spec.size / 2, y: unionBounds(skia, base.slice(pawRun.to, mFrom)).cy };
  let tailPivot: Point | null = null;
  if (hasTail) {
    // The generator sways the tail with time: the point the sway leaves in place is its root.
    const swayed = rec({ t: 982 });
    const a = base[tailRun.from];
    const b = swayed[tailRun.from];
    tailPivot = a && b ? fixedPoint(a.m, b.m) : null;
    if (!tailPivot) {
      // A tail that does not sway turns about where it meets the body.
      const tb = unionBounds(skia, base.slice(tailRun.from, tailRun.to));
      tailPivot = { x: tb.cx < spec.size / 2 ? tb.x1 : tb.x0, y: tb.y1 };
    }
  }
  let earPivots: Pair<Point> | null = null;
  if (ears) {
    // Perked ears turn about their roots; another mood with the same drawing order shows where.
    for (const mood of ['listen', 'sleepy'] as const) {
      const perked = rec({ mood });
      const half = ears.length / 2;
      const l0 = base[feetAt + 2];
      const l1 = perked[feetAt + 2];
      const r0 = base[feetAt + 2 + half];
      const r1 = perked[feetAt + 2 + half];
      const l = l0 && l1 ? fixedPoint(l0.m, l1.m) : null;
      const r = r0 && r1 ? fixedPoint(r0.m, r1.m) : null;
      if (l && r) {
        earPivots = [l, r];
        break;
      }
    }
    if (!earPivots) {
      const half = ears.length / 2;
      const lb = unionBounds(skia, ears.slice(0, half));
      const rb = unionBounds(skia, ears.slice(half));
      earPivots = [
        { x: lb.cx, y: lb.y1 },
        { x: rb.cx, y: rb.y1 },
      ];
    }
  }

  // Each moving part's share of the outline: the silhouette copies cut to its operations.
  const index = (ops: readonly Op[]) => ops.map((op) => base.indexOf(op) - outlineEnd);
  const moving = new Set<number>();
  // Where a part's outline and hard shadow can reach: its art, out by the outline's radius and the
  // shadow's offset (yap-sticker's `outline`: r = max(1.4, 3.2k), sh = max(2, 5k), k = w / 200).
  const k = spec.size / 200;
  const r = Math.max(1.4, 3.2 * k) + 3 * k + 1;
  const sh = Math.max(2, 5 * k);
  // Every silhouette copy is clipped to the critter's box, so no outline reaches past `whole`.
  const whole = outlineBox(spec.size, spec.size * 1.2);
  const boxOf = (ops: readonly Op[]): Box => {
    // Text (a confused `?`, a sleepy `z`) has no path to measure: the whole outline's box.
    if (ops.some((op) => !isPath(op))) return whole;
    const b = unionBounds(skia, ops);
    const x = Math.max(whole.x, Math.floor(b.x0 - r));
    const y = Math.max(whole.y, Math.floor(b.y0 - r));
    return {
      x,
      y,
      width: Math.min(whole.x + whole.width, Math.ceil(b.x1 + r + sh * 0.35)) - x,
      height: Math.min(whole.y + whole.height, Math.ceil(b.y1 + r + sh)) - y,
    };
  };
  const cutOutline = (ops: readonly Op[]): RigOutline => {
    const idx = index(ops);
    idx.forEach((i) => moving.add(i));
    return { ops: cutMasks(masks, sub, idx), box: boxOf(ops) };
  };
  const outline = {
    tail: hasTail ? cutOutline(base.slice(tailRun.from, tailRun.to)) : null,
    feet: [cutOutline(feet[0]), cutOutline(feet[1])] as const,
    ears: ears
      ? ([
          cutOutline(ears.slice(0, ears.length / 2)),
          cutOutline(ears.slice(ears.length / 2)),
        ] as const)
      : null,
    paws: [cutOutline(paws[0]), cutOutline(paws[1])] as const,
    // Whiskers and what sits on the head reach past the bean and slide with the face.
    nose: eyes && mFrom > browsAt + 2 ? cutOutline(base.slice(browsAt + 2, mFrom)) : null,
    top: mTo < base.length ? cutOutline(base.slice(mTo)) : null,
  };
  const rest = Array.from({ length: art }, (_, i) => i).filter((i) => !moving.has(i));

  return {
    width: spec.size,
    height: spec.size * 1.2,
    ground,
    outline: {
      body: {
        ops: cutMasks(masks, sub, rest),
        box: boxOf(rest.map((i) => base[outlineEnd + i]).filter((o): o is Op => o !== undefined)),
      },
      ...outline,
    },
    tail: hasTail ? base.slice(tailRun.from, tailRun.to) : null,
    feet,
    ears: ears ? [ears.slice(0, ears.length / 2), ears.slice(ears.length / 2)] : null,
    body: [bodyOp],
    belly: markingOps(isBelly),
    markings: markingOps((i) => !isBelly(i) && !clothes.has(i)),
    clothes: markingOps((i) => clothes.has(i)),
    bodyClip: bodyClip.path,
    late: base.slice(lateAt, strokeAt),
    stroke: base.slice(strokeAt, strokeAt + 1),
    paws,
    blush,
    eyes,
    brows,
    nose: eyes ? base.slice(browsAt + 2, mFrom) : [],
    mouths,
    top: base.slice(mTo),
    pivots: {
      ground: { x: spec.size / 2, y: bottom },
      shadow: ground.length ? centreOf(ground) : { x: spec.size / 2, y: bottom },
      head,
      tail: tailPivot,
      ears: earPivots,
      feet: [centreOf(feet[0]), centreOf(feet[1])],
      paws: [centreOf(paws[0]), centreOf(paws[1])],
    },
    unit,
    // The feet are drawn at the species' size: their transform's scale over the box's.
    scale: feet[0][0] ? Math.hypot(feet[0][0].m[0], feet[0][0].m[1]) / unit : 1,
  };
}

/**
 * The tilt a mood draws the critter at, in the generator's units (`o.tilt`): the turn between the
 * upright drawing and the mood's own, read from the first operation it moves (0 when none does).
 */
function moodTilt(upright: readonly Op[], own: readonly Op[]): number {
  if (upright.length !== own.length) return 0;
  for (let i = 0; i < upright.length; i++) {
    const a = upright[i];
    const b = own[i];
    if (!a || !b || a.key === b.key || a.kind !== 'path') continue;
    const inv = invert(a.m);
    if (!inv) continue;
    const [ra, rb] = multiply(b.m, inv);
    // The generator turns by tilt × π / 300 radians.
    return (Math.atan2(rb, ra) * 300) / Math.PI;
  }
  return 0;
}

/** The 24 silhouette copies, each cut to the art operations at `idx` (one shared list for all). */
function cutMasks(
  masks: readonly LayerOp[],
  sub: readonly Op[],
  idx: readonly number[],
): readonly Op[] {
  const fill = sub[sub.length - 1];
  if (!fill) return [];
  const ops = [...idx.map((i) => sub[i]).filter((o): o is Op => o !== undefined), fill];
  return masks.map((m) => ({ ...m, ops }));
}

/** Splits the eye run into two eyes, each cut into white, pupil, ring, lid and closed line. */
function cutEyes(
  skia: SkiaApi,
  spec: CritterSpec,
  rec: (o?: Record<string, unknown>) => readonly Op[],
  base: readonly Op[],
  blink: readonly Op[],
  run: { from: number; to: number; vTo: number },
): Pair<RigEye> {
  const looked = rec({ look: 4 });
  if (looked.length !== base.length) fail(spec, 'looking aside changes the drawing order');
  const moves = (i: number) => base[i]?.key !== looked[i]?.key;
  // Each eye ends with its ink ring: a stroke round the same outline as its white.
  const ends: number[] = [];
  let start = run.from;
  for (let i = run.from + 1; i < run.to; i++) {
    const op = base[i];
    if (isPath(op) && op.paint.style === PaintStyle.Stroke && sameBounds(skia, op, base[start])) {
      ends.push(i);
      start = i + 1;
    }
  }
  if (ends.length !== 2 || ends[1] !== run.to - 1) fail(spec, 'the eyes are not two rings');
  const lidded = rec({ pal: { lid: 1 } });
  const extra = (lidded.length - base.length) / 2;
  const closed = blink.slice(run.from, run.vTo);
  const half = closed.length / 2;
  const cut = (from: number, ring: number, side: 0 | 1): RigEye => {
    let p0 = from;
    while (p0 < ring && !moves(p0)) p0++;
    let p1 = p0;
    while (p1 < ring && moves(p1)) p1++;
    const pupilOps = base.slice(p0, p1);
    const clip = pupilOps[0]?.clips[pupilOps[0].clips.length - 1];
    if (!clip || p0 === p1) fail(spec, 'no pupil inside the eye');
    // With `pal.lid` the generator lowers its own lid: two operations before each ring.
    const at = ring + side * extra;
    const lid =
      extra > 0 && lidded[at + extra]?.body === base[ring]?.body
        ? lidded.slice(at, at + extra).map((op) => unclip(op, clip.key))
        : null;
    const white = base.slice(from, p0);
    const b = placedBounds(skia, white[0] as Op);
    if (!b) fail(spec, 'no eye white');
    return {
      white,
      pupil: pupilOps.map((op) => unclip(op, clip.key)),
      ring: base.slice(p1, ring + 1),
      lid,
      closed: closed.slice(side * half, side * half + half),
      clip: clip.path,
      centre: { x: b.x + b.width / 2, y: b.y + b.height / 2 },
      rx: b.width / 2,
      ry: b.height / 2,
    };
  };
  const [e0, e1] = ends as [number, number];
  return [cut(run.from, e0, 0), cut(e0 + 1, e1, 1)];
}
