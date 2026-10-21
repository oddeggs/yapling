import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fontFaces, fontMetrics, type FontName } from '@yapling/theme';
import { describe, expect, it } from 'vitest';

import { missingCharacters, readFont, type FontInfo } from './sfnt';
import { fontSources, licenceSources } from './sources';
import { appFontsDir, filesDir, verify, verifyApp, verifyDesign } from './verify';

/** The app embeds its own copies; they are byte-identical to the sources (checked below). */
const info = new Map<string, FontInfo>(
  fontSources.map((s) => [
    s.name,
    readFont(new Uint8Array(readFileSync(join(appFontsDir, s.file)))),
  ]),
);
const fontInfo = (name: FontName): FontInfo => {
  const i = info.get(name);
  if (!i) throw new Error(`no file for ${name}`);
  return i;
};

/** Chrome the app writes in Vietnamese, the stacked marks at their tallest, and the punctuation. */
const vietnamese = [
  'Ngôn ngữ đầu tiên của bạn',
  'Chờ chút',
  'Nâng cấp lên Plus',
  'Không phải bây giờ',
  'Thứ Năm, 24 tháng 9 · Tuần đầu tiên là quà của tụi mình',
  'ẲẴẶẤẦẨẪẬỔỖỘỐỒỚỜỞỠỢỨỪỬỮỰẾỀỂỄỆĐđ',
  'aàảãáạăằẳẵắặâầẩẫấậeèẻẽéẹêềểễếệiìỉĩíịoòỏõóọôồổỗốộơờởỡớợuùủũúụưừửữứựyỳỷỹýỵ',
].join(' ');
const punctuation = '“”‘’…–·?!,.:;()/%*~';

const vietnameseLetters = [...new Set(vietnamese.replace(/[^\p{L}]/gu, ''))];

describe('embedded font files', () => {
  it('are exactly the pinned files, the licence beside them and the design’s Kithfield Hand', () => {
    expect(verify()).toEqual([]);
    expect(verifyDesign()).toEqual([]);
  });

  it('are copied unchanged into the app, which embeds nothing else', () => {
    expect(verifyApp()).toEqual([]);
  });

  it('are each embedded by the app’s expo-font plugin', () => {
    const config = readFileSync(join(appFontsDir, '../../app.config.ts'), 'utf8');
    const list = /export const FONT_FILES = \[([^\]]*)\]/.exec(config)?.[1] ?? '';
    const files = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(files.sort()).toEqual(fontFaces.map((f) => f.file).sort());
    expect(config).toContain(
      "['expo-font', { fonts: FONT_FILES.map((file) => `./assets/fonts/${file}`) }]",
    );
  });

  it('give every theme face a file, registered under the name the theme uses', () => {
    expect(fontSources.map((s) => s.name).sort()).toEqual(fontFaces.map((f) => f.name).sort());
    for (const face of fontFaces) {
      const font = fontInfo(face.name);
      expect(font.postScriptName).toBe(face.name);
      expect(font.family).toBe(face.family);
      expect(font.weight).toBe(face.weight);
      expect(font.variable).toBe(false);
      expect(face.file).toBe(`${face.name}.ttf`);
    }
  });

  it('ship Lexend’s SIL Open Font License', () => {
    const licence = readFileSync(join(filesDir, licenceSources[0]?.file ?? ''), 'utf8');
    expect(licence).toContain('SIL Open Font License, Version 1.1');
    expect(licence).toContain('The Lexend Project Authors');
  });
});

describe('Vietnamese', () => {
  it('is covered by every cut of both faces', () => {
    for (const face of fontFaces)
      expect(missingCharacters(fontInfo(face.name), vietnamese), face.name).toEqual([]);
  });

  it('has its punctuation in Lexend; Kithfield Hand lacks the ellipsis and the en dash', () => {
    for (const face of fontFaces.filter((f) => f.family === 'Lexend'))
      expect(missingCharacters(fontInfo(face.name), punctuation), face.name).toEqual([]);
    // Hand-written copy with "…" (hints, "Lan can now…") falls back to the system face there.
    expect(missingCharacters(fontInfo('KithfieldHand-Bold'), punctuation)).toEqual(['…', '–']);
  });

  it('fails a font that lacks a glyph', () => {
    expect(missingCharacters(fontInfo('Lexend-Bold'), 'Chờ ✓')).toEqual(['✓']);
  });
});

describe('vertical metrics', () => {
  it('match the theme: the line box and the tallest Vietnamese letter', () => {
    for (const face of fontFaces) {
      const font = fontInfo(face.name);
      const metrics = face.family === 'Lexend' ? fontMetrics.lexend : fontMetrics.hand;
      expect(font.ascent / font.unitsPerEm, face.name).toBe(metrics.ascent);
      expect(-font.descent / font.unitsPerEm, face.name).toBe(metrics.descent);
    }
    const tallest = (family: FontInfo[]) =>
      Math.max(
        ...family.flatMap((font) =>
          vietnameseLetters.map((ch) =>
            font.glyphTop(font.glyphs.get(ch.codePointAt(0) ?? 0) ?? 0),
          ),
        ),
      ) / 1000;
    const lexend = fontFaces.filter((f) => f.family === 'Lexend').map((f) => fontInfo(f.name));
    expect(tallest(lexend)).toBe(fontMetrics.lexend.inkTop);
    expect(tallest([fontInfo('KithfieldHand-Bold')])).toBe(fontMetrics.hand.inkTop);
  });
});
