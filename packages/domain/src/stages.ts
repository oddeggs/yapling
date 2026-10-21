import { STAGES, type Stage } from '@yapling/contracts';

/*
 * The five residency stages and how the town talks at each (the cast bible's stage speech
 * settings, the same for every character). CEFR stays inside: nothing here is ever shown as a level.
 */

export const stageIndex = (stage: Stage): number => STAGES.indexOf(stage);

/** The stage after this one; the last stage stays where it is. */
export const nextStage = (stage: Stage): Stage => STAGES[stageIndex(stage) + 1] ?? stage;

/** The stage before this one; Newcomer stays where it is. */
export const previousStage = (stage: Stage): Stage =>
  STAGES[Math.max(0, stageIndex(stage) - 1)] ?? stage;

/** True when `stage` is `atLeast` or later. */
export const isStageAtLeast = (stage: Stage, atLeast: Stage): boolean =>
  stageIndex(stage) >= stageIndex(atLeast);

/**
 * Pip's own English tracks one stage below the learner's, so the learner is always the more
 * capable speaker (Pip never drops below Newcomer).
 */
export const pipStage = (learner: Stage): Stage => previousStage(learner);

/**
 * "Too easy" or "too hard", said any time: the town moves one stage faster or slower. Placement is
 * only a starting guess.
 */
export const adjustStage = (stage: Stage, feedback: 'too_easy' | 'too_hard'): Stage =>
  feedback === 'too_easy' ? nextStage(stage) : previousStage(stage);

export type SentenceLength =
  'short_one_idea' | 'one_or_two_ideas' | 'normal' | 'normal_overlapping' | 'natural';
export type IdiomUse = 'none' | 'rare_explained' | 'some' | 'natural';
export type Interruptions = 'never' | 'rarely_gently' | 'yes_then_yield' | 'yes';

/**
 * When a phrase hint slides up during a call. `after_pause`: on its own once the learner has been
 * silent for `pauseMs`. `on_request`: only when the learner asks.
 */
export type HintPolicy =
  { readonly kind: 'after_pause'; readonly pauseMs: number } | { readonly kind: 'on_request' };

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
  /** Character turns stay under ~25 words at every stage: the learner talks most. */
  readonly maxWordsPerTurn: number;
  /**
   * Seconds of pause the live voice puts between phrases (after , . ? !), or null for none. The
   * cast voices run too fast for the slow stages even at their TTS speed, so a short break slows
   * the delivery without stretching the words.
   */
  readonly phraseBreakSeconds: number | null;
}

const MAX_WORDS_PER_TURN = 25;

/** The cast bible's stage speech settings table, row by row. */
export const SPEECH_SETTINGS: Readonly<Record<Stage, SpeechSettings>> = {
  newcomer: {
    stage: 'newcomer',
    wordsPerMinute: 110,
    sentenceLength: 'short_one_idea',
    idioms: 'none',
    interruptions: 'never',
    hint: { kind: 'after_pause', pauseMs: 4_000 },
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
    hint: { kind: 'after_pause', pauseMs: 6_000 },
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

/** The hint policy for a stage (4 s Newcomer, 6 s Neighbour, on request after). */
export const hintPolicy = (stage: Stage): HintPolicy => SPEECH_SETTINGS[stage].hint;

/**
 * Whether a phrase hint shows now. A learner can always ask; at Newcomer and Neighbour it also
 * shows on its own after the stage's pause.
 */
export const shouldShowHint = (stage: Stage, silenceMs: number, requested: boolean): boolean => {
  if (requested) return true;
  const policy = hintPolicy(stage);
  return policy.kind === 'after_pause' && silenceMs >= policy.pauseMs;
};
