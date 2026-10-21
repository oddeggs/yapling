import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { generate, LINES_DIR, LINES_JSON, PACKAGE_DIR, SFX_DIR } from '../scripts/generate';
import { SCENES } from './catalogue';
import { findLine, pendingRecordings, STORY_LINES } from './lines';
import { RECORDED_LINES } from './lines.generated';
import { SFX_IDS } from './types';

const source = (JSON.parse(readFileSync(LINES_JSON, 'utf8')) as { lines: { id: string }[] }).lines;
const sourceIds = new Set(source.map((l) => l.id));

const recBeats = SCENES.flatMap((scene) =>
  scene.beats.flatMap((beat) => (beat.kind === 'rec' ? [{ scene: scene.id, beat }] : [])),
);

describe('recorded lines', () => {
  it('compiles every line of lines.json', () => {
    expect(RECORDED_LINES.map((l) => l.id)).toEqual(source.map((l) => l.id));
  });

  it.each(RECORDED_LINES.map((l) => [l.id, l] as const))(
    '%s has its mp3 and timing file, with a caption',
    (_id, line) => {
      expect(existsSync(join(LINES_DIR, line.audio.mp3))).toBe(true);
      expect(existsSync(join(LINES_DIR, line.audio.timing))).toBe(true);
      expect(line.caption.length).toBeGreaterThan(0);
      expect(line.caption).not.toMatch(/\[/);
      expect(line.audio.durationMs).toBeGreaterThan(500);
    },
  );

  it('resolves every rec beat to a line, recorded ones in lines.json with both files', () => {
    for (const { scene, beat } of recBeats) {
      const line = findLine(beat.line);
      expect(line, `${scene}/${beat.id}`).toBeDefined();
      if (line?.audio) {
        expect(sourceIds.has(line.id)).toBe(true);
        expect(existsSync(join(LINES_DIR, line.audio.mp3))).toBe(true);
        expect(existsSync(join(LINES_DIR, line.audio.timing))).toBe(true);
      }
    }
  });

  it('keeps pending lines out of lines.json until they are recorded', () => {
    const pending = pendingRecordings();
    expect(pending.map((p) => p.id)).toEqual([
      's1-e1-story-seagull',
      's1-e1-vm-oops',
      's1-e1-vm-thanks',
    ]);
    for (const p of pending) expect(sourceIds.has(p.id)).toBe(false);
  });

  it('has unique line ids', () => {
    expect(new Set(STORY_LINES.map((l) => l.id)).size).toBe(STORY_LINES.length);
  });

  it('writes the seagull story at about 40 seconds of Newcomer speech, seeded with "Can I help?"', () => {
    const story = findLine('s1-e1-story-seagull');
    const words = story?.caption.split(/\s+/).length ?? 0;
    // ~110 words a minute: 40 s is about 73 words.
    expect(words).toBeGreaterThanOrEqual(65);
    expect(words).toBeLessThanOrEqual(85);
    expect(story?.caption).toContain('Can I help?');
    expect(story?.segments.map((s) => s.en).join(' ')).toBe(story?.caption);
  });
});

describe('generated modules', () => {
  it('match the audio sources (run `pnpm --filter @yapling/story gen` after recording)', () => {
    for (const [path, content] of Object.entries(generate())) {
      expect(readFileSync(join(PACKAGE_DIR, path), 'utf8'), path).toBe(content);
    }
  });

  it('require files that exist, by paths relative to the asset module', () => {
    const assets = readFileSync(join(PACKAGE_DIR, 'src', 'assets.generated.ts'), 'utf8');
    const paths = [...assets.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1] ?? '');
    expect(paths).toHaveLength(RECORDED_LINES.length * 2 + SFX_IDS.length);
    for (const path of paths) {
      expect(existsSync(join(PACKAGE_DIR, 'src', path)), path).toBe(true);
    }
  });

  it('knows every sound effect on disk', () => {
    for (const id of SFX_IDS) expect(existsSync(join(SFX_DIR, `${id}.mp3`))).toBe(true);
  });
});
