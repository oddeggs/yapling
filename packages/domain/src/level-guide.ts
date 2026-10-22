import type { Stage } from '@yapling/contracts';

import { SPEECH_SETTINGS, type IdiomUse, type SpeechSettings } from './stages';

/*
 * The level guide: what the town asks of a learner at each stage, and how the cast writes for them.
 * One row per stage, read by whoever writes lines (by hand, or the story engine's prompts) and by
 * the level check, so the rule a writer reads is the rule the code checks. It extends the stage
 * speech settings (`SPEECH_SETTINGS`, the cast bible's table) and never restates them: `speech` is
 * that row itself. CEFR stays inside, as everywhere: nothing here is shown to a learner.
 *
 * Vocabulary bands are CEFR-J Wordlist bands (A1–B2; `packages/domain/data/README.md` has the
 * source and its terms). Where the docs give a count ("the 1,000 most common words"), the count is
 * kept as `aboutWords`, guidance for writers; the check reads the band.
 */

/** A CEFR-J Wordlist band, easiest first. A word in no band is above B2 or not in the list. */
export const CEFR_BANDS = ['A1', 'A2', 'B1', 'B2'] as const;
export type CefrBand = (typeof CEFR_BANDS)[number];

/** True when `band` is no harder than `ceiling`. */
export const bandWithin = (band: CefrBand, ceiling: CefrBand): boolean =>
  CEFR_BANDS.indexOf(band) <= CEFR_BANDS.indexOf(ceiling);

/** The kinds of task a turn can set, each tied to the stages it fits. */
export const TASK_TYPES = {
  read_card: 'read one of two say-this cards aloud',
  yes_no: 'answer yes or no',
  repeat_after_model: 'say it after the character has said it',
  say_number: 'say a number, a time or a price',
  order_one_thing: 'order one thing',
  answer_with_phrase: 'answer with one phrase',
  ask_one_question: 'ask one question',
  teach_pip: 'teach Pip a word or a phrase',
  polite_no: 'say no politely',
  pass_it_on: 'Pass it on: the same story three times, shorter each time',
  small_talk: 'keep small talk going for about two minutes',
  complaint: 'describe a problem and ask for it to be fixed',
  follow_instructions: 'follow instructions and confirm them',
  standup_update: 'give a one-minute update',
  listening_checkpoint: 'a listening checkpoint: catch the details of a message',
  opinion_with_reasons: 'give an opinion with two reasons',
  tell_story: 'tell a story with a point',
  walk_through_process: 'walk someone through a process',
  push_back_once: 'push back once, on a deadline or a request',
  negotiate: 'negotiate a deal',
  handle_interruption: 'handle an interruption and carry on',
  present_and_questions: 'present for a few minutes and take questions',
  hold_ground: 'hold your ground kindly',
  persuade: 'persuade a group',
  de_escalate: 'calm a heated talk down',
  chair_discussion: 'chair a town discussion',
  host_radio: 'host a radio segment',
} as const;
export type TaskType = keyof typeof TASK_TYPES;

/** A range of numbers; `max: null` is open. */
export interface Span {
  readonly min: number;
  readonly max: number | null;
}

export interface VocabularyGuide {
  /**
   * The hardest CEFR-J band a character line uses without a gloss; null: open (no check). Names,
   * numbers, the season's phrases and the scene's prop words don't count against it.
   */
  readonly band: CefrBand | null;
  /** The docs' count, for writers: "about the N most common words". Null: open. */
  readonly aboutWords: number | null;
  /**
   * The share of a scene's running words that may sit above `band` (each one glossed). 0 at
   * Visitor: every word outside the band is a name, a number, a phrase or a glossed prop.
   */
  readonly outsideShare: number;
  /** New phrases (chunks) a week. */
  readonly chunksPerWeek: Span;
}

export interface CharacterLineGuide {
  /** The most words in one sentence of a character line; null: natural. */
  readonly maxWordsPerSentence: number | null;
  /**
   * The most sentences in a turn; null: no count. Fragments under three words ("Oh!", "Sit, sit.")
   * aren't counted, so "Oh! Hi. Can you help me?" is one sentence.
   */
  readonly maxSentencesPerTurn: number | null;
  /** From the speech settings: 8 at Visitor, ~25 after. Turns only, not stories or voicemails. */
  readonly maxWordsPerTurn: number;
  /** The character says their own answer first, then asks ("I'm Linh. And you?"). */
  readonly modelThenAsk: boolean;
  /** From the speech settings. */
  readonly idioms: IdiomUse;
  /** The most idioms in one scene; null: as many as sound natural. 0 where idioms are none. */
  readonly maxIdiomsPerScene: number | null;
  /** Light regional words ("lah", "love") a scene may carry, whatever the stage. */
  readonly maxRegionalWordsPerScene: number;
}

/** What a learner's turn looks like at the stage. */
export interface LearnerTurnGuide {
  readonly description: string;
  /** Words in a typical answer; null where the turn is measured in time. */
  readonly words: Span | null;
  /** Seconds a long turn may run; null where the turn is measured in words. */
  readonly seconds: Span | null;
  /** Say-this cards are up from the start (two choices, the first language under each). */
  readonly cards: boolean;
  /** The longest timer a timed round may set, in seconds; null: no timers. */
  readonly maxTimerSeconds: number | null;
}

export interface LevelGuide {
  readonly stage: Stage;
  /** The CEFR range the stage stands for (inside only). */
  readonly cefr: string;
  readonly understands: readonly string[];
  readonly says: readonly string[];
  readonly vocabulary: VocabularyGuide;
  /** The structures a character line may use; anything harder is rephrased. Empty: open. */
  readonly grammar: readonly string[];
  /** Structures a character line keeps out at this stage. */
  readonly grammarNever: readonly string[];
  readonly characterLines: CharacterLineGuide;
  readonly learnerTurn: LearnerTurnGuide;
  /** The stage speech settings row (pace, TTS speed, phrase breaks, hints, interruptions). */
  readonly speech: SpeechSettings;
  /** The slowest recorded lines must run, in words a minute; null: the voice's own pace. */
  readonly recordedMaxWordsPerMinute: number | null;
  /** Errors are corrected (the listener repeats them back as a question) or only recast. */
  readonly corrections: 'recast_only' | 'gentle_question';
  readonly tasks: readonly TaskType[];
  readonly never: readonly string[];
}

/*
 * Decisions where the docs are silent, or disagree:
 * - Bands by CEFR label (the journey table), not by the story-engine counts: Newcomer is A2, so
 *   A2 words are at its level. The counts stay as `aboutWords`. Visitor's "about 300 words" has no
 *   bundlable frequency list behind it, so the check uses A1 and every Visitor line is glossed.
 * - Regular is B1/B1+: the band stays B1 with a larger outside share for work words.
 * - Outside shares follow the 95–98% known-word coverage rule of thumb for easy listening.
 * - Visitor timers: the story-engine row says "no timers", but week 1's Visitor Pass it on runs
 *   30/25/20 s and the every-week plan keeps "no timers longer than week 1's". Timers up to 30 s.
 * - Visitor sentences aren't counted: the 8-word turn already keeps it to one short sentence, and
 *   model-then-ask lines ("I'm Linh. And you?") are two by their full stops.
 * - Idioms per scene: none where idioms are none, one at Neighbour (explained), two at Regular
 *   (the story-engine row), open from Local.
 */
export const LEVEL_GUIDE: Readonly<Record<Stage, LevelGuide>> = {
  visitor: {
    stage: 'visitor',
    cefr: 'A0–A1',
    understands: [
      'hello and names',
      'yes/no questions',
      'numbers, prices and times',
      'one-thing orders',
      '"again" and "slowly"',
    ],
    says: [
      'one to four words, read from a card',
      'hello and their name',
      'yes or no',
      'please and thank you',
      'a number',
      'one order',
      "where they're from",
    ],
    vocabulary: {
      band: 'A1',
      aboutWords: 300,
      outsideShare: 0,
      chunksPerWeek: { min: 1, max: 2 },
    },
    grammar: ['be in the present', "I'm…", 'Can I…?', 'please', 'imperatives'],
    grammarNever: ['past tense', 'open questions without cards'],
    characterLines: {
      maxWordsPerSentence: 8,
      maxSentencesPerTurn: null,
      maxWordsPerTurn: SPEECH_SETTINGS.visitor.maxWordsPerTurn,
      modelThenAsk: true,
      idioms: SPEECH_SETTINGS.visitor.idioms,
      maxIdiomsPerScene: 0,
      maxRegionalWordsPerScene: 1,
    },
    learnerTurn: {
      description: 'a card read aloud; any try with the right word passes',
      words: { min: 1, max: 4 },
      seconds: null,
      cards: true,
      maxTimerSeconds: 30,
    },
    speech: SPEECH_SETTINGS.visitor,
    recordedMaxWordsPerMinute: 100,
    corrections: 'recast_only',
    tasks: ['read_card', 'yes_no', 'repeat_after_model', 'say_number', 'order_one_thing'],
    never: [
      'open questions without cards',
      'idioms',
      'corrections (every error is recast)',
      "timers longer than week 1's Pass it on (30 s)",
    ],
  },
  newcomer: {
    stage: 'newcomer',
    cefr: 'A2',
    understands: ['short, clear requests and stories about everyday things, at slow speed'],
    says: [
      'a phrase or one sentence',
      'introduce themselves',
      'order and change an order',
      'ask for help',
      'say what they did',
    ],
    vocabulary: {
      band: 'A2',
      aboutWords: 1000,
      outsideShare: 0.02,
      chunksPerWeek: { min: 3, max: 5 },
    },
    grammar: [
      'present simple',
      'past simple (regular and common irregular)',
      'going to',
      'can',
      'wh- questions',
    ],
    grammarNever: ['present perfect', 'conditionals', 'passives'],
    characterLines: {
      maxWordsPerSentence: 12,
      maxSentencesPerTurn: 2,
      maxWordsPerTurn: SPEECH_SETTINGS.newcomer.maxWordsPerTurn,
      modelThenAsk: false,
      idioms: SPEECH_SETTINGS.newcomer.idioms,
      maxIdiomsPerScene: 0,
      maxRegionalWordsPerScene: 1,
    },
    learnerTurn: {
      description: '3–10 words, or Pass it on at 90/60/45 s',
      words: { min: 3, max: 10 },
      seconds: { min: 45, max: 90 },
      cards: false,
      maxTimerSeconds: 90,
    },
    speech: SPEECH_SETTINGS.newcomer,
    recordedMaxWordsPerMinute: null,
    corrections: 'gentle_question',
    tasks: ['answer_with_phrase', 'ask_one_question', 'teach_pip', 'polite_no', 'pass_it_on'],
    never: ['idioms', 'interruptions', 'two questions in one turn'],
  },
  neighbour: {
    stage: 'neighbour',
    cefr: 'A2+ / B1',
    understands: ['normal-pace small talk', 'simple instructions', 'a 40-second voicemail'],
    says: [
      '1–3 sentences',
      'keep small talk going',
      'describe a problem',
      'give a 1-minute update',
    ],
    vocabulary: {
      band: 'B1',
      aboutWords: 2000,
      outsideShare: 0.03,
      chunksPerWeek: { min: 4, max: 5 },
    },
    grammar: [
      'present perfect (simple)',
      'past continuous',
      'comparatives',
      'will',
      'should',
      'first conditional',
    ],
    grammarNever: ['second and third conditionals', 'reported speech'],
    characterLines: {
      maxWordsPerSentence: 15,
      maxSentencesPerTurn: null,
      maxWordsPerTurn: SPEECH_SETTINGS.neighbour.maxWordsPerTurn,
      modelThenAsk: false,
      idioms: SPEECH_SETTINGS.neighbour.idioms,
      maxIdiomsPerScene: 1,
      maxRegionalWordsPerScene: 1,
    },
    learnerTurn: {
      description: 'up to a minute',
      words: null,
      seconds: { min: 0, max: 60 },
      cards: false,
      maxTimerSeconds: 75,
    },
    speech: SPEECH_SETTINGS.neighbour,
    recordedMaxWordsPerMinute: null,
    corrections: 'gentle_question',
    tasks: [
      'small_talk',
      'complaint',
      'follow_instructions',
      'standup_update',
      'listening_checkpoint',
    ],
    never: ['interruptions', 'unexplained idioms'],
  },
  regular: {
    stage: 'regular',
    cefr: 'B1 / B1+',
    understands: [
      'normal-pace talk with some idioms',
      'a structured interview',
      'a short radio item',
    ],
    says: [
      'an opinion with two reasons',
      'a story with a point',
      '"Tell me about yourself" in 90 s',
    ],
    vocabulary: {
      band: 'B1',
      aboutWords: 3000,
      outsideShare: 0.05,
      chunksPerWeek: { min: 5, max: 5 },
    },
    grammar: [
      'present perfect continuous',
      'second conditional',
      'simple passive',
      'reported speech',
      'might/must for guessing',
    ],
    grammarNever: ['third and mixed conditionals'],
    characterLines: {
      maxWordsPerSentence: 20,
      maxSentencesPerTurn: null,
      maxWordsPerTurn: SPEECH_SETTINGS.regular.maxWordsPerTurn,
      modelThenAsk: false,
      idioms: SPEECH_SETTINGS.regular.idioms,
      maxIdiomsPerScene: 2,
      maxRegionalWordsPerScene: 1,
    },
    learnerTurn: {
      description: '30–90 s',
      words: null,
      seconds: { min: 30, max: 90 },
      cards: false,
      maxTimerSeconds: 90,
    },
    speech: SPEECH_SETTINGS.regular,
    recordedMaxWordsPerMinute: null,
    corrections: 'gentle_question',
    tasks: ['opinion_with_reasons', 'tell_story', 'walk_through_process', 'push_back_once'],
    never: ['piling on idioms (two at most in a scene)'],
  },
  local: {
    stage: 'local',
    cefr: 'B2',
    understands: [
      'fast speech',
      'overlapping talk',
      'interruptions',
      'regional words from context',
    ],
    says: ['disagree politely', 'negotiate', 'present for 3 minutes', 'summarise a deal'],
    vocabulary: {
      band: 'B2',
      aboutWords: 5000,
      outsideShare: 0.05,
      chunksPerWeek: { min: 5, max: 6 },
    },
    grammar: [
      'third and mixed conditionals',
      'a range of passives and modals',
      'hedging',
      'discourse markers',
    ],
    grammarNever: [],
    characterLines: {
      maxWordsPerSentence: null,
      maxSentencesPerTurn: null,
      maxWordsPerTurn: SPEECH_SETTINGS.local.maxWordsPerTurn,
      modelThenAsk: false,
      idioms: SPEECH_SETTINGS.local.idioms,
      maxIdiomsPerScene: null,
      maxRegionalWordsPerScene: 1,
    },
    learnerTurn: {
      description: 'up to 3 minutes',
      words: null,
      seconds: { min: 0, max: 180 },
      cards: false,
      maxTimerSeconds: 180,
    },
    speech: SPEECH_SETTINGS.local,
    recordedMaxWordsPerMinute: null,
    corrections: 'gentle_question',
    tasks: ['negotiate', 'handle_interruption', 'present_and_questions', 'hold_ground'],
    never: ["an interruption the learner can't win back"],
  },
  voice: {
    stage: 'voice',
    cefr: 'B2+ / C1',
    understands: ['everyone, at natural speed, mixed accents'],
    says: [
      'persuade a group',
      'run a meeting',
      'explain something complex simply',
      'give feedback',
    ],
    vocabulary: {
      band: null,
      aboutWords: null,
      outsideShare: 1,
      chunksPerWeek: { min: 6, max: 6 },
    },
    grammar: [],
    grammarNever: [],
    characterLines: {
      maxWordsPerSentence: null,
      maxSentencesPerTurn: null,
      maxWordsPerTurn: SPEECH_SETTINGS.voice.maxWordsPerTurn,
      modelThenAsk: false,
      idioms: SPEECH_SETTINGS.voice.idioms,
      maxIdiomsPerScene: null,
      maxRegionalWordsPerScene: 1,
    },
    learnerTurn: {
      description: 'open',
      words: null,
      seconds: null,
      cards: false,
      maxTimerSeconds: null,
    },
    speech: SPEECH_SETTINGS.voice,
    recordedMaxWordsPerMinute: null,
    corrections: 'gentle_question',
    tasks: ['persuade', 'de_escalate', 'chair_discussion', 'host_radio'],
    never: ['anything that makes the learner the student again'],
  },
};

export const levelGuide = (stage: Stage): LevelGuide => LEVEL_GUIDE[stage];
