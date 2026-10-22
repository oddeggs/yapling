import { STAGES } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import CEFR_J from '../data/cefr-j-1.6.json';
import TOWN from '../data/town-words.json';
import { bandWithin, CEFR_BANDS, LEVEL_GUIDE, levelGuide, TASK_TYPES } from './level-guide';
import { SPEECH_SETTINGS, stageIndex } from './stages';

const rows = STAGES.map((stage) => LEVEL_GUIDE[stage]);

/** Each pair of neighbouring stages, easier first. */
const steps = rows.slice(1).map((row, i) => [rows[i]!, row] as const);

/** A limit that may be open (null), as a number for comparing: open is the most generous. */
const open = (n: number | null) => n ?? Number.POSITIVE_INFINITY;

describe('the level guide', () => {
  it('has one row per stage, keyed by its stage', () => {
    expect(Object.keys(LEVEL_GUIDE)).toEqual([...STAGES]);
    for (const stage of STAGES) expect(levelGuide(stage).stage).toBe(stage);
  });

  it('carries the stage speech settings row itself, never a copy that could drift', () => {
    for (const stage of STAGES) {
      const row = LEVEL_GUIDE[stage];
      expect(row.speech).toBe(SPEECH_SETTINGS[stage]);
      expect(row.characterLines.maxWordsPerTurn).toBe(SPEECH_SETTINGS[stage].maxWordsPerTurn);
      expect(row.characterLines.idioms).toBe(SPEECH_SETTINGS[stage].idioms);
    }
  });

  it('keeps the Visitor row: A1, one short sentence of 8 words, cards, no idioms, nothing outside', () => {
    const visitor = LEVEL_GUIDE.visitor;
    expect(visitor.vocabulary.band).toBe('A1');
    expect(visitor.vocabulary.outsideShare).toBe(0);
    expect(visitor.characterLines.maxWordsPerTurn).toBe(8);
    expect(visitor.characterLines.maxWordsPerSentence).toBe(8);
    expect(visitor.characterLines.modelThenAsk).toBe(true);
    expect(visitor.characterLines.maxIdiomsPerScene).toBe(0);
    expect(visitor.learnerTurn.cards).toBe(true);
    expect(visitor.corrections).toBe('recast_only');
    expect(visitor.recordedMaxWordsPerMinute).toBe(100);
    // Week 1's Visitor Pass it on runs 30/25/20 s; nothing longer.
    expect(visitor.learnerTurn.maxTimerSeconds).toBe(30);
  });

  it('opens up stage by stage and never tightens', () => {
    for (const [easier, harder] of steps) {
      const band = (b: (typeof CEFR_BANDS)[number] | null) =>
        b === null ? 99 : CEFR_BANDS.indexOf(b);
      expect(band(harder.vocabulary.band)).toBeGreaterThanOrEqual(band(easier.vocabulary.band));
      expect(harder.vocabulary.outsideShare).toBeGreaterThanOrEqual(easier.vocabulary.outsideShare);
      expect(open(harder.vocabulary.aboutWords)).toBeGreaterThanOrEqual(
        open(easier.vocabulary.aboutWords),
      );
      expect(harder.vocabulary.chunksPerWeek.min).toBeGreaterThanOrEqual(
        easier.vocabulary.chunksPerWeek.min,
      );
      const lines = [easier.characterLines, harder.characterLines] as const;
      expect(open(lines[1].maxWordsPerSentence)).toBeGreaterThanOrEqual(
        open(lines[0].maxWordsPerSentence),
      );
      // Visitor counts words, not sentences (8 words a turn already makes one short sentence).
      if (easier.stage !== 'visitor') {
        expect(open(lines[1].maxSentencesPerTurn)).toBeGreaterThanOrEqual(
          open(lines[0].maxSentencesPerTurn),
        );
      }
      expect(lines[1].maxWordsPerTurn).toBeGreaterThanOrEqual(lines[0].maxWordsPerTurn);
      expect(open(lines[1].maxIdiomsPerScene)).toBeGreaterThanOrEqual(
        open(lines[0].maxIdiomsPerScene),
      );
    }
  });

  it('allows no idioms where the speech settings say none', () => {
    for (const row of rows) {
      if (row.characterLines.idioms === 'none')
        expect(row.characterLines.maxIdiomsPerScene).toBe(0);
      else expect(row.characterLines.maxIdiomsPerScene).not.toBe(0);
    }
  });

  it('gives every stage tasks of its own, each a known task type', () => {
    const seen = new Set<string>();
    for (const row of rows) {
      expect(row.tasks.length).toBeGreaterThan(0);
      for (const task of row.tasks) {
        expect(TASK_TYPES).toHaveProperty(task);
        expect(seen.has(task), `${task} at two stages`).toBe(false);
        seen.add(task);
      }
      expect(row.understands.length).toBeGreaterThan(0);
      expect(row.says.length).toBeGreaterThan(0);
      expect(row.never.length).toBeGreaterThan(0);
    }
  });

  it('keeps only Voice open on vocabulary and grammar', () => {
    for (const row of rows) {
      const isVoice = row.stage === 'voice';
      expect(row.vocabulary.band === null).toBe(isVoice);
      expect(row.grammar.length === 0).toBe(isVoice);
    }
    expect(stageIndex('voice')).toBe(STAGES.length - 1);
  });
});

describe('bands', () => {
  it('orders A1 to B2', () => {
    expect(bandWithin('A1', 'A2')).toBe(true);
    expect(bandWithin('A2', 'A2')).toBe(true);
    expect(bandWithin('B1', 'A2')).toBe(false);
    expect(bandWithin('B2', 'A1')).toBe(false);
  });
});

describe('the word lists', () => {
  const bands = CEFR_BANDS.map((band) => CEFR_J[band].split(' '));

  it('cites the CEFR-J Wordlist with the data', () => {
    expect(CEFR_J.source).toMatch(/^The CEFR-J Wordlist Version 1\.6\. Compiled by Yukio Tono/);
  });

  it('lists each word once, lower case, at one band, sorted', () => {
    const all = bands.flat();
    expect(new Set(all).size).toBe(all.length);
    for (const words of bands) {
      expect(words.length).toBeGreaterThan(1000);
      expect(words).toEqual([...words].sort());
      for (const w of words) expect(w).toMatch(/^[a-zé][a-zé'-]*$/);
    }
  });

  it('puts the everyday words at A1', () => {
    for (const w of ['hello', 'yes', 'no', 'please', 'thank', 'sorry', 'coffee', 'tea', 'bus']) {
      expect(CEFR_J.A1.split(' '), w).toContain(w);
    }
  });

  it('keeps the interjections and regional words apart from the bands', () => {
    const banded = new Set(bands.flat());
    // Town words may be in a band too (harbour is B1): in Natterwick they never count against one.
    const names = TOWN.names.split(' ');
    expect(new Set(names).size).toBe(names.length);
    for (const w of names) expect(w).toBe(w.toLowerCase());
    const own = [
      ...TOWN.spoken.A1.split(' '),
      ...TOWN.spoken.A2.split(' '),
      ...TOWN.regional.split(' '),
    ];
    expect(new Set(own).size).toBe(own.length);
    for (const w of own) {
      expect(w).toBe(w.toLowerCase());
      expect(banded.has(w), w).toBe(false);
    }
    for (const [form, headword] of Object.entries(TOWN.forms)) {
      expect(banded.has(headword), `${form} → ${headword}`).toBe(true);
    }
    for (const idiom of TOWN.idioms) expect(idiom).toBe(idiom.toLowerCase());
  });
});
