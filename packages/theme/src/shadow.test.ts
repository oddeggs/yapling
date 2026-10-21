import { describe, expect, it } from 'vitest';

import { splitTop } from '../scripts/css';
import {
  artSticker,
  glass,
  outline,
  shadowCss,
  softShadows,
  stickerCss,
  stickerShadows,
  type Glass,
  type ShadowLayer,
} from './shadow';
import { allStyles, brandBoard, decl, phoneStyles, readDesign, rgba, week1 } from './test/design';

const styles = phoneStyles(week1).filter((s) => !/statusC|background:#000/.test(s));

/** A `box-shadow` as layers, colours compared by value. */
function layers(css: string): string[] {
  return splitTop(css, ',').map((layer) => {
    const inset = layer.startsWith('inset ');
    const parts = splitTop(layer.replace(/^inset /, ''), ' ');
    const colour = rgba(parts.pop() ?? '').join(',');
    const [x = 0, y = 0, blur = 0, spread = 0] = parts.map(parseFloat);
    return [inset ? 'inset' : '', x, y, blur, spread, colour].join(' ');
  });
}

const tokenLayers = (shadow: readonly ShadowLayer[]) => layers(shadowCss(shadow));

const glassOf = (style: string) => {
  const fill = rgba(decl(style, 'background') ?? '').join(',');
  const filter = decl(style, 'backdrop-filter') ?? '';
  const blur = Number(/blur\(([\d.]+)px\)/.exec(filter)?.[1]);
  const saturate = Number(/saturate\(([\d.]+)\)/.exec(filter)?.[1] ?? 1);
  return { fill, blur, saturate };
};

const matches = (g: Glass, style: string) => {
  const s = glassOf(style);
  if (rgba(g.fill).join(',') !== s.fill || g.blur !== s.blur || g.saturate !== s.saturate)
    return false;
  const border = decl(style, 'border');
  if (border !== undefined && border !== 'none') {
    const [width, , colour = ''] = splitTop(border, ' ');
    if (
      !g.border ||
      g.border.width !== parseFloat(width ?? '') ||
      rgba(colour).join() !== rgba(g.border.colour).join()
    )
      return false;
  }
  const shadow = decl(style, 'box-shadow');
  if (shadow !== undefined && layers(shadow).join('|') !== tokenLayers(g.shadow).join('|'))
    return false;
  return true;
};

describe('sticker shadows', () => {
  const flat = styles.flatMap((s) => {
    const shadow = decl(s, 'box-shadow');
    return shadow && /^[\d.]+(px)? [\d.]+px 0 #[0-9A-Fa-f]{6}$/.test(shadow) ? [shadow] : [];
  });

  it('cover every flat offset shadow on the screens, and each is used', () => {
    const tokens = Object.values(stickerShadows).map(stickerCss);
    const brand = allStyles(brandBoard).map((s) => decl(s, 'box-shadow') ?? '');
    expect([...new Set(flat)].filter((s) => !tokens.includes(s))).toEqual([]);
    expect(tokens.filter((t) => !flat.includes(t) && !brand.includes(t))).toEqual([]);
  });

  it('match the art sticker: a 3-point stroke over a copy 4 down and 0.35 × 4 right', () => {
    const sticker = readDesign('art/yap-sticker.js');
    expect(sticker).toContain('const lw=o.lw!=null?o.lw:3, sh=o.sh!=null?o.sh:4');
    expect(sticker).toContain('ctx.translate(sh*0.35,sh)');
    expect(artSticker).toEqual({ strokeWidth: 3, depth: 4, slant: 0.35 });
  });
});

describe('outlines', () => {
  it('cover every ink outline width on the screens, and each is used', () => {
    const widths = new Set(
      styles.flatMap((s) => {
        const m = /^([\d.]+)px (solid|dashed) #17131C$/.exec(decl(s, 'border') ?? '');
        return m ? [Number(m[1])] : [];
      }),
    );
    expect([...widths].sort()).toEqual(Object.values(outline).sort());
  });
});

describe('glass', () => {
  it('describes every frosted surface on the screens', () => {
    const frosted = styles.filter((s) => decl(s, 'backdrop-filter') !== undefined);
    expect(frosted.length).toBeGreaterThanOrEqual(20);
    const tokens = Object.values(glass);
    expect(frosted.filter((s) => !tokens.some((g) => matches(g, s)))).toEqual([]);
  });

  it('uses each glass on the screens or the brand sheet', () => {
    const all = [...styles, ...allStyles(brandBoard)].filter(
      (s) => decl(s, 'backdrop-filter') !== undefined,
    );
    for (const [name, g] of Object.entries(glass))
      expect(
        all.some((s) => matches(g, s)),
        name,
      ).toBe(true);
  });

  it('writes the panel as the brand sheet describes glass: blur 24, saturate 180 %', () => {
    expect(readDesign(brandBoard)).toContain('blur 24 · saturate 180% · inner highlight');
    expect(shadowCss(glass.panel.shadow)).toBe(
      'inset 0px 1.5px 0px #FFFFFF, 0px 12px 30px rgba(46,20,70,0.16)',
    );
  });
});

describe('soft shadows', () => {
  it('match the floating caption and hint', () => {
    const floating = tokenLayers(softShadows.floating).join('|');
    expect(
      styles.filter(
        (s) =>
          decl(s, 'box-shadow') &&
          !s.includes('{{') &&
          layers(decl(s, 'box-shadow') ?? '').join('|') === floating,
      ),
    ).toHaveLength(2);
  });
});
