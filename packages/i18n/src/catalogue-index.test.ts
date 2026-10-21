import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  catalogueIndexSource,
  exportStem,
  findCatalogueFiles,
  generatedFileName,
  languageSuffix,
  sourceDir,
} from '../scripts/catalogue-index';

const folders: string[] = [];

function folderWith(files: Readonly<Record<string, string>>): string {
  const dir = mkdtempSync(join(tmpdir(), 'yapling-i18n-'));
  folders.push(dir);
  for (const [name, source] of Object.entries(files)) writeFileSync(join(dir, name), source);
  return dir;
}

afterEach(() => {
  for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('the generated index', () => {
  it('is up to date with the catalogue files (run `pnpm --filter @yapling/i18n gen`)', () => {
    const dir = sourceDir();
    expect(readFileSync(join(dir, generatedFileName), 'utf8')).toBe(
      catalogueIndexSource(findCatalogueFiles(dir)),
    );
  });

  it('is reached only through code that runs in every bundler (no Node or React)', () => {
    const dir = sourceDir();
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts')))
      expect(readFileSync(join(dir, name), 'utf8'), name).not.toMatch(
        /from '(node:|react)|\bprocess\.|\bBuffer\b|\brequire\(/,
      );
  });
});

describe('findCatalogueFiles', () => {
  it('finds features with a file in every shipped language, sorted', () => {
    const dir = folderWith({
      'lobby-share.en.ts': 'export const lobbyShareEn = {};',
      'lobby-share.fr.ts': 'export const lobbyShareFr = {};',
      'shop.en.ts': 'export const shopEn = {};',
      'shop.fr.ts': 'export const shopFr = {};',
      'shop.test.ts': '',
      'translate.ts': '',
    });
    expect(findCatalogueFiles(dir, ['en', 'fr'])).toEqual([
      { file: 'lobby-share', name: 'lobbyShare' },
      { file: 'shop', name: 'shop' },
    ]);
  });

  it('refuses a feature missing a language', () => {
    const dir = folderWith({ 'shop.en.ts': 'export const shopEn = {};' });
    expect(() => findCatalogueFiles(dir, ['en', 'fr'])).toThrow('shop.en.ts has no shop.fr.ts');
  });

  it('refuses a file that does not export the expected name', () => {
    const dir = folderWith({ 'shop.en.ts': 'export const en = {};' });
    expect(() => findCatalogueFiles(dir, ['en'])).toThrow('shop.en.ts must export const shopEn');
  });

  it('refuses a file name that is not kebab-case', () => {
    const dir = folderWith({ 'lobbyShare.en.ts': '' });
    expect(() => findCatalogueFiles(dir, ['en'])).toThrow('kebab-case');
  });
});

describe('catalogueIndexSource', () => {
  it('imports every language of every feature and merges each language', () => {
    const source = catalogueIndexSource(
      [{ file: 'lobby-share', name: 'lobbyShare' }],
      ['en', 'pt-br'],
    );
    expect(source).toContain("import { lobbyShareEn } from './lobby-share.en';");
    expect(source).toContain("import { lobbySharePtBr } from './lobby-share.pt-br';");
    expect(source).toContain('export const en = {\n  ...lobbyShareEn,\n};');
    expect(source).toContain('export const ptBr = {\n  ...lobbySharePtBr,\n};');
    expect(source).toContain("export const catalogues = { en, 'pt-br': ptBr };");
  });

  it('names kebab-case files and languages in camelCase', () => {
    expect(exportStem('unsend-race')).toBe('unsendRace');
    expect(languageSuffix('en')).toBe('En');
    expect(languageSuffix('pt-br')).toBe('PtBr');
  });
});
