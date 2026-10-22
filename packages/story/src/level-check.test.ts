import type { Stage } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import { EPISODES, SCENES } from './catalogue';
import {
  checkLevel,
  checkSceneLevel,
  formatLevelProblem,
  idiomsIn,
  levelLineOf,
  levelWords,
  PHRASE_WORDS,
  sceneLevelGroups,
  wordBand,
  type LevelLine,
  type LevelProblemKind,
  type SceneLevelProblem,
} from './level-check';
import { getLine } from './lines';
import { S1_SHARED_LINES } from './season-1/shared-lines';

const line = (text: string, extra: Partial<LevelLine> = {}): LevelLine => ({
  id: 'l1',
  text,
  ...extra,
});

/** The kinds of problem one line has at a stage. */
const kinds = (stage: Stage, text: string, extra: Partial<LevelLine> = {}): LevelProblemKind[] =>
  checkLevel(stage, [line(text, extra)]).map((p) => p.kind);

describe('words', () => {
  it('splits a line into lower-case words, keeping contractions, hyphens and {name}', () => {
    expect(levelWords("Hi, {name}! I'm Linh. Bus forty-five?")).toEqual([
      'hi',
      '{name}',
      "i'm",
      'linh',
      'bus',
      'forty-five',
    ]);
    expect(levelWords('It’s fine…')).toEqual(["it's", 'fine']);
  });

  it('bands a form by its headword, the easiest reading first', () => {
    expect(wordBand('hello')).toBe('A1');
    expect(wordBand('went')).toBe('A1'); // go
    expect(wordBand('found')).toBe('A1'); // find, not "found a company"
    expect(wordBand('tickets')).toBe('A1');
    expect(wordBand('cheaper')).toBe('A2');
    expect(wordBand('stopped')).toBe('A1');
    expect(wordBand("can't")).toBe('A1');
    expect(wordBand("isn't")).toBe('A1');
    expect(wordBand('landlord')).toBe('B1');
    expect(wordBand('petition')).toBeNull();
  });
});

describe('checkLevel', () => {
  it('passes short, plain Visitor lines with names, numbers and the learner’s name', () => {
    expect(checkLevel('visitor', [line("I'm Linh. And you?")])).toEqual([]);
    expect(checkLevel('visitor', [line('Bus forty-five. Two dollars!')])).toEqual([]);
    expect(checkLevel('visitor', [line('Hi, {name}! I leave at 9.')])).toEqual([]);
  });

  it('makes a Visitor turn over 8 words an error, unless it is long on purpose', () => {
    const long = 'Ooh, I found my map and my notebook today!';
    const [problem] = checkLevel('visitor', [line(long)]);
    expect(problem).toMatchObject({ severity: 'error', kind: 'turn_too_long', line: 'l1' });
    expect(kinds('visitor', long, { long: true })).toEqual([]);
    // The spliced name counts as a word.
    expect(kinds('visitor', 'Hi! I am Linh. Nice to meet you.')).toEqual([]);
    expect(kinds('visitor', 'Hi! I am Linh. Nice to meet you.', { nameSplice: true })).toEqual([
      'turn_too_long',
    ]);
  });

  it('gives listening lines no turn limit, but keeps their sentences short', () => {
    const story = 'Today I walked to town. I wanted some bread. Then I sat down!';
    expect(kinds('visitor', story)).toEqual(['turn_too_long']);
    expect(kinds('visitor', story, { listening: true })).toEqual([]);
    expect(
      kinds('visitor', 'Then a big bird from the harbour took my map away.', { listening: true }),
    ).toEqual(['sentence_too_long']);
  });

  it('counts a turn’s sentences at Newcomer, not its short fragments', () => {
    expect(kinds('newcomer', 'Oh! Hi, you two. Sit, sit. Can I get you a tea?')).toEqual([]);
    expect(kinds('newcomer', 'I have an idea. I will get a job. I will help pay!')).toEqual([
      'too_many_sentences',
    ]);
    const warnings = checkLevel('newcomer', [line('One. Two. I have a plan for the café today.')]);
    expect(warnings).toEqual([]);
  });

  it('keeps sentences inside the stage’s length, more generous at each stage', () => {
    const sentence = 'Mei says a big man wants to talk to her about the price of beans.';
    expect(kinds('newcomer', sentence)).toEqual(['sentence_too_long']);
    expect(kinds('neighbour', sentence)).toEqual([]);
    const long =
      'Mei says a big man from the harbour wants to talk to her about the price of her beans.';
    expect(kinds('neighbour', long)).toEqual(['sentence_too_long']);
    expect(kinds('regular', long)).toEqual([]);
  });

  it('warns about turns over ~25 words after Visitor', () => {
    const turn =
      'Hi! I am Linh, from next door. You moved in today. Come to the café when you can. Mei makes very good toast there, every day.';
    const problems = checkLevel('newcomer', [line(turn)]);
    expect(problems.find((p) => p.kind === 'turn_too_long')).toMatchObject({
      severity: 'warning',
    });
  });

  it('flags words above the stage’s band, and lets them in a stage up', () => {
    const [problem] = checkLevel('newcomer', [line('The landlord is here.')]);
    expect(problem).toMatchObject({
      severity: 'warning',
      kind: 'word_above_band',
      words: ['landlord (B1)'],
    });
    expect(kinds('neighbour', 'The landlord is here.')).toEqual([]);
    expect(kinds('visitor', 'Kaya toast?')).toEqual(['word_above_band']);
    expect(kinds('newcomer', 'Kaya toast?')).toEqual([]);
  });

  it('lets the season’s phrases and the given words through', () => {
    expect(kinds('visitor', 'Just to confirm…')).toEqual(['word_above_band']);
    expect(
      checkLevel('visitor', [line('Just to confirm…')], { allowedWords: PHRASE_WORDS }),
    ).toEqual([]);
    expect(
      checkLevel('newcomer', [line('Here is the petition.')], { allowedWords: ['petition'] }),
    ).toEqual([]);
  });

  it('flags words in no list, so a name can be added to the town words', () => {
    const [problem] = checkLevel('newcomer', [line("This town's gotta show it.")]);
    expect(problem).toMatchObject({ kind: 'unknown_word', words: ['gotta'] });
  });

  it('checks no vocabulary at Voice', () => {
    expect(kinds('voice', 'The petition needs a hundred signatures by Friday.')).toEqual([]);
  });

  it('finds idioms in any form, and forbids them where the stage has none', () => {
    expect(idiomsIn('My English goes funny when I am angry.')).toEqual(['go funny']);
    expect(idiomsIn('Go on then, love.')).toEqual(['go on then']);
    expect(idiomsIn('Can you go to the shop?')).toEqual([]);
    const [visitor] = checkLevel('visitor', [line('Go on then!')]);
    expect(visitor).toMatchObject({ severity: 'error', kind: 'idiom' });
    const [newcomer] = checkLevel('newcomer', [line('Go on then!')]);
    expect(newcomer).toMatchObject({ severity: 'warning', kind: 'idiom' });
  });

  it('lets a Neighbour hear an idiom only when the line explains it', () => {
    const idiom = 'Fingers crossed for Friday.';
    expect(kinds('neighbour', idiom)).toEqual(['idiom']);
    expect(kinds('neighbour', idiom, { explained: true })).toEqual([]);
    expect(kinds('regular', idiom)).toEqual([]);
  });

  it('keeps a Regular scene to two idioms', () => {
    const lines = ['Fingers crossed.', 'Time flies!', 'Hang in there.'].map((text, i) =>
      line(text, { id: `l${i}` }),
    );
    const problems = checkLevel('regular', lines);
    expect(problems).toEqual([
      expect.objectContaining({ kind: 'idioms_in_scene', line: null, severity: 'warning' }),
    ]);
    expect(checkLevel('local', lines)).toEqual([]);
  });

  it('keeps a scene to one light regional word', () => {
    expect(checkLevel('newcomer', [line('Thanks lah.')])).toEqual([]);
    const problems = checkLevel('newcomer', [
      line('Thanks lah.', { id: 'a' }),
      line('Cheers, love.', { id: 'b' }),
    ]);
    expect(problems).toEqual([
      expect.objectContaining({ kind: 'regional_words', words: ['lah', 'love'] }),
    ]);
    // "Love" as a verb isn't a regional word.
    expect(
      checkLevel('newcomer', [line('I love your café.', { id: 'a' }), line('Thanks lah.')]),
    ).toEqual([]);
  });

  it('warns when too many of a scene’s words are above its band', () => {
    const lines = ['The landlord is here.', 'The rent is double.'].map((text, i) =>
      line(text, { id: `l${i}` }),
    );
    expect(checkLevel('newcomer', lines).map((p) => p.kind)).toEqual([
      'word_above_band',
      'band_share',
    ]);
  });
});

/*
 * Season One and Settling in, every character line at the stage it is written for, and at Visitor
 * for the lines a Visitor hears without a Visitor version. Errors fail; warnings are the script's
 * to look at (`LEVEL_REPORT=1 pnpm --filter @yapling/story test level-check` prints them).
 */
describe('Season One and Settling in at their stages', () => {
  const lineProblems = (
    scene: string,
    stage: Stage,
    as: SceneLevelProblem['as'],
    ids: readonly string[],
  ): SceneLevelProblem[] => {
    const lines = ids.flatMap((id) => levelLineOf(getLine(id)) ?? []);
    return checkLevel(stage, lines, { allowedWords: PHRASE_WORDS }).map((p) => ({
      ...p,
      severity: as === 'heard' ? 'warning' : p.severity,
      scene,
      beat: null,
      as,
    }));
  };

  const shared = [
    ...Object.values(S1_SHARED_LINES.praise).flat(),
    ...Object.values(S1_SHARED_LINES.okay).flat(),
    ...Object.values(S1_SHARED_LINES.again),
    ...Object.values(S1_SHARED_LINES.slowly),
    ...Object.values(S1_SHARED_LINES.skip),
  ];
  const recaps = EPISODES.map((episode) => episode.recap);

  const problems: SceneLevelProblem[] = [
    ...SCENES.flatMap((scene) => checkSceneLevel(scene)),
    ...lineProblems('shared lines', 'visitor', 'written', shared),
    ...lineProblems('recaps', 'newcomer', 'written', recaps),
    ...lineProblems('recaps', 'visitor', 'heard', recaps),
  ];

  it('checks every scene with English character lines, at a stage', () => {
    for (const scene of SCENES) {
      const groups = sceneLevelGroups(scene);
      const english = groups.flatMap((g) => g.lines);
      if (scene.beats.some((b) => b.kind === 'rec' && getLine(b.line).language === 'en')) {
        expect(english.length, scene.id).toBeGreaterThan(0);
      }
    }
  });

  it('checks Settling in and the Visitor-only beats as written for Visitor', () => {
    for (const scene of SCENES.filter((s) => s.kind === 'settling')) {
      expect(
        sceneLevelGroups(scene).map((g) => [g.stage, g.as]),
        scene.id,
      ).toEqual([['visitor', 'written']]);
    }
    const e1 = sceneLevelGroups(SCENES.find((s) => s.id === 's1-e1')!);
    const visitor = e1.find((g) => g.stage === 'visitor' && g.as === 'written');
    expect(visitor?.lines.map((l) => l.beat)).toContain('rent-question-visitor');
    expect(visitor?.lines.map((l) => l.beat)).not.toContain('open');
    const heard = e1.find((g) => g.stage === 'visitor' && g.as === 'heard');
    expect(heard?.lines.map((l) => l.beat)).toContain('open');
    expect(heard?.lines.map((l) => l.beat)).not.toContain('rent-question');
  });

  it('reports what the script should look at', () => {
    if (process.env.LEVEL_REPORT)
      process.stdout.write(`${problems.map(formatLevelProblem).join('\n')}\n`);
    expect(problems.every((p) => p.scene.length > 0 && p.message.length > 0)).toBe(true);
  });

  it('keeps every hard rule: no errors', () => {
    expect(problems.filter((p) => p.severity === 'error').map(formatLevelProblem)).toEqual([]);
  });
});
