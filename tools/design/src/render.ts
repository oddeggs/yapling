import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { type ArtState, renderArt } from './art.ts';
import { launchChrome } from './cdp.ts';
import { recompressPng } from './png.ts';
import {
  type ScreenContext,
  type ScreenRender,
  boardSlug,
  renderBoard,
  renderHub,
  renderWeek1,
} from './screens.ts';
import { serveFolders } from './server.ts';

const TOOL_DIR = resolve(dirname(new URL(import.meta.url).pathname), '..');
const REPO = resolve(TOOL_DIR, '../..');
const PROTOTYPE = join(REPO, 'design/prototype');
const DEFAULT_OUT = join(REPO, 'design/renders');
/** The folders a full run owns under the output folder (README.md and the rest stay). */
const GROUPS = ['week1', 'hub', 'boards', 'art'];

const { values } = parseArgs({
  options: {
    only: { type: 'string' },
    out: { type: 'string' },
    scale: { type: 'string', default: '3' },
    concurrency: { type: 'string', default: '4' },
    offline: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
    keep: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log(`Usage: node src/render.ts [--only week1,hub,boards,art,<path prefix>] [--out dir]
       [--scale 3] [--concurrency 4] [--offline] [--check [--keep]]`);
  process.exit(0);
}

const tokens = (values.only ?? '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);
const selected = (file: string): boolean =>
  tokens.length === 0 || tokens.some((t) => file.startsWith(t));
const groupSelected = (group: string): boolean =>
  tokens.length === 0 || tokens.some((t) => t === group || t.startsWith(`${group}/`));

const sha256 = (data: Buffer): string => createHash('sha256').update(data).digest('hex');

function listPngs(dir: string, base = dir): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(listPngs(path, base));
    else if (entry.name.endsWith('.png')) out.push(relative(base, path));
  }
  return out.sort();
}

interface RunResult {
  screens: ScreenRender[];
  art: ArtState[];
  hashes: Map<string, string>;
  chrome: string;
}

async function run(outDir: string, origin: string): Promise<RunResult> {
  const full = tokens.length === 0;
  if (full)
    for (const group of GROUPS) rmSync(join(outDir, group), { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const hashes = new Map<string, string>();
  const browser = await launchChrome();
  const ctx: ScreenContext = {
    browser,
    origin,
    prototypeDir: PROTOTYPE,
    net: { dir: join(TOOL_DIR, '.cache/net'), offline: values.offline },
    scale: Number(values.scale),
    concurrency: Math.max(1, Number(values.concurrency)),
    async write(file, captured) {
      const png = await recompressPng(captured);
      const path = join(outDir, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, png);
      hashes.set(file, sha256(png));
    },
  };
  const started = Date.now();
  const screens: ScreenRender[] = [];
  let art: ArtState[] = [];
  try {
    if (groupSelected('week1')) {
      console.log('Week 1 steps');
      screens.push(...(await renderWeek1(ctx, selected)));
    }
    if (groupSelected('hub')) {
      console.log('Hub prototype screens');
      screens.push(...(await renderHub(ctx, selected)));
    }
    if (groupSelected('boards')) {
      const boards = readdirSync(join(PROTOTYPE, 'boards'))
        .filter((f) => f.endsWith('.dc.html'))
        .sort();
      const wanted = (prefix: string) =>
        tokens.length === 0 || tokens.some((t) => prefix.startsWith(t) || t.startsWith(prefix));
      for (const board of boards.filter((b) => wanted(`boards/${boardSlug(b)}/`))) {
        console.log(`Board ${board}`);
        screens.push(...(await renderBoard(ctx, board, selected)));
      }
    }
    if (groupSelected('art')) {
      console.log('Art states');
      art = await renderArt(ctx, selected);
    }
  } finally {
    await browser.close();
  }
  console.log(`  ${hashes.size} PNGs in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  return { screens, art, hashes, chrome: browser.version };
}

function count(files: string[], prefix: string): number {
  return files.filter((f) => f.startsWith(prefix)).length;
}

function writeManifests(outDir: string, result: RunResult): void {
  const merge = <T extends { file: string }>(path: string, key: string, fresh: T[]): T[] => {
    if (tokens.length === 0) return fresh;
    // A partial run updates the entries it rendered and keeps the rest.
    let old: T[] = [];
    try {
      old = (JSON.parse(readFileSync(path, 'utf8')) as Record<string, T[]>)[key] ?? [];
    } catch {
      old = [];
    }
    const byFile = new Map(old.map((e) => [e.file, e]));
    for (const e of fresh) byFile.set(e.file, e);
    return [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));
  };
  const withHash = <T extends { file: string }>(entries: T[]) =>
    entries.map((e) => ({
      ...e,
      sha256: result.hashes.get(e.file) ?? (e as { sha256?: string }).sha256,
    }));
  const screensPath = join(outDir, 'manifest.json');
  const screens = merge(screensPath, 'screens', withHash(result.screens));
  writeFileSync(screensPath, `${JSON.stringify({ chrome: result.chrome, screens }, null, 2)}\n`);
  const artPath = join(outDir, 'art/manifest.json');
  if (groupSelected('art')) {
    const states = merge(artPath, 'states', withHash(result.art));
    mkdirSync(dirname(artPath), { recursive: true });
    writeFileSync(
      artPath,
      `${JSON.stringify(
        {
          about:
            'Each PNG is a transparent canvas of canvas.width × canvas.height px. Reproduce it with ' +
            'ctx.setTransform(...transform) then YapArt[fn](ctx, w, h, o), with the generators of ' +
            'design/prototype/art loaded in order (yap-art, yap-cast, yap-sticker, yap-r4, yap-r5, yap-r6).',
          chrome: result.chrome,
          states,
        },
        null,
        2,
      )}\n`,
    );
  }
  const files = listPngs(outDir);
  console.log(
    `Counts: week1 ${count(files, 'week1/')}, hub ${count(files, 'hub/')}, boards ${count(files, 'boards/')}, ` +
      `art ${count(files, 'art/')} (critters ${files.filter((f) => /^art\/(?!face-|scene-|obj-)/.test(f)).length}, ` +
      `faces ${count(files, 'art/face-')}, scenes ${count(files, 'art/scene-')}, objects ${count(files, 'art/obj-')}); ` +
      `total ${files.length}`,
  );
}

const server = await serveFolders({ '/': PROTOTYPE, '/__tools/': TOOL_DIR });
let failed = false;
try {
  const outDir = values.out ? resolve(values.out) : DEFAULT_OUT;
  const first = await run(outDir, server.origin);
  writeManifests(outDir, first);
  if (values.check) {
    console.log('Second run, for the determinism check');
    const temp = mkdtempSync(join(tmpdir(), 'yapling-design-check-'));
    try {
      const second = await run(temp, server.origin);
      const differ = [...first.hashes].filter(([file, hash]) => second.hashes.get(file) !== hash);
      const missing = [...second.hashes.keys()].filter((f) => !first.hashes.has(f));
      if (differ.length || missing.length) {
        failed = true;
        for (const [file] of differ) console.error(`  differs: ${file}`);
        for (const file of missing) console.error(`  only in the second run: ${file}`);
        console.error(
          `Determinism check failed: ${differ.length} of ${first.hashes.size} PNGs differ`,
        );
      } else {
        const digest = sha256(
          Buffer.from(
            [...first.hashes]
              .sort()
              .map(([f, h]) => `${f} ${h}`)
              .join('\n'),
          ),
        );
        console.log(
          `Determinism check passed: ${first.hashes.size} PNGs byte-identical (digest ${digest.slice(0, 16)})`,
        );
      }
    } finally {
      if (values.keep) console.log(`Second run kept in ${temp}`);
      else rmSync(temp, { recursive: true, force: true });
    }
  }
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
