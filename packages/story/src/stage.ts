import type { Stage } from '@yapling/contracts';
import { glossPolicy, isStageAtLeast, SPEECH_SETTINGS } from '@yapling/domain';

import type { StageValue } from './types';

/**
 * One row of the cast bible's stage speech settings, as words for persona prompts, with the
 * runner's behaviour taken from the learning model (`SPEECH_SETTINGS`, `glossPolicy`).
 */
export interface StageSpeech {
  readonly label: string;
  readonly wordsPerMinute: string;
  readonly sentences: string;
  readonly idioms: string;
  readonly interruptions: string;
  readonly hints: string;
  /**
   * Whether a long quiet offers the phrase hint, once and silently (otherwise hints come only when
   * asked). Silence never counts as a try and never brings a spoken nudge.
   */
  readonly hintsOnSilence: boolean;
  /** Whether hints carry the first-language gloss (line-level help fades from Regular). */
  readonly glossHints: boolean;
}

const PROSE: Readonly<Record<Stage, Omit<StageSpeech, 'hintsOnSilence' | 'glossHints'>>> = {
  newcomer: {
    label: 'Newcomer',
    wordsPerMinute: '~110',
    sentences: 'short, one idea',
    idioms: 'none',
    interruptions: 'never',
    hints: 'phrase hint offered quietly after a long pause, or when asked',
  },
  neighbour: {
    label: 'Neighbour',
    wordsPerMinute: '~130',
    sentences: 'one or two ideas',
    idioms: 'rare, explained',
    interruptions: 'never',
    hints: 'hint offered quietly after a long pause, or when asked',
  },
  regular: {
    label: 'Regular',
    wordsPerMinute: '~150',
    sentences: 'normal',
    idioms: 'some',
    interruptions: 'rarely, gently',
    hints: 'only when asked',
  },
  local: {
    label: 'Local',
    wordsPerMinute: '~165',
    sentences: 'normal, overlapping',
    idioms: 'natural',
    interruptions: 'yes, then yield',
    hints: 'only when asked',
  },
  voice: {
    label: 'Voice',
    wordsPerMinute: 'natural (~170+)',
    sentences: 'natural',
    idioms: 'natural',
    interruptions: 'yes',
    hints: 'none unless asked',
  },
};

const speech = (stage: Stage): StageSpeech => {
  const { hint } = SPEECH_SETTINGS[stage];
  return {
    ...PROSE[stage],
    hintsOnSilence: hint.kind === 'after_pause',
    glossHints: glossPolicy(stage, 'captions', { firstLanguage: 'vi' }).unit === 'line',
  };
};

export const STAGE_SPEECH: Readonly<Record<Stage, StageSpeech>> = {
  newcomer: speech('newcomer'),
  neighbour: speech('neighbour'),
  regular: speech('regular'),
  local: speech('local'),
  voice: speech('voice'),
};

/** The row as one line for a prompt: "~110 words a minute; sentences short, one idea; …". */
export const stageSpeechLine = (stage: Stage): string => {
  const s = STAGE_SPEECH[stage];
  return `${s.wordsPerMinute} words a minute; sentences ${s.sentences}; idioms ${s.idioms}; interruptions ${s.interruptions}; hints ${s.hints}`;
};

/** Whether a beat limited to `min`…`max` plays at `stage`. */
export const stageInRange = (stage: Stage, min?: Stage, max?: Stage): boolean =>
  (min === undefined || isStageAtLeast(stage, min)) &&
  (max === undefined || isStageAtLeast(max, stage));

export const stageValue = (value: StageValue, stage: Stage): number =>
  value.byStage?.[stage] ?? value.base;
