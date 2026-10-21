import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { readFont } from './sfnt';
import { downloadedSources, fontSources, type Source } from './sources';

/** Where the fonts and the licence live. */
export const filesDir = join(import.meta.dirname, '../files');

/** Where the app embeds the fonts from (the `expo-font` plugin in `apps/mobile/app.config.ts`). */
export const appFontsDir = join(import.meta.dirname, '../../../apps/mobile/assets/fonts');

/** The design prototype, for fonts it ships. */
export const designDir = join(import.meta.dirname, '../../../design/prototype');

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** What is wrong with one downloaded or committed file, or null when it is the expected file. */
export function problemWith(source: Source, bytes: Uint8Array): string | null {
  const hash = sha256(bytes);
  if (hash !== source.sha256) return `${source.file}: SHA-256 ${hash}, expected ${source.sha256}`;
  const font = fontSources.find((f) => f.file === source.file);
  if (!font) return null;
  const info = readFont(bytes);
  if (info.postScriptName !== font.name)
    return `${source.file}: PostScript name ${info.postScriptName}, expected ${font.name}`;
  if (info.variable) return `${source.file}: a variable font, expected a static cut`;
  return null;
}

/** Every problem with the committed files: missing, changed, or not one of the sources. */
export function verify(
  dir: string = filesDir,
  sources: readonly Source[] = downloadedSources,
): string[] {
  const problems: string[] = [];
  for (const source of sources) {
    const path = join(dir, source.file);
    if (!existsSync(path)) problems.push(`${source.file}: missing`);
    else {
      const problem = problemWith(source, new Uint8Array(readFileSync(path)));
      if (problem) problems.push(problem);
    }
  }
  const expected = new Set(sources.map((s) => s.file));
  for (const file of existsSync(dir) ? readdirSync(dir) : [])
    if (!expected.has(file)) problems.push(`${file}: not one of the sources`);
  return problems;
}

/** Every problem with the fonts the design ships, where it ships them. */
export function verifyDesign(): string[] {
  return fontSources
    .filter((s) => 'design' in s.from)
    .flatMap((s) => {
      const path = 'design' in s.from ? join(designDir, s.from.design) : '';
      if (!existsSync(path)) return [`design/prototype: ${s.file} missing`];
      const problem = problemWith(s, new Uint8Array(readFileSync(path)));
      return problem ? [`design/prototype: ${problem}`] : [];
    });
}

/** Every problem with the app's copies: every font, and only the fonts. */
export function verifyApp(): string[] {
  return verify(appFontsDir, fontSources).map((p) => `apps/mobile/assets/fonts: ${p}`);
}
