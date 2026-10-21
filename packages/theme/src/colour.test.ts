import { describe, expect, it } from 'vitest';

import { colours, palette, translucent, withAlpha } from './colour';
import { brandBoard, first, readDesign, rgba, week1 } from './test/design';

const prototype = readDesign(week1);
const brand = readDesign(brandBoard);

const hexes = (text: string) =>
  [...text.matchAll(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g)].map((m) => {
    const [r, g, b] = rgba(m[0]);
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  });

const camel = (name: string) =>
  name.toLowerCase().replace(/ ([a-z])/g, (_m, letter: string) => letter.toUpperCase());

/** Colours of the prototype page that are not the app: the canvas, its link hover, the mock island. */
const notTheApp = new Set(['#EDE8F2', '#7A3B86', '#000000']);

describe('the palette', () => {
  it('names every brand-sheet colour token as the sheet does, with its value', () => {
    const table = first(brand, /tokens:(\[\[[\s\S]*?\]\])\.map/);
    const tokens = [...table.matchAll(/\['([^']+)','(#[0-9A-F]{6})','[^']*'\]/g)].map((m) => [
      camel(m[1] ?? ''),
      m[2],
    ]);
    expect(tokens).toHaveLength(12);
    for (const [name, value] of tokens)
      expect(palette[name as keyof typeof palette], name).toBe(value);
  });

  it('has every solid colour the first-week screens use', () => {
    const values = new Set<string>(Object.values(palette));
    const missing = [...new Set(hexes(prototype))].filter(
      (c) => !values.has(c) && !notTheApp.has(c),
    );
    expect(missing).toEqual([]);
  });

  it('invents no colour: each one is in the prototype or the brand sheet', () => {
    const used = new Set([...hexes(prototype), ...hexes(brand)]);
    const invented = Object.entries(palette).filter(([, v]) => !used.has(v));
    expect(invented).toEqual([]);
  });
});

describe('translucent colours', () => {
  const rgbas = [...prototype.matchAll(/rgba\([^)]*\)/g)].map((m) => rgba(m[0]).join(','));

  it('are each written in the prototype', () => {
    for (const [name, value] of Object.entries(translucent))
      expect(rgbas, name).toContain(rgba(value).join(','));
  });
});

describe('colour roles', () => {
  it('take every value from the palette or the translucent set', () => {
    const known = new Set<string>([...Object.values(palette), ...Object.values(translucent)]);
    expect(Object.entries(colours).filter(([, v]) => !known.has(v))).toEqual([]);
  });

  it('put ink text on the paper background with the lilac accent', () => {
    expect(colours.text).toBe('#17131C');
    expect(colours.background).toBe('#FBFAFD');
    expect(colours.accent).toBe('#EFA3F4');
    expect(colours.success).toBe('#5FD98A');
    expect(colours.textMuted).toBe('#5D5366');
  });
});

describe('withAlpha', () => {
  it('writes a palette colour as rgba', () => {
    expect(withAlpha(palette.lilac, 0.45)).toBe('rgba(239,163,244,0.45)');
    expect(rgba(withAlpha(palette.ink, 0.55))).toEqual(rgba(translucent.scrim));
  });
});
