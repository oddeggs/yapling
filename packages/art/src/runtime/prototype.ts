import { CanvasElementShim, type Context2DShim, type OffscreenMode } from '../canvas/context';
import { DOMMatrixShim } from '../canvas/matrix';
import { Path2DShim } from '../canvas/path';
import { SCRIPTS } from '../generated/index.generated';
import type { SkiaApi } from '../skia/api';
import type { PrototypeGlobals } from './globals';

/** A generator: `YapArt[fn](ctx, w, h, o)`. */
export type Generator = (ctx: Context2DShim, w: number, h: number, o: object) => void;

/** `window.YapArt` once the six generator scripts have booted. */
export interface YapArt {
  readonly MOODS: readonly string[];
  readonly SPECIES: Readonly<Record<string, string>>;
  readonly [fn: string]: unknown;
}

/** The prototype's `window.YapDC(React)` helpers this package uses. */
export interface YapDc {
  readonly mouthFor: (text: string, index: number) => string;
  readonly blinkers: (tick: number) => { b1: boolean; b2: boolean; b3: boolean };
}

export interface Prototype {
  readonly art: YapArt;
  /** How canvases drawn onto canvases are replayed (see `OffscreenMode`). */
  readonly mode: OffscreenMode;
  /** The shared helpers of `yap-dc.js` (the viseme mapping and the blink rhythm). */
  readonly dc: YapDc;
  readonly window: Record<string, unknown>;
  generator(fn: string): Generator;
}

const noop = () => {};

/** Enough of React for `window.YapDC(React)` to define its helpers (they are not rendered here). */
const ReactStub = { createElement: () => null, Component: class {} };

/**
 * Runs the prototype's scripts (as synced into `generated/`) against stand-ins for the browser:
 * a `Path2D` and canvases that record onto Skia. Each call gives a fresh, independent prototype.
 * `globals` replaces any of the stand-ins (the lipsync tests drive the voice engine's clock).
 */
export function loadPrototype(
  skia: SkiaApi,
  globals: Partial<PrototypeGlobals> = {},
  mode: OffscreenMode = 'vector',
): Prototype {
  const window: Record<string, unknown> = {};
  class Path2D extends Path2DShim {
    constructor(init?: string | Path2DShim) {
      super(skia, init);
    }
  }
  const document: PrototypeGlobals['document'] = {
    createElement: (tag) =>
      tag.toLowerCase() === 'canvas'
        ? new CanvasElementShim(skia, 300, 150, mode)
        : { tagName: tag },
    getElementById: () => null,
    head: { appendChild: noop },
  };
  let waits = 0;
  const g: PrototypeGlobals = {
    window,
    document,
    Path2D,
    DOMMatrix: DOMMatrixShim,
    // A generator's boot only waits when the one it builds on has not run yet; the scripts run in
    // order here, so a wait means the load order is wrong.
    setTimeout: () => {
      waits++;
      return 0;
    },
    clearTimeout: noop,
    performance: { now: () => 0 },
    fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve(null) }),
    Audio: undefined,
    speechSynthesis: undefined,
    SpeechSynthesisUtterance: undefined,
    ...globals,
  };
  for (const s of SCRIPTS) s.load(g);
  const art = window['YapArt'] as YapArt | undefined;
  if (!art?.['r6'] || waits) {
    throw new Error('@yapling/art: the prototype generators did not boot in order');
  }
  const makeDc = window['YapDC'] as ((react: unknown) => YapDc) | undefined;
  if (!makeDc) throw new Error('@yapling/art: yap-dc.js did not define YapDC');
  const dc = makeDc(ReactStub);
  return {
    art,
    mode,
    dc,
    window,
    generator(fn) {
      const f = art[fn];
      if (typeof f !== 'function') throw new Error(`@yapling/art: no generator YapArt.${fn}`);
      return f as Generator;
    },
  };
}
