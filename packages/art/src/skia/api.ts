import type { Skia } from '@shopify/react-native-skia';

/** React Native Skia's API object (`Skia`): on the phone, or over CanvasKit in Node. */
export type SkiaApi = typeof Skia;

/**
 * React Native Skia's enum values, passed as plain numbers so the drawing code never imports React
 * Native Skia's runtime (Node draws through its web build). A test checks them against React
 * Native Skia's own enums.
 */
export const PaintStyle = { Fill: 0, Stroke: 1 } as const;
export const StrokeCap = { Butt: 0, Round: 1, Square: 2 } as const;
export const StrokeJoin = { Miter: 0, Round: 1, Bevel: 2 } as const;
export const ClipOp = { Difference: 0, Intersect: 1 } as const;
export const FillType = { Winding: 0, EvenOdd: 1 } as const;
export const TileMode = { Clamp: 0 } as const;
export const FilterMode = { Nearest: 0, Linear: 1 } as const;
export const MipmapMode = { None: 0 } as const;
export const BlendMode = {
  Clear: 0,
  Src: 1,
  Dst: 2,
  SrcOver: 3,
  DstOver: 4,
  SrcIn: 5,
  DstIn: 6,
  SrcOut: 7,
  DstOut: 8,
  SrcATop: 9,
  DstATop: 10,
  Xor: 11,
  Plus: 12,
  Screen: 14,
  Overlay: 15,
  Darken: 16,
  Lighten: 17,
  Multiply: 24,
} as const;
export const ColorType = { RGBA_8888: 4 } as const;
export const AlphaType = { Premul: 2, Unpremul: 3 } as const;
export const ImageFormat = { PNG: 4 } as const;
