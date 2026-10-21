import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Mood, Mouth, Species } from '../critter';
import { REPO_ROOT } from '../node';

/**
 * Where the render tool writes the reference PNGs (rebuilt locally, not committed);
 * `YAPLING_RENDERS_DIR` points elsewhere (another checkout's renders).
 */
export const RENDERS_DIR = process.env['YAPLING_RENDERS_DIR'] ?? join(REPO_ROOT, 'design/renders');
/** The render tool's manifest of art states (committed). */
export const MANIFEST = join(REPO_ROOT, 'design/renders/art/manifest.json');

/** One art state of the render tool's manifest (`design/renders/art/manifest.json`). */
export interface ArtState {
  file: string;
  kind: 'critter' | 'face' | 'scene' | 'object';
  fn: string;
  w: number;
  h: number;
  o: Record<string, unknown>;
  pad: number;
  scale: number;
  canvas: { width: number; height: number };
  transform: [number, number, number, number, number, number];
  character?: string;
  species?: Species;
  mood?: Mood;
  mouth?: Mouth;
}

/** Every art state the render tool records, in its order. */
export function artStates(): ArtState[] {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
    states: ArtState[];
  };
  return manifest.states;
}

/** The state's name: its file without folder and extension. */
export const stateId = (s: ArtState) => s.file.replace(/^art\//, '').replace(/\.png$/, '');
