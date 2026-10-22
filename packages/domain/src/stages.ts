import { RESIDENCY_STAGES, STAGES, type Stage } from '@yapling/contracts';

/*
 * The stages (Visitor, then the five residency stages) and how the town talks at each (the cast
 * bible's stage speech settings, the same for every character). CEFR stays inside: nothing here is
 * ever shown as a level.
 */

export const stageIndex = (stage: Stage): number => STAGES.indexOf(stage);

/** The stage after this one; the last stage stays where it is. */
export const nextStage = (stage: Stage): Stage => STAGES[stageIndex(stage) + 1] ?? stage;

/**
 * The stage before this one; Newcomer stays where it is (Visitor is chosen or placed, never a step
 * down), and so does Visitor.
 */
export const previousStage = (stage: Stage): Stage => {
  const floor = Math.min(stageIndex(stage), stageIndex('newcomer'));
  return STAGES[Math.max(floor, stageIndex(stage) - 1)] ?? stage;
};

/** True when `stage` is `atLeast` or later. */
export const isStageAtLeast = (stage: Stage, atLeast: Stage): boolean =>
  stageIndex(stage) >= stageIndex(atLeast);

/**
 * The residency card's number ("Chặng N/5"), counted from Newcomer; null at Visitor, whose card
 * shows no number.
 */
export const residencyNumber = (stage: Stage): number | null => {
  const index = (RESIDENCY_STAGES as readonly Stage[]).indexOf(stage);
  return index < 0 ? null : index + 1;
};

/**
 * Pip's own English. At Visitor, Pip is a Visitor too: new in town, learning alongside the learner
 * and copying what they just said. From Newcomer it tracks one stage below the learner's, so the
 * learner is always the more capable speaker, and it never drops below Newcomer.
 */
export const pipStage = (learner: Stage): Stage =>
  learner === 'visitor' ? 'visitor' : previousStage(learner);

/**
 * "Too easy" or "too hard", said any time: the town moves one stage faster or slower. Placement is
 * only a starting guess. "Too hard" never moves a Newcomer to Visitor on its own: that is one of
 * the choices `tooHardOffers` gives, and the learner picks it.
 */
export const adjustStage = (stage: Stage, feedback: 'too_easy' | 'too_hard'): Stage =>
  feedback === 'too_easy' ? nextStage(stage) : previousStage(stage);

/**
 * A choice on the "Khó quá" sheet. `slower`: "Nói chậm hơn", stay at the stage with the slower
 * pace. `practise_with_linh`: "Tập với Linh trước", become a Visitor and open Settling in (the scene
 * in progress saves its place).
 */
export type TooHardOffer =
  { readonly kind: 'slower' } | { readonly kind: 'practise_with_linh'; readonly to: 'visitor' };

/**
 * What "too hard" offers at a stage, in the order the sheet shows them. Slower pace always; at
 * Newcomer also practising with Linh as a Visitor. A Visitor is already at the gentlest stage.
 */
export const tooHardOffers = (stage: Stage): readonly TooHardOffer[] =>
  stage === 'newcomer'
    ? [{ kind: 'slower' }, { kind: 'practise_with_linh', to: 'visitor' }]
    : [{ kind: 'slower' }];

/** `one_short_sentence`: Visitor's one sentence, the character's own answer first, then the ask. */
export type SentenceLength =
  | 'one_short_sentence'
  | 'short_one_idea'
  | 'one_or_two_ideas'
  | 'normal'
  | 'normal_overlapping'
  | 'natural';
export type IdiomUse = 'none' | 'rare_explained' | 'some' | 'natural';
export type Interruptions = 'never' | 'rarely_gently' | 'yes_then_yield' | 'yes';

/**
 * Thinking time is the learner's: silence never ends, moves or fails a turn. After this long a
 * quiet learner may be offered the phrase hint once, silently, at the stages that offer it
 * (Newcomer and Neighbour; a Visitor's card is already showing).
 */
export const LONG_QUIET_MS = 18_000;

/**
 * When a phrase hint shows during a call. `from_start`: the say-this card (and its choices) is up
 * as soon as the turn opens and stays up (Visitor). `after_pause`: offered once, on its own, after
 * the learner has been quiet for `pauseMs` (the long quiet). `on_request`: only when the learner
 * asks.
 */
export type HintPolicy =
  | { readonly kind: 'from_start' }
  | { readonly kind: 'after_pause'; readonly pauseMs: number }
  | { readonly kind: 'on_request' };

export interface SpeechSettings {
  readonly stage: Stage;
  /** Target words per minute for every character's lines. */
  readonly wordsPerMinute: number;
  readonly sentenceLength: SentenceLength;
  readonly idioms: IdiomUse;
  readonly interruptions: Interruptions;
  readonly hint: HintPolicy;
  /**
   * The cast speed as a TTS speed factor (1 is the voice's natural rate). Local runs a range
   * (1.0–1.1×, overlap allowed); the other stages have one value, so `min === max`.
   */
  readonly ttsSpeed: { readonly min: number; readonly max: number };
  /** Character turns stay under ~25 words at every stage (8 at Visitor): the learner talks most. */
  readonly maxWordsPerTurn: number;
  /**
   * Seconds of pause the live voice puts between phrases (after , . ? !), or null for none. The
   * cast voices run too fast for the slow stages even at their TTS speed, so a short break slows
   * the delivery without stretching the words.
   */
  readonly phraseBreakSeconds: number | null;
}

const MAX_WORDS_PER_TURN = 25;
/** Visitor: one short sentence a turn; an A0–A1 listener loses a longer line. */
const VISITOR_MAX_WORDS_PER_TURN = 8;

/** The cast bible's stage speech settings table, row by row. */
export const SPEECH_SETTINGS: Readonly<Record<Stage, SpeechSettings>> = {
  // The TTS floor (ElevenLabs' slowest) with long phrase breaks; recorded lines run at 100 wpm or
  // slower. Mei keeps one "lah" and Bea one "love" a scene, which the script carries, not a setting.
  visitor: {
    stage: 'visitor',
    wordsPerMinute: 85,
    sentenceLength: 'one_short_sentence',
    idioms: 'none',
    interruptions: 'never',
    hint: { kind: 'from_start' },
    ttsSpeed: { min: 0.7, max: 0.7 },
    maxWordsPerTurn: VISITOR_MAX_WORDS_PER_TURN,
    phraseBreakSeconds: 0.5,
  },
  newcomer: {
    stage: 'newcomer',
    wordsPerMinute: 110,
    sentenceLength: 'short_one_idea',
    idioms: 'none',
    interruptions: 'never',
    hint: { kind: 'after_pause', pauseMs: LONG_QUIET_MS },
    ttsSpeed: { min: 0.8, max: 0.8 },
    maxWordsPerTurn: MAX_WORDS_PER_TURN,
    phraseBreakSeconds: 0.35,
  },
  neighbour: {
    stage: 'neighbour',
    wordsPerMinute: 130,
    sentenceLength: 'one_or_two_ideas',
    idioms: 'rare_explained',
    interruptions: 'never',
    hint: { kind: 'after_pause', pauseMs: LONG_QUIET_MS },
    ttsSpeed: { min: 0.9, max: 0.9 },
    maxWordsPerTurn: MAX_WORDS_PER_TURN,
    phraseBreakSeconds: 0.2,
  },
  regular: {
    stage: 'regular',
    wordsPerMinute: 150,
    sentenceLength: 'normal',
    idioms: 'some',
    interruptions: 'rarely_gently',
    hint: { kind: 'on_request' },
    ttsSpeed: { min: 1.0, max: 1.0 },
    maxWordsPerTurn: MAX_WORDS_PER_TURN,
    phraseBreakSeconds: null,
  },
  local: {
    stage: 'local',
    wordsPerMinute: 165,
    sentenceLength: 'normal_overlapping',
    idioms: 'natural',
    interruptions: 'yes_then_yield',
    hint: { kind: 'on_request' },
    ttsSpeed: { min: 1.0, max: 1.1 },
    maxWordsPerTurn: MAX_WORDS_PER_TURN,
    phraseBreakSeconds: null,
  },
  // "Natural (~170+)": the voices at a natural conversational pace. ElevenLabs tops out at 1.2.
  voice: {
    stage: 'voice',
    wordsPerMinute: 170,
    sentenceLength: 'natural',
    idioms: 'natural',
    interruptions: 'yes',
    hint: { kind: 'on_request' },
    ttsSpeed: { min: 1.1, max: 1.2 },
    maxWordsPerTurn: MAX_WORDS_PER_TURN,
    phraseBreakSeconds: null,
  },
};

export const speechSettings = (stage: Stage): SpeechSettings => SPEECH_SETTINGS[stage];

/**
 * The TTS speed factor for a character line. Normal calls use the bottom of the stage's range;
 * Hard mode (fast, interrupting, from Local) uses the top.
 */
export const ttsSpeedFactor = (stage: Stage, mode: 'normal' | 'hard' = 'normal'): number => {
  const { min, max } = SPEECH_SETTINGS[stage].ttsSpeed;
  return mode === 'hard' && isStageAtLeast(stage, 'local') ? max : min;
};

/**
 * The hint policy for a stage: shown from the start at Visitor, offered after the long quiet at
 * Newcomer and Neighbour, on request after.
 */
export const hintPolicy = (stage: Stage): HintPolicy => SPEECH_SETTINGS[stage].hint;

/**
 * Whether a phrase hint shows now. A learner can always ask; at Visitor it shows from the start;
 * at Newcomer and Neighbour it is also offered on its own after the long quiet.
 */
export const shouldShowHint = (stage: Stage, silenceMs: number, requested: boolean): boolean => {
  if (requested) return true;
  const policy = hintPolicy(stage);
  if (policy.kind === 'from_start') return true;
  return policy.kind === 'after_pause' && silenceMs >= policy.pauseMs;
};
