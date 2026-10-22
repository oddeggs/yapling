import type { CharacterId, Id, Stage } from '@yapling/contracts';

import type {
  Answer,
  Fallback,
  GenBeat,
  GlossedText,
  LearnerBeat,
  Meaning,
  RecBeat,
  ReplayMode,
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

export interface RecOptions extends BeatOptions {
  /** Said again one speed step slower, after someone asked. */
  readonly slower?: boolean;
}

export const rec = (id: Id, line: Id, options: RecOptions = {}): RecBeat => ({
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
  readonly choices?: readonly GlossedText[];
  readonly accept?: readonly string[];
  readonly showHint?: Answer['showHint'];
  readonly model?: Id;
  readonly praise?: readonly Id[];
  readonly recast?: string;
  readonly onReplay?: ReplayMode;
  readonly task?: GlossedText;
  readonly scored?: boolean;
}

export const answer = (spec: AnswerSpec): Answer => ({
  listener: spec.listener,
  expects: spec.expects,
  phrases: spec.phrases ?? [],
  canDo: spec.canDo ?? null,
  timer: spec.timer ?? null,
  choices: spec.choices ?? [],
  accept: spec.accept ?? [],
  showHint: spec.showHint ?? 'stage',
  model: spec.model ?? null,
  praise: spec.praise ?? [],
  recast: spec.recast ?? null,
  onReplay: spec.onReplay ?? 'replay',
  task: spec.task ?? null,
  scored: spec.scored ?? true,
  exits: {
    fine: spec.fine === undefined ? {} : { to: spec.fine },
    targetError: { mode: spec.onTargetError ?? 'correct' },
    silent: {
      hint: spec.hint ?? spec.choices?.[0] ?? null,
      maxTries: spec.maxTries ?? DEFAULT_MAX_TRIES,
      fallback: spec.fallback,
    },
    meaning: spec.meaning ?? null,
  },
});

/** A say-this card turn: the cards from the start, passed by their words, never corrected. */
export interface CardSpec {
  readonly listener: CharacterId;
  /** One or two cards to read aloud. */
  readonly choices: readonly [GlossedText] | readonly [GlossedText, GlossedText];
  readonly accept: readonly string[];
  /** What a fine answer is, for logs and the persona; the cards read aloud by default. */
  readonly expects?: string;
  readonly phrases?: readonly Id[];
  readonly canDo?: Id;
  readonly model?: Id;
  /** After a pass; none by default (the season's builders give each listener its pool). */
  readonly praise?: readonly Id[];
  readonly recast?: string;
  readonly onReplay?: ReplayMode;
  readonly task?: GlossedText;
  readonly scored?: boolean;
  readonly fine?: Id;
  /** Where a skipped turn goes; the next beat by default. */
  readonly skipTo?: Id;
}

export const cards = (spec: CardSpec): Answer =>
  answer({
    listener: spec.listener,
    expects:
      spec.expects ?? `Reads a card aloud: ${spec.choices.map((c) => `"${c.en}"`).join(' or ')}.`,
    ...(spec.phrases === undefined ? {} : { phrases: spec.phrases }),
    ...(spec.canDo === undefined ? {} : { canDo: spec.canDo }),
    ...(spec.model === undefined ? {} : { model: spec.model }),
    ...(spec.praise === undefined ? {} : { praise: spec.praise }),
    ...(spec.recast === undefined ? {} : { recast: spec.recast }),
    ...(spec.onReplay === undefined ? {} : { onReplay: spec.onReplay }),
    ...(spec.task === undefined ? {} : { task: spec.task }),
    ...(spec.scored === undefined ? {} : { scored: spec.scored }),
    ...(spec.fine === undefined ? {} : { fine: spec.fine }),
    choices: spec.choices,
    accept: spec.accept,
    showHint: 'always',
    onTargetError: 'accept',
    // Card turns pass generously after two English misses, so this is only a backstop.
    maxTries: DEFAULT_MAX_TRIES,
    fallback: {
      speaker: spec.listener,
      intent: 'Say the words on the card warmly, as if together, and go on.',
      ...(spec.skipTo === undefined ? {} : { to: spec.skipTo }),
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
