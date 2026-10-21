import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { GENERATED_DIR, renderAll, SOURCE_DIR } from './emit';

export interface SyncResult {
  /** Files whose content differs from a fresh sync, or that a fresh sync would not write. */
  stale: string[];
  written: string[];
  removed: string[];
}

export interface SyncOptions {
  /** Report what is out of date without writing. */
  check?: boolean;
  dir?: string;
  sourceDir?: string;
}

/**
 * Brings `packages/art/src/generated/` in line with `design/prototype/art/`. With `check`, writes
 * nothing and reports what is out of date instead.
 */
export function sync({
  check = false,
  dir = GENERATED_DIR,
  sourceDir = SOURCE_DIR,
}: SyncOptions = {}): SyncResult {
  const files = renderAll(sourceDir);
  const stale: string[] = [];
  const written: string[] = [];
  const removed: string[] = [];
  if (!check) mkdirSync(dir, { recursive: true });
  for (const file of files) {
    const path = join(dir, file.name);
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current === file.text) continue;
    stale.push(file.name);
    if (!check) {
      writeFileSync(path, file.text);
      written.push(file.name);
    }
  }
  const expected = new Set(files.map((f) => f.name));
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    if (expected.has(name)) continue;
    stale.push(name);
    if (!check) {
      rmSync(join(dir, name));
      removed.push(name);
    }
  }
  return { stale, written, removed };
}
