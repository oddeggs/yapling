/**
 * Downloads the embedded Lexend cuts and the licence (and copies Kithfield Hand from the design)
 * into a fresh, empty directory, checks each against its pinned SHA-256 and PostScript name, then
 * copies them into `tools/fonts/files/` and the fonts into `apps/mobile/assets/fonts/`. With
 * `--check`, only verifies the committed files (no network).
 *
 *   pnpm --filter @yapling/fonts download [--work <empty dir for the downloads>]
 *   pnpm --filter @yapling/fonts verify
 */
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { allSources, downloadedSources, fontSources, type Source } from './sources';
import {
  appFontsDir,
  designDir,
  filesDir,
  problemWith,
  verify,
  verifyApp,
  verifyDesign,
} from './verify';

async function bytesOf(source: Source): Promise<Uint8Array> {
  if ('design' in source.from)
    return new Uint8Array(readFileSync(join(designDir, source.from.design)));
  const response = await fetch(source.from.url);
  if (!response.ok) throw new Error(`${source.from.url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function download(work: string): Promise<void> {
  for (const source of allSources) {
    const bytes = await bytesOf(source);
    const problem = problemWith(source, bytes);
    if (problem) throw new Error(problem);
    writeFileSync(join(work, source.file), bytes);
    console.log(`  ${source.file} ${Math.round(bytes.byteLength / 1024)} KB`);
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { check: { type: 'boolean' }, work: { type: 'string' } },
  });
  if (!values.check) {
    const work = values.work ?? mkdtempSync(join(tmpdir(), 'yapling-fonts-'));
    mkdirSync(work, { recursive: true });
    if (readdirSync(work).length > 0) throw new Error(`${work} is not empty`);
    console.log(`Downloading into ${work}`);
    await download(work);
    mkdirSync(filesDir, { recursive: true });
    mkdirSync(appFontsDir, { recursive: true });
    for (const source of downloadedSources)
      copyFileSync(join(work, source.file), join(filesDir, source.file));
    for (const source of fontSources)
      copyFileSync(join(work, source.file), join(appFontsDir, source.file));
  }
  const problems = [...verify(), ...verifyDesign(), ...verifyApp()];
  if (problems.length > 0) {
    for (const p of problems) console.error(`  ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `${allSources.length} font and licence files match their sources, and so do the app's`,
  );
}

await main();
