import { describe, expect, it } from 'vitest';

import { allStyles, brandBoard, decl, phoneStyles, readDesign, week1 } from './test/design';
import { fontFaces, fontFamily, fontFor, inkOverflowTop, type, type TypeStyle } from './type';

/** One text style as the prototype writes it, in the shape of a type style. */
function styleKey(style: string): string | null {
  let size = decl(style, 'font-size');
  let weight = decl(style, 'font-weight');
  const font = decl(style, 'font');
  if (font) {
    const m = /^(\d+) ([\d.]+px)/.exec(font);
    weight = m?.[1];
    size = m?.[2];
  }
  if (size === undefined) return null;
  const hand = /Kithfield Hand/.test(style);
  const tracking = parseFloat(decl(style, 'letter-spacing') ?? '0');
  const lineHeight = decl(style, 'line-height');
  return [
    hand ? 'hand' : 'lexend',
    parseFloat(size),
    hand ? 700 : Number(weight),
    tracking,
    lineHeight === undefined ? 'null' : Number(lineHeight),
    decl(style, 'text-transform') === 'uppercase',
  ].join(' ');
}

const key = (s: TypeStyle) =>
  [s.face, s.size, s.weight, s.tracking, s.lineHeight ?? 'null', s.uppercase].join(' ');

describe('type styles', () => {
  const written = new Set(
    [...phoneStyles(week1), ...allStyles(brandBoard)].flatMap((s) => styleKey(s) ?? []),
  );

  it('are each set somewhere in the prototype or the brand sheet', () => {
    const missing = Object.entries(type).filter(([, s]) => !written.has(key(s)));
    expect(missing.map(([name]) => name)).toEqual([]);
  });

  it('use only the weights the prototype loads', () => {
    const prototype = readDesign(week1);
    expect(prototype).toContain('family=Lexend:wght@500;600;700;800;900');
    expect(Object.keys(fontFamily.lexend)).toEqual(['500', '600', '700', '800', '900']);
    for (const s of Object.values(type))
      expect(Object.keys(fontFamily.lexend)).toContain(String(s.weight));
  });

  it('load Kithfield Hand Bold from the prototype font file', () => {
    expect(readDesign(week1)).toContain(
      "@font-face{font-family:'Kithfield Hand';src:url('./fonts/KithfieldHand-Bold.ttf')",
    );
    expect(fontFamily.hand).toBe('KithfieldHand-Bold');
  });
});

describe('fontFor', () => {
  it('picks the embedded cut and converts em to points', () => {
    expect(fontFor('button')).toEqual({
      fontFamily: 'Lexend-ExtraBold',
      fontSize: 17,
      letterSpacing: 0,
    });
    expect(fontFor('wordmark')).toEqual({
      fontFamily: 'Lexend-Black',
      fontSize: 70,
      lineHeight: 73.5,
      letterSpacing: -4.55,
    });
    expect(fontFor('gloss')).toEqual({
      fontFamily: 'KithfieldHand-Bold',
      fontSize: 18,
      lineHeight: 20.7,
      letterSpacing: 0,
    });
    expect(fontFor('label').textTransform).toBe('uppercase');
  });

  it('names a file for every face it can set', () => {
    const files = fontFaces.map((f) => f.name);
    for (const s of Object.values(type)) expect(files).toContain(fontFor(s).fontFamily);
  });
});

describe('inkOverflowTop', () => {
  it('leaves room above tight lines for stacked Vietnamese marks', () => {
    // 40 pt at 0.95: the box is 38 tall, the baseline 28 down, a capital with marks reaches 45.
    expect(inkOverflowTop('screenTitle')).toBe(18);
    // At the face's own height Lexend's marks still reach 0.127 em above the ascent.
    expect(inkOverflowTop('button')).toBe(3);
    // Kithfield Hand's line gap leaves room: nothing pokes out.
    expect(inkOverflowTop('handNote')).toBe(0);
  });
});
