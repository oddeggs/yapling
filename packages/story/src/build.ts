import type { CharacterId, Id, Stage } from '@yapling/contracts';

import type {
  Answer,
  Fallback,
  GenBeat,
  GlossedText,
  LearnerBeat,
  Meaning,
  RecBeat,
  Scene,
  StageValue,
  TargetErrorMode,
  UiBeat,
  UiSpec,
} from './types';

/* Small constructors that keep the season data readable. */

export interface BeatOptions {
  readonly next?: Id;
  readonly minStage?: Stage;
  readonly maxStage?: Stage;
  readonly draft?: boolean;
}

/** Silences and hinted errors before the fallback line moves the scene on. */
export const DEFAULT_MAX_TRIES = 3;

export const rec = (id: Id, line: Id, options: BeatOptions = {}): RecBeat => ({
  ...options,
  id,
  kind: 'rec',
  line,
});

export interface GenOptions extends BeatOptions {
  readonly constraints?: readonly string[];
  readonly example?: string;
  readonly resolution?: string;
  readonly answer?: Answer;
}

export const gen = (
  id: Id,
  speaker: CharacterId,
  intent: string,
  { constraints = [], example, resolution, answer, ...options }: GenOptions = {},
): GenBeat => ({
  ...options,
  id,
  kind: 'gen',
  speaker,
  intent,
  constraints,
  example: example ?? null,
  resolution: resolution ?? null,
  answer: answer ?? null,
});

export const learner = (id: Id, answer: Answer, options: BeatOptions = {}): LearnerBeat => ({
  ...options,
  id,
  kind: 'learner',
  answer,
});

export const ui = (id: Id, spec: UiSpec, options: BeatOptions = {}): UiBeat => ({
  ...options,
  id,
  kind: 'ui',
  ui: spec,
});

export interface AnswerSpec {
  readonly listener: CharacterId;
  readonly expects: string;
  readonly phrases?: readonly Id[];
  readonly canDo?: Id;
  readonly timer?: StageValue;
  readonly onTargetError?: TargetErrorMode;
  readonly hint?: GlossedText;
  readonly maxTries?: number;
  readonly fallback: Fallback;
  readonly fine?: Id;
  readonly meaning?: Meaning;
}

export const answer = (spec: AnswerSpec): Answer => ({
  listener: spec.listener,
  expects: spec.expects,
  phrases: spec.phrases ?? [],
  canDo: spec.canDo ?? null,
  timer: spec.timer ?? null,
  exits: {
    fine: spec.fine === undefined ? {} : { to: spec.fine },
    targetError: { mode: spec.onTargetError ?? 'correct' },
    silent: {
      hint: spec.hint ?? null,
      maxTries: spec.maxTries ?? DEFAULT_MAX_TRIES,
      fallback: spec.fallback,
    },
    meaning: spec.meaning ?? null,
  },
});

export type SceneSpec = Omit<Scene, 'canDos' | 'phrases' | 'draft'> &
  Partial<Pick<Scene, 'canDos' | 'phrases' | 'draft'>>;

export const scene = (spec: SceneSpec): Scene => ({
  canDos: [],
  phrases: [],
  draft: false,
  ...spec,
});

/** A timer of `base` seconds with per-stage overrides. */
export const seconds = (base: number, byStage?: StageValue['byStage']): StageValue =>
  byStage === undefined ? { base } : { base, byStage };
