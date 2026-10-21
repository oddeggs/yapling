import { describe, expect, it } from 'vitest';

import { PHRASES } from './catalogue';
import { glossFor, hintGlossFor } from './gloss';
import { getLine } from './lines';
import { S1_E1, SEASON_1 } from './season-1';
import type { Glosses, Scene } from './types';

const hasVi = (glosses: Glosses) => (glosses.vi?.text.trim().length ?? 0) > 0;

/** Prologue and Episode 1 scenes, whose on-screen English all needs a gloss. */
const glossedScenes: readonly Scene[] = [...SEASON_1.prologue, ...S1_E1.scenes];

describe('Vietnamese glosses', () => {
  it.each(PHRASES.map((p) => [p.en, p] as const))('target phrase "%s" has one', (_en, phrase) => {
    expect(hasVi(phrase.glosses)).toBe(true);
  });

  it('cover every written line of the prologue and Episode 1', () => {
    const ids = new Set([
      ...glossedScenes.flatMap((s) => s.beats.flatMap((b) => (b.kind === 'rec' ? [b.line] : []))),
      ...S1_E1.lines,
    ]);
    for (const id of ids) expect(hasVi(getLine(id).glosses), id).toBe(true);
  });

  it("cover every segment of Pip's story", () => {
    const story = getLine('s1-e1-story-seagull');
    expect(story.segments.length).toBeGreaterThan(1);
    for (const segment of story.segments) expect(hasVi(segment.glosses), segment.en).toBe(true);
  });

  it('cover every line of the letter and the words it drops as seeds', () => {
    const letters = glossedScenes.flatMap((s) =>
      s.beats.flatMap((b) => (b.kind === 'ui' && b.ui.type === 'letter' ? [b.ui.letter] : [])),
    );
    expect(letters).toHaveLength(1);
    for (const line of letters.flatMap((l) => l.lines)) {
      expect(hasVi(line.glosses), line.en).toBe(true);
      if (line.seed) expect(hasVi(line.seed.glosses), line.seed.en).toBe(true);
    }
  });

  it('cover every hint, except in Pass it on (no first-language help there)', () => {
    for (const scene of glossedScenes) {
      for (const beat of scene.beats) {
        const answer = beat.kind === 'learner' || beat.kind === 'gen' ? beat.answer : null;
        const hint = answer?.exits.silent.hint;
        if (!hint) continue;
        expect(hasVi(hint.glosses), `${scene.id}/${beat.id}`).toBe(scene.kind !== 'practice');
      }
    }
  });

  it('reuse the prototype verbatim where it had one, and mark new ones unreviewed', () => {
    expect(getLine('s1-e1-03').glosses.vi).toEqual({
      text: 'Cô ấy trông buồn. Bạn hỏi cô ấy có chuyện gì không?',
      reviewed: true,
    });
    expect(getLine('s1-e1-story-seagull').glosses.vi?.reviewed).toBe(false);
  });

  it('fade from hints at Regular and are absent for other languages', () => {
    const glosses = getLine('s1-e1-03').glosses;
    expect(hintGlossFor(glosses, 'vi', 'neighbour')).not.toBeNull();
    expect(hintGlossFor(glosses, 'vi', 'regular')).toBeNull();
    expect(glossFor(glosses, 'other')).toBeNull();
    expect(glossFor(glosses, 'id')).toBeNull();
  });
});
