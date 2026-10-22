import { type Id, type Stage } from '@yapling/contracts';
import { bandWithin, CEFR_BANDS, LEVEL_GUIDE, type CefrBand } from '@yapling/domain';

// The word lists sit beside the level guide in the learning model's data folder. They are read
// here, by checks only, and never through a package entry, so they stay out of the app bundle.
import CEFR_J from '../../domain/data/cefr-j-1.6.json';
import TOWN from '../../domain/data/town-words.json';
import { PHRASES, VISITOR_VERSIONS } from './catalogue';
import { findLine } from './lines';
import { stageInRange } from './stage';
import type { Beat, Scene, StoryLine } from './types';
import { LONG_VISITOR_LINES, wordCount } from './validate';

/*
 * The level check: character lines against the level guide row of their stage. It reads the same
 * row a writer reads (`LEVEL_GUIDE`), so a rule changes in one place.
 *
 * Errors are the hard rules every hand-written line already keeps: a Visitor turn over 8 words
 * (unless marked long on purpose) and an idiom at Visitor. Everything else is a warning for the
 * writer: limits the docs give as "about" (turns under ~25 words), word bands from a list that
 * can't know a line's context, sentence counts, idioms found by a list.
 */

/** A character line to check. */
export interface LevelLine {
  readonly id: Id;
  /** The caption: plain text, no voice tags. `{name}` stands for the learner's name. */
  readonly text: string;
  /** Heard, not answered (a story, a postcard, a voicemail, a recap): no turn limits. */
  readonly listening?: boolean;
  /** Has a hand-written "What does that mean?", so an idiom in it is explained. */
  readonly explained?: boolean;
  /** The learner's name is spliced in before it (one more word). */
  readonly nameSplice?: boolean;
  /** Longer on purpose, as the script marks it (Pip's fast line in Chapter 3). */
  readonly long?: boolean;
}

export type LevelProblemKind =
  | 'turn_too_long'
  | 'too_many_sentences'
  | 'sentence_too_long'
  | 'word_above_band'
  | 'unknown_word'
  | 'idiom'
  | 'idioms_in_scene'
  | 'regional_words'
  | 'band_share';

export interface LevelProblem {
  readonly severity: 'error' | 'warning';
  readonly kind: LevelProblemKind;
  readonly stage: Stage;
  /** The line, or null for a problem with the lines together (a scene's share of hard words). */
  readonly line: Id | null;
  readonly message: string;
  /** The words concerned (above the band, unknown, the idiom). */
  readonly words: readonly string[];
}

export interface LevelCheckOptions {
  /** Words that never count against the band: the season's phrases, the scene's props. */
  readonly allowedWords?: Iterable<string>;
}

// --- Words ---------------------------------------------------------------------------------

const BAND_OF = new Map<string, CefrBand>();
for (const band of CEFR_BANDS) for (const w of CEFR_J[band].split(' ')) BAND_OF.set(w, band);
for (const band of ['A1', 'A2'] as const) {
  for (const w of TOWN.spoken[band].split(' ')) BAND_OF.set(w, band);
}
const NAMES = new Set(TOWN.names.split(' '));
const REGIONAL = new Set(TOWN.regional.split(' '));
const FORMS: Readonly<Record<string, string>> = TOWN.forms;

const UNIT_WORDS =
  'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million';
const UNITS = UNIT_WORDS.split(' ');
const ORDINALS = 'first second third fifth eighth ninth twelfth'.split(' ');
const NUMBERS = new Set([
  ...UNITS,
  ...ORDINALS,
  ...UNITS.map((u) => (u.endsWith('y') ? `${u.slice(0, -1)}ieth` : `${u}th`)),
]);

/** Contractions as the words they stand for; `'s` is dropped (is, has or a possessive). */
const expand = (token: string): string[] => {
  if (token === "can't") return ['can', 'not'];
  if (token === "won't") return ['will', 'not'];
  if (token === "shan't") return ['shall', 'not'];
  if (token === "let's") return ['let', 'us'];
  const m = /^(.+?)(n't|'m|'re|'ve|'ll|'d|'s|s')$/.exec(token);
  if (!m?.[1]) return [token];
  const rest: Record<string, string[]> = {
    "n't": ['not'],
    "'m": ['am'],
    "'re": ['are'],
    "'ve": ['have'],
    "'ll": ['will'],
    "'d": ['would'],
    "'s": [],
    "s'": [],
  };
  return [m[1], ...(rest[m[2] ?? ''] ?? [])];
};

/** Headwords a form may come from, most likely first: plural, past, -ing, comparative. */
const stems = (w: string): string[] => {
  const out: string[] = [];
  const add = (s: string) => s.length > 1 && out.push(s);
  const forms = FORMS[w];
  if (forms) add(forms);
  if (w.endsWith('ies') || w.endsWith('ied')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('ier')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('iest')) add(`${w.slice(0, -4)}y`);
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s')) add(w.slice(0, -1));
  for (const suffix of ['ed', 'er', 'ing', 'est']) {
    if (!w.endsWith(suffix)) continue;
    const base = w.slice(0, -suffix.length);
    add(base);
    add(`${base}e`);
    // A doubled consonant: stopped, running, bigger.
    if (base.length > 2 && base.at(-1) === base.at(-2)) add(base.slice(0, -1));
  }
  if (w.endsWith('ly')) add(w.slice(0, -2));
  return out;
};

type WordClass =
  | { readonly kind: 'band'; readonly band: CefrBand }
  | { readonly kind: 'free' }
  | { readonly kind: 'regional' }
  | { readonly kind: 'unknown' };

/** The hardest of two bands. */
const harder = (a: CefrBand, b: CefrBand): CefrBand => (bandWithin(a, b) ? b : a);

/**
 * The easiest band of a word and the headwords it may be a form of: "found" is B2 as a verb of its
 * own and A1 as the past of "find", and a line means the easy one far more often.
 */
const lookup = (w: string): CefrBand | undefined =>
  [w, ...stems(w)].reduce<CefrBand | undefined>((easiest, s) => {
    const band = BAND_OF.get(s);
    if (band === undefined) return easiest;
    return easiest === undefined || harder(easiest, band) === easiest ? band : easiest;
  }, undefined);

/** What a single word (lower case) is: a band, free (a name, a number, an allowed word), or unknown. */
const classify = (word: string, allowed: ReadonlySet<string>): WordClass => {
  if (/^\d/.test(word) || word === '{name}') return { kind: 'free' };
  if (NAMES.has(word) || NUMBERS.has(word) || allowed.has(word)) return { kind: 'free' };
  if (REGIONAL.has(word)) return { kind: 'regional' };
  const whole = lookup(word);
  if (whole) return { kind: 'band', band: whole };
  const parts = word.includes('-') ? word.split('-') : expand(word);
  if (parts.length === 1 && parts[0] === word) return { kind: 'unknown' };
  let band: CefrBand = 'A1';
  for (const part of parts) {
    const c = classify(part, allowed);
    if (c.kind === 'unknown') return c;
    if (c.kind === 'band') band = harder(band, c.band);
  }
  return { kind: 'band', band };
};

/** The words of a text, lower case, with `{name}` kept as one word. */
export const levelWords = (text: string): string[] =>
  (text
    .toLowerCase()
    .replace(/’/g, "'")
    .match(/\{name\}|[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? []) as string[];

/** The CEFR-J band of a word (its headword's, for a form), or null for a word not in the list. */
export const wordBand = (word: string): CefrBand | null => {
  const c = classify(word.toLowerCase(), new Set());
  return c.kind === 'band' ? c.band : null;
};

// --- Sentences and idioms ------------------------------------------------------------------

/** The sentences of a line, split at . ! ? and …, each as its words. */
const sentences = (text: string): string[][] =>
  text
    .split(/[.!?…]+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s))
    .map(levelWords);

/** A word as its headword, for matching idioms in any form ("goes funny" is "go funny"). */
const headword = (w: string): string => {
  if (BAND_OF.has(w)) return FORMS[w] ?? w;
  return stems(w).find((s) => BAND_OF.has(s)) ?? w;
};

const IDIOMS = TOWN.idioms.map((idiom) => ({ idiom, words: levelWords(idiom).map(headword) }));

/** The idioms in a line, by the list. */
export const idiomsIn = (text: string): string[] => {
  const words = levelWords(text).map(headword);
  return IDIOMS.filter(({ words: idiom }) =>
    words.some((_, i) => idiom.every((w, j) => words[i + j] === w)),
  ).map(({ idiom }) => idiom);
};

/** Regional words in a line: "lah", "aiyah", "shiok", and "love" said to someone ("Cheers, love."). */
const regionalIn = (text: string): string[] => [
  ...levelWords(text).filter((w) => REGIONAL.has(w)),
  ...(text.match(/(?:^|,)\s*love\s*(?=[,.!?]|$)/gi) ?? []).map(() => 'love'),
];

// --- The check -----------------------------------------------------------------------------

const MIN_SENTENCE_WORDS = 3;

const percent = (share: number): string => `${Math.round(share * 1000) / 10}%`;

/** Problems with character lines at a stage, line by line, then for the lines together. */
export const checkLevel = (
  stage: Stage,
  lines: readonly LevelLine[],
  options: LevelCheckOptions = {},
): LevelProblem[] => {
  const guide = LEVEL_GUIDE[stage];
  const rules = guide.characterLines;
  const ceiling = guide.vocabulary.band;
  const allowed = new Set<string>();
  for (const phrase of options.allowedWords ?? []) {
    for (const w of levelWords(phrase)) allowed.add(w);
  }
  const problems: LevelProblem[] = [];
  const report = (
    severity: LevelProblem['severity'],
    kind: LevelProblemKind,
    line: Id | null,
    message: string,
    words: readonly string[] = [],
  ) => problems.push({ severity, kind, stage, line, message, words });

  let running = 0;
  let outside = 0;
  const idioms: string[] = [];
  const regional: string[] = [];

  for (const line of lines) {
    const turnWords = wordCount(line.text, line.nameSplice === true);
    if (!line.listening && !line.long && turnWords > rules.maxWordsPerTurn) {
      report(
        stage === 'visitor' ? 'error' : 'warning',
        'turn_too_long',
        line.id,
        `${turnWords} words in a turn (at most ${rules.maxWordsPerTurn})`,
      );
    }
    const said = sentences(line.text);
    const counted = said.filter((s) => s.length >= MIN_SENTENCE_WORDS).length;
    if (!line.listening && rules.maxSentencesPerTurn !== null) {
      if (counted > rules.maxSentencesPerTurn) {
        report(
          'warning',
          'too_many_sentences',
          line.id,
          `${counted} sentences in a turn (at most ${rules.maxSentencesPerTurn})`,
        );
      }
    }
    const max = rules.maxWordsPerSentence;
    if (max !== null && !line.long) {
      for (const s of said) {
        if (s.length > max) {
          report(
            'warning',
            'sentence_too_long',
            line.id,
            `a sentence of ${s.length} words (at most ${max}): "${s.join(' ')}"`,
          );
        }
      }
    }

    const words = levelWords(line.text);
    running += words.length;
    if (ceiling !== null) {
      const above: string[] = [];
      const unknown: string[] = [];
      for (const w of words) {
        const c = classify(w, allowed);
        if (c.kind === 'unknown') unknown.push(w);
        if (c.kind === 'band' && !bandWithin(c.band, ceiling)) above.push(`${w} (${c.band})`);
      }
      outside += above.length + unknown.length;
      if (above.length > 0) {
        report(
          'warning',
          'word_above_band',
          line.id,
          `above ${ceiling}: ${above.join(', ')}`,
          above,
        );
      }
      if (unknown.length > 0) {
        report(
          'warning',
          'unknown_word',
          line.id,
          `not in the word list: ${unknown.join(', ')}`,
          unknown,
        );
      }
    }

    const found = idiomsIn(line.text);
    idioms.push(...found);
    const explainedOk = rules.idioms === 'rare_explained' && line.explained === true;
    const forbidden =
      rules.idioms === 'none' || (rules.idioms === 'rare_explained' && !explainedOk);
    if (found.length > 0 && forbidden) {
      report(
        stage === 'visitor' ? 'error' : 'warning',
        'idiom',
        line.id,
        rules.idioms === 'none'
          ? `an idiom at ${stage}: ${found.join(', ')}`
          : `an idiom with no explanation: ${found.join(', ')}`,
        found,
      );
    }
    regional.push(...regionalIn(line.text));
  }

  const maxIdioms = rules.maxIdiomsPerScene;
  if (maxIdioms !== null && maxIdioms > 0 && idioms.length > maxIdioms) {
    report(
      'warning',
      'idioms_in_scene',
      null,
      `${idioms.length} idioms (at most ${maxIdioms})`,
      idioms,
    );
  }
  if (regional.length > rules.maxRegionalWordsPerScene) {
    report(
      'warning',
      'regional_words',
      null,
      `${regional.length} regional words (at most ${rules.maxRegionalWordsPerScene}): ${regional.join(', ')}`,
      regional,
    );
  }
  const share = guide.vocabulary.outsideShare;
  if (ceiling !== null && share > 0 && running > 0 && outside / running > share) {
    report(
      'warning',
      'band_share',
      null,
      `${outside} of ${running} words above ${ceiling} (${percent(outside / running)}, at most ${percent(share)})`,
    );
  }
  return problems;
};

// --- Scenes --------------------------------------------------------------------------------

const LISTENING_LINES: ReadonlySet<StoryLine['kind']> = new Set([
  'story',
  'postcard',
  'voicemail',
  'recap',
]);
const LISTENING_SCENES: ReadonlySet<Scene['kind']> = new Set(['story', 'postcard', 'voicemail']);
const VISITOR_SCENES: ReadonlySet<Id> = new Set(Object.values(VISITOR_VERSIONS));
const HAS_VISITOR_VERSION: ReadonlySet<Id> = new Set(Object.keys(VISITOR_VERSIONS));

/** A written line as a line to check (English only: Linh's Vietnamese isn't checked). */
export const levelLineOf = (line: StoryLine): LevelLine | null =>
  line.language !== 'en'
    ? null
    : {
        id: line.id,
        text: line.caption,
        listening: LISTENING_LINES.has(line.kind),
        explained: line.meaning !== null,
        nameSplice: line.nameSplice !== null,
        long: LONG_VISITOR_LINES.includes(line.id),
      };

/** A scene's character lines at one stage, grouped as `checkSceneLevel` checks them. */
export interface SceneLevelGroup {
  readonly stage: Stage;
  /**
   * `written`: the lines written for this stage. `heard`: lines written for Newcomer that a
   * Visitor hears too (a beat with no stage bounds, in a scene with no Visitor version).
   */
  readonly as: 'written' | 'heard';
  readonly lines: readonly (LevelLine & { readonly beat: Id })[];
}

/** The stage a beat's lines are written for. */
const writtenFor = (scene: Scene, beat: Beat, line: StoryLine | null): Stage => {
  if (scene.kind === 'settling' || VISITOR_SCENES.has(scene.id) || beat.maxStage === 'visitor') {
    return 'visitor';
  }
  return line?.take ?? beat.minStage ?? 'newcomer';
};

/** Whether a Visitor hears a beat written for another stage. Placement is never played to one. */
const heardByVisitor = (scene: Scene, beat: Beat): boolean =>
  scene.kind !== 'placement' &&
  !HAS_VISITOR_VERSION.has(scene.id) &&
  stageInRange('visitor', beat.minStage, beat.maxStage);

/** The character lines of a beat: its recording, its answer's model and praise, a recast, an example. */
const beatLines = (scene: Scene, beat: Beat): { line: LevelLine; stored: StoryLine | null }[] => {
  const out: { line: LevelLine; stored: StoryLine | null }[] = [];
  const stored = (id: Id) => {
    const found = findLine(id);
    const line = found ? levelLineOf(found) : null;
    if (found && line) out.push({ line, stored: found });
  };
  if (beat.kind === 'rec') stored(beat.line);
  if (beat.kind === 'gen' && beat.example !== null) {
    const listening = LISTENING_SCENES.has(scene.kind);
    out.push({ line: { id: `${beat.id}:example`, text: beat.example, listening }, stored: null });
  }
  const answer = beat.kind === 'gen' || beat.kind === 'learner' ? beat.answer : null;
  if (answer) {
    if (answer.model !== null) stored(answer.model);
    for (const id of answer.praise) stored(id);
    if (answer.recast !== null) {
      out.push({ line: { id: `${beat.id}:recast`, text: answer.recast }, stored: null });
    }
  }
  return out;
};

/** A scene's character lines, by the stage they are written for, and those a Visitor also hears. */
export const sceneLevelGroups = (scene: Scene): SceneLevelGroup[] => {
  const groups = new Map<
    string,
    { stage: Stage; as: 'written' | 'heard'; lines: SceneLevelGroup['lines'][number][] }
  >();
  const add = (stage: Stage, as: 'written' | 'heard', line: SceneLevelGroup['lines'][number]) => {
    const key = `${as}:${stage}`;
    const group = groups.get(key) ?? { stage, as, lines: [] };
    if (!group.lines.some((l) => l.id === line.id)) group.lines.push(line);
    groups.set(key, group);
  };
  for (const beat of scene.beats) {
    for (const { line, stored } of beatLines(scene, beat)) {
      const stage = writtenFor(scene, beat, stored);
      add(stage, 'written', { ...line, beat: beat.id });
      if (stage !== 'visitor' && heardByVisitor(scene, beat)) {
        add('visitor', 'heard', { ...line, beat: beat.id });
      }
    }
  }
  return [...groups.values()];
};

/** A problem found in a scene, with where it is. */
export interface SceneLevelProblem extends LevelProblem {
  readonly scene: Id;
  readonly beat: Id | null;
  readonly as: SceneLevelGroup['as'];
}

/** Every word of the season's phrases: never counted against a band. */
export const PHRASE_WORDS: readonly string[] = PHRASES.map((p) => p.en);

/**
 * A scene's character lines against the level guide, at the stages they are written for, and at
 * Visitor for the lines a Visitor hears without a Visitor version (all warnings: the gap is the
 * script's to fill, not a broken rule).
 */
export const checkSceneLevel = (
  scene: Scene,
  options: LevelCheckOptions = { allowedWords: PHRASE_WORDS },
): SceneLevelProblem[] =>
  sceneLevelGroups(scene).flatMap((group) => {
    const beatOf = new Map(group.lines.map((l) => [l.id, l.beat]));
    return checkLevel(group.stage, group.lines, options).map((p) => ({
      ...p,
      severity: group.as === 'heard' ? 'warning' : p.severity,
      scene: scene.id,
      beat: p.line === null ? null : (beatOf.get(p.line) ?? null),
      as: group.as,
    }));
  });

/** One problem as a line of a report. */
export const formatLevelProblem = (p: SceneLevelProblem): string =>
  `${p.severity} ${p.stage}${p.as === 'heard' ? ' (heard)' : ''} ${p.scene}${p.beat ? `/${p.beat}` : ''}${p.line && p.line !== p.beat ? ` ${p.line}` : ''} [${p.kind}] ${p.message}`;
