import { CanvasElementShim } from './canvas/context';
import { IDENTITY, type Mat } from './canvas/matrix';
import type { Op } from './canvas/ops';
import type { Prototype } from './runtime/prototype';
import type { SkiaApi } from './skia/api';

/** One generator call: `YapArt[fn](ctx, w, h, o)` on a `w` × `h` canvas. */
export interface ArtCall {
  fn: string;
  w: number;
  h: number;
  o: object;
}

/** What a generator call records, in its own units (`transform` places it, as the browser's would). */
export function recordArt(
  proto: Prototype,
  skia: SkiaApi,
  call: ArtCall,
  transform: Mat = IDENTITY,
  canvas: { width: number; height: number } = {
    width: Math.ceil(call.w),
    height: Math.ceil(call.h),
  },
): readonly Op[] {
  const el = new CanvasElementShim(skia, canvas.width, canvas.height, proto.mode);
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('no context');
  ctx.setTransform(...transform);
  proto.generator(call.fn)(ctx, call.w, call.h, call.o);
  return el.ops;
}

/** The burrow's and the town's light through the day (`afternoon` is the plain scene). */
export const TIMES_OF_DAY = ['morning', 'afternoon', 'evening', 'night', 'rain'] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

interface SceneDef {
  fn: string;
  /** A second layer drawn over the characters (the café's counter, the bus's dashboard). */
  front?: { fn: string; o?: object };
  /** The scene takes a time of day. */
  tod?: boolean;
  w?: number;
  h?: number;
  o?: object;
}

/**
 * The scenes the screens draw, as the prototype calls them: the burrow (`burrow2`, by time of
 * day), the first burrow of day one, the warm café with its counter in front, Bus 45 with its
 * dashboard, the town by time of day, the crisp office, the night window, the harbour, the
 * move-in street, the party square, confetti and the festival boat.
 */
export const SCENES = {
  burrow: { fn: 's_burrow2', tod: true },
  'burrow-day1': { fn: 's_burrowDay1' },
  cafe: { fn: 's_cafeWarm', front: { fn: 's_cafeFront' } },
  bus: { fn: 's_bus', front: { fn: 's_bus', o: { layer: 'front' } } },
  town: { fn: 's_townT', tod: true },
  lock: { fn: 's_town', w: 430, h: 884 },
  office: { fn: 's_officeCrisp', front: { fn: 's_office', o: { layer: 'front' } } },
  night: { fn: 's_night' },
  harbour: { fn: 's_harbour' },
  street: { fn: 's_street' },
  square: { fn: 's_square' },
  confetti: { fn: 's_confetti' },
  'festival-boat': { fn: 's_fboat', w: 300, h: 220 },
} as const satisfies Record<string, SceneDef>;

export type SceneName = keyof typeof SCENES;

export interface SceneOptions {
  timeOfDay?: TimeOfDay;
  /** `back` (default) draws behind the characters, `front` the layer over them. */
  layer?: 'back' | 'front';
  /** Passed to the generator as well (the harbour's `pierY` and `horizon`, the town's `vanX`). */
  extra?: object;
}

/** The generator call for a scene. Scenes are drawn at rest (`t = 0`). */
export function sceneCall(name: SceneName, opts: SceneOptions = {}): ArtCall | null {
  const def: SceneDef = SCENES[name];
  const w = def.w ?? 390;
  const h = def.h ?? 844;
  const tod =
    def.tod && opts.timeOfDay && opts.timeOfDay !== 'afternoon' ? { tod: opts.timeOfDay } : {};
  if (opts.layer === 'front') {
    if (!def.front) return null;
    return { fn: def.front.fn, w, h, o: { t: 0, ...def.front.o, ...opts.extra } };
  }
  return { fn: def.fn, w, h, o: { t: 0, ...def.o, ...tod, ...opts.extra } };
}

/** Burrow objects: the four word-object families at stages 0–2, the desk kinds, the seed packet. */
export const OBJECT_FAMILIES = ['jar', 'desk', 'plant', 'mail'] as const;
export const DESK_KINDS = ['mug', 'notes', 'stapler', 'headphones', 'sticker'] as const;
export type ObjectStage = 0 | 1 | 2;
export type BurrowObjectId =
  | `${(typeof OBJECT_FAMILIES)[number]}-${ObjectStage}`
  | `desk-${(typeof DESK_KINDS)[number]}-${ObjectStage}`
  | 'seed';

/** The generator call for a burrow object, by the id the renders use (`jar-1`, `desk-mug-2`, `seed`). */
export function objectCall(id: BurrowObjectId): ArtCall {
  const [fam = 'seed', a, b] = id.split('-');
  const o =
    fam === 'seed'
      ? { fam, stage: 0 }
      : b === undefined
        ? { fam, stage: Number(a) }
        : { fam, kind: a, stage: Number(b) };
  return { fn: 's_obj', w: 60, h: 80, o: { t: 0, ...o } };
}
