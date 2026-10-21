import type {
  SkCanvas,
  SkPaint,
  SkParagraph,
  SkTextFontVariations,
  SkTypefaceFontProvider,
} from '@shopify/react-native-skia';

import type { SkiaApi } from '../skia/api';
import type { TextDrawer, TextOp } from './ops';

/** A CSS `font` shorthand, as far as the generators write it (`900 38px ui-rounded, Nunito, sans-serif`). */
export interface FontSpec {
  weight: number;
  size: number;
  families: string[];
}

const WEIGHTS: Record<string, number> = { normal: 400, bold: 700, bolder: 700, lighter: 300 };

export function parseFont(font: string): FontSpec {
  const m = /^\s*(.*?)\s*(\d+(?:\.\d+)?)px(?:\s*\/\s*\S+)?\s+(.+)$/.exec(font);
  if (!m) return { weight: 400, size: 10, families: ['sans-serif'] };
  const [, pre = '', size = '10', fams = 'sans-serif'] = m;
  let weight = 400;
  for (const t of pre.split(/\s+/)) {
    if (/^\d+$/.test(t)) weight = Number(t);
    else if (t in WEIGHTS) weight = WEIGHTS[t] ?? 400;
  }
  const families = fams
    .split(',')
    .map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
  return { weight, size: Number(size), families };
}

/** How a CSS family name maps onto the fonts the renderer holds. */
export interface FontFamilies {
  provider: SkTypefaceFontProvider;
  /** Families the provider holds, by CSS name (`Lexend`, `ui-rounded`). */
  families: Record<string, { family: string; variable?: boolean }>;
  /** The family to use when none of the CSS list is held. */
  fallback: string;
}

/**
 * Draws `fillText` with Skia's paragraph shaper (kerning and fallback as the browser shapes text),
 * placed on the alphabetic baseline at the canvas's `textAlign`. Paragraphs are laid out once per
 * distinct text and font.
 */
export class ParagraphText implements TextDrawer {
  private readonly laid = new Map<string, { p: SkParagraph; width: number; baseline: number }>();

  constructor(
    readonly skia: SkiaApi,
    readonly fonts: FontFamilies,
  ) {}

  private resolve(spec: FontSpec): { family: string; variations?: SkTextFontVariations[] } {
    for (const name of spec.families) {
      const f = this.fonts.families[name];
      if (f) {
        return f.variable
          ? { family: f.family, variations: [{ axis: 'wght', value: spec.weight }] }
          : { family: f.family };
      }
    }
    return { family: this.fonts.fallback };
  }

  draw(canvas: SkCanvas, op: TextOp, paint: SkPaint, paintKey: string): void {
    const key = `${op.text}|${op.font}|${paintKey}`;
    let hit = this.laid.get(key);
    if (!hit) {
      const spec = parseFont(op.font);
      const { family, variations } = this.resolve(spec);
      const b = this.skia.ParagraphBuilder.Make({}, this.fonts.provider);
      b.pushStyle(
        {
          fontFamilies: [family],
          fontSize: spec.size,
          fontStyle: { weight: spec.weight },
          ...(variations ? { fontVariations: variations } : {}),
        },
        paint,
      );
      b.addText(op.text);
      const p = b.build();
      p.layout(1e6);
      const width = p.getMaxIntrinsicWidth();
      const baseline = p.getLineMetrics()[0]?.baseline ?? spec.size * 0.8;
      hit = { p, width, baseline };
      this.laid.set(key, hit);
    }
    const shift =
      op.align === 'center'
        ? hit.width / 2
        : op.align === 'right' || op.align === 'end'
          ? hit.width
          : 0;
    hit.p.paint(canvas, op.x - shift, op.y - hit.baseline);
  }
}
