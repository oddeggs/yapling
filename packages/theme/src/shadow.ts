/**
 * Shadows and glass. The house look has two materials: stickers (ink-outlined shapes on a flat,
 * unblurred ink copy offset straight down, sometimes down and right when the sticker is tilted)
 * and glass (white frosted panels with a bright top edge and a soft plum shadow). `css` strings
 * are what React Native's `boxShadow` takes; glass blur goes to `expo-blur`.
 */
import { palette } from './colour';

/** One `box-shadow` layer, in points. */
export interface ShadowLayer {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly colour: string;
  readonly inset?: boolean;
}

/** The layers as a CSS `box-shadow` string (React Native's `boxShadow`). */
export function shadowCss(layers: readonly ShadowLayer[]): string {
  return layers
    .map(
      (l) =>
        `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px${l.spread ? ` ${l.spread}px` : ''} ${l.colour}`,
    )
    .join(', ');
}

/** A sticker's flat shadow: the shape again, `x` right and `y` down, unblurred. */
export interface StickerShadow {
  readonly x: number;
  readonly y: number;
  readonly colour: string;
}

const flat = (y: number, x = 0, colour: string = palette.ink): StickerShadow => ({ x, y, colour });

/** A sticker shadow as a CSS `box-shadow` string. */
export function stickerCss(shadow: StickerShadow): string {
  const px = (n: number) => (n === 0 ? '0' : `${n}px`);
  return `${px(shadow.x)} ${px(shadow.y)} 0 ${shadow.colour}`;
}

/** The sticker shadows the screens use, by what wears them. */
export const stickerShadows = {
  /** Season-map pins and label chips. */
  chip: flat(3),
  /** Buttons, speech bubbles, the roommate's name tiles, the fix row. */
  button: flat(4),
  /** The week's phrase sheet, toasts. */
  sheet: flat(5),
  /** Cards: the fluency mirror, the rent letter, the keepsake frame. */
  card: flat(6),
  /** The postcard and the voicemail. */
  paper: flat(7),
  /** The dusk window. */
  window: flat(8),
  /** A tilted badge: the correction badges, "You fixed it", the new leaf. */
  badge: flat(5, 3),
  /** The tilted residency card. */
  tiltedCard: flat(7, 5),
  /** A dark card on a lilac lip (the episode peek). */
  onInk: flat(6, 0, palette.lilac),
  /** The purchase button: ink on a lilac lip. */
  purchase: flat(4, 0, palette.lilac),
} as const satisfies Record<string, StickerShadow>;

/** The ink outline widths stickers wear, in points. */
export const outline = {
  /** Small dots, tags, tiny face circles. */
  thin: 2,
  /** Cards, bubbles, rows, chips. */
  regular: 2.5,
  /** Buttons, badges, paper. */
  bold: 3,
  /** The residency card and the keepsake frame. */
  heavy: 3.5,
  /** The dusk window's frame. */
  frame: 6,
} as const;

/**
 * The art's stickers, as `design/prototype/art/yap-sticker.js` paints them: a 3-point ink stroke
 * over a flat ink copy offset `depth` down and `depth × slant` right.
 */
export const artSticker = { strokeWidth: 3, depth: 4, slant: 0.35 } as const;

/** A glass material: a frosted fill over a blurred backdrop, an edge and its shadows. */
export interface Glass {
  readonly fill: string;
  /** Backdrop blur radius in points. */
  readonly blur: number;
  /** Backdrop saturation multiplier (1 for none). */
  readonly saturate: number;
  readonly border: { readonly width: number; readonly colour: string } | null;
  readonly shadow: readonly ShadowLayer[];
}

const topEdge = (colour: string = palette.white, y = 1.5): ShadowLayer => ({
  x: 0,
  y,
  blur: 0,
  spread: 0,
  colour,
  inset: true,
});

const plum = (y: number, blur: number, alpha: number): ShadowLayer => ({
  x: 0,
  y,
  blur,
  spread: 0,
  colour: `rgba(46,20,70,${alpha})`,
});

/** The glass the screens use. */
export const glass = {
  /** Sheets, the call bar, the top pill, list rows on a scene: white 60 %, blur 24, saturate 180 %. */
  panel: {
    fill: 'rgba(255,255,255,0.6)',
    blur: 24,
    saturate: 1.8,
    border: { width: 1, colour: 'rgba(255,255,255,0.9)' },
    shadow: [topEdge(), plum(12, 30, 0.16)],
  },
  /** The back button. */
  button: {
    fill: 'rgba(255,255,255,0.62)',
    blur: 20,
    saturate: 1.8,
    border: { width: 1, colour: 'rgba(255,255,255,0.9)' },
    shadow: [topEdge(), plum(6, 16, 0.14)],
  },
  /** The hint card. */
  hint: {
    fill: 'rgba(255,255,255,0.88)',
    blur: 22,
    saturate: 1,
    border: { width: 1, colour: 'rgba(255,255,255,0.95)' },
    shadow: [plum(8, 22, 0.14)],
  },
  /** A notification on the lock screen. */
  notification: {
    fill: 'rgba(255,255,255,0.28)',
    blur: 26,
    saturate: 1.6,
    border: { width: 1, colour: 'rgba(255,255,255,0.45)' },
    shadow: [
      topEdge('rgba(255,255,255,0.6)', 1),
      { x: 0, y: 12, blur: 30, spread: 0, colour: 'rgba(0,0,0,0.22)' },
    ],
  },
  /** The lock screen's torch and camera buttons. */
  lockButton: {
    fill: 'rgba(255,255,255,0.22)',
    blur: 16,
    saturate: 1,
    border: null,
    shadow: [],
  },
  /** The wordmark's backing over the splash harbour. */
  harbourTag: {
    fill: 'rgba(228,247,254,0.82)',
    blur: 6,
    saturate: 1,
    border: null,
    shadow: [],
  },
  /** The brand sheet's floating nav bar: white 45 % and a second, lower inner edge. */
  navBar: {
    fill: 'rgba(255,255,255,0.45)',
    blur: 24,
    saturate: 1.8,
    border: { width: 1, colour: 'rgba(255,255,255,0.85)' },
    shadow: [
      topEdge('rgba(255,255,255,0.95)'),
      { x: 0, y: -1, blur: 1, spread: 0, colour: 'rgba(255,255,255,0.4)', inset: true },
      plum(12, 32, 0.18),
    ],
  },
} as const satisfies Record<string, Glass>;

/** Soft shadows on things that float without glass: the learner's caption bubble. */
export const softShadows = {
  floating: [plum(8, 22, 0.14)],
} as const satisfies Record<string, readonly ShadowLayer[]>;
