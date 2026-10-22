import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { LINES_JSON } from '../scripts/generate';
import { rec, scene } from './build';
import { SCENES } from './catalogue';
import { findLine, isRecorded } from './lines';
import { PENDING_LINES, RECORDED_LINES } from './lines.generated';
import { S1_SHARED_LINES } from './season-1/shared-lines';
import {
  LONG_VISITOR_LINES,
  validateScene,
  VISITOR_MAX_WORDS,
  visitorLineProblems,
  wordCount,
} from './validate';
import type { Answer, Beat } from './types';

const source = JSON.parse(readFileSync(LINES_JSON, 'utf8')) as {
  lines: { id: string }[];
  pending?: { id: string; lang?: string }[];
};
const pendingIds = (source.pending ?? []).map((l) => l.id);

const answerOf = (beat: Beat): Answer | null =>
  beat.kind === 'learner' || beat.kind === 'gen' ? beat.answer : null;

/** Every line id a scene can play or say: its beats, models and praise, and the shared lines. */
const referenced = new Set([
  ...SCENES.flatMap((scene) =>
    scene.beats.flatMap((beat) => {
      const answer = answerOf(beat);
      return [
        ...(beat.kind === 'rec' ? [beat.line] : []),
        ...(answer?.model ? [answer.model] : []),
        ...(answer?.praise ?? []),
      ];
    }),
  ),
  ...Object.values(S1_SHARED_LINES.again),
  ...Object.values(S1_SHARED_LINES.slowly),
  ...Object.values(S1_SHARED_LINES.skip),
  S1_SHARED_LINES.together,
  S1_SHARED_LINES.english,
]);

const VISITOR_IDS = /^s1-(set|e1-visitor)/;

describe('lines waiting for their recording', () => {
  it('compiles every pending line of lines.json, with no audio', () => {
    expect(PENDING_LINES.map((l) => l.id)).toEqual(pendingIds);
    for (const line of PENDING_LINES) {
      expect(line.audio).toBeNull();
      expect(line.caption).not.toMatch(/\[/);
      expect(line.caption.length).toBeGreaterThan(0);
    }
  });

  it('never lists a line as both recorded and pending', () => {
    const recorded = new Set(RECORDED_LINES.map((l) => l.id));
    expect(pendingIds.filter((id) => recorded.has(id))).toEqual([]);
  });

  it('resolves every line a scene names, recorded or pending', () => {
    for (const id of referenced) expect(findLine(id), id).toBeDefined();
  });

  it('uses every pending line somewhere', () => {
    expect(pendingIds.filter((id) => !referenced.has(id))).toEqual([]);
  });

  it('is told apart only by its audio, so recording it changes no scene', () => {
    for (const id of pendingIds) expect(isRecorded(id)).toBe(false);
    expect(isRecorded('s1-e1-02')).toBe(true);
  });

  it('marks Linh’s Vietnamese, and carries the English it means', () => {
    const vi = (source.pending ?? []).filter((l) => l.lang === 'vi').map((l) => l.id);
    expect(vi).toHaveLength(7);
    for (const id of vi) {
      const line = findLine(id);
      expect(line?.language, id).toBe('vi');
      expect(line?.english?.length ?? 0, id).toBeGreaterThan(0);
    }
  });

  it('glosses every English Visitor line in Vietnamese', () => {
    for (const id of referenced) {
      if (!VISITOR_IDS.test(id)) continue;
      const line = findLine(id);
      if (line?.language !== 'en') continue;
      expect(line.glosses.vi?.text.length ?? 0, id).toBeGreaterThan(0);
    }
  });

  it('keeps the slow render speed of the English Visitor lines', () => {
    expect(findLine('s1-set1-01')?.speed).toBe(0.7);
    expect(findLine('s1-set1-02')?.speed).toBeNull();
  });
});

describe('Visitor line length', () => {
  it(`keeps every English Visitor line to ${VISITOR_MAX_WORDS} words, but the marked long ones`, () => {
    const problems = [...referenced]
      .filter((id) => VISITOR_IDS.test(id))
      .flatMap(visitorLineProblems);
    expect(problems).toEqual([]);
  });

  it("lets Pip's fast line run long, on purpose, and nothing else", () => {
    expect(LONG_VISITOR_LINES).toEqual(['s1-set3-04']);
    const line = findLine('s1-set3-04');
    expect(wordCount(line?.caption ?? '')).toBe(11);
  });

  it('counts a spliced name as a word', () => {
    expect(wordCount('Nice to meet you.', true)).toBe(5);
    expect(wordCount('Snacks. Map. Notebook!')).toBe(3);
  });

  it('flags a long line in a Visitor-only beat', () => {
    const test = scene({
      id: 'test',
      kind: 'episode',
      title: 'Test',
      place: 'lantern-cafe',
      cast: ['pip'],
      summary: '',
      goal: '',
      beats: [
        rec('long', 's1-e1-03', { maxStage: 'visitor' }),
        rec('newcomer-long', 's1-e1-03', { minStage: 'newcomer' }),
      ],
    });
    expect(validateScene(test)).toEqual(['test/long: s1-e1-03 has 9 words at Visitor']);
  });
});
