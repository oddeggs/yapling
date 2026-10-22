import type { CharacterId, Id, Stage } from '@yapling/contracts';
import type { TurnPass } from '@yapling/domain';

import type { Glosses, GlossedText, LineLanguage, Meaning, UiSpec } from './types';

/* The scene runner's events, state and effects (the reducer is in `runner.ts`). */

export type SceneEvent =
  | { readonly type: 'fine' }
  | { readonly type: 'target_error' }
  /** The learner spoke, but not what the beat hoped (unclear, a question back, off topic). */
  | { readonly type: 'unclear' }
  /** A long quiet while the beat waits: never a try. */
  | { readonly type: 'silent' }
  /** The learner spoke, but not in English (Vietnamese), or it was only noise: never a try. */
  | { readonly type: 'not_english' }
  /** "Sorry? Again, please." (said or tapped): the last line again, never a try. */
  | { readonly type: 'repeat_request' }
  /** "Slowly, please." (said or tapped): the last line again, slower, never a try. */
  | { readonly type: 'slower_request' }
  /** "Bỏ qua": move on without the turn. */
  | { readonly type: 'skip' }
  | { readonly type: 'meaning_request' }
  | { readonly type: 'hint_request' }
  | { readonly type: 'timer_end' }
  | { readonly type: 'rec_played' }
  | { readonly type: 'gen_done' };

export type SceneEventType = SceneEvent['type'];

/**
 * - `playing`: a written line is playing; waits for `rec_played`.
 * - `speaking`: a generated line is being spoken; waits for `gen_done`.
 * - `listening`: waits for the learner's outcome.
 * - `fallback`: the guaranteed move-on line is being spoken; waits for `gen_done`.
 */
export type Phase = 'playing' | 'speaking' | 'listening' | 'fallback' | 'ended';

export interface RunnerState {
  readonly version: 1;
  readonly sceneId: Id;
  readonly stage: Stage;
  /** Null once the scene has ended. */
  readonly beatId: Id | null;
  readonly phase: Phase;
  /** Unclear tries and hinted errors on this beat. */
  readonly tries: number;
  /** Hint and meaning requests on this beat. */
  readonly asks: number;
  /** A correction prompt is waiting for the learner's second try. */
  readonly correcting: boolean;
  /** The written line spoken last, for "What does that mean?"; null after a generated line. */
  readonly lastLine: Id | null;
  /**
   * The phrase hint has shown on this beat (offered after a long quiet, asked for, or after a
   * try), so a long quiet offers nothing more. Optional: states saved before it read as false.
   */
  readonly hinted?: boolean;
  /** Linh has asked for English once in this scene (after a Vietnamese answer to a card). */
  readonly askedEnglish?: boolean;
  /** How the last turn left was passed, for the turn log and the stage-up rule. */
  readonly lastTurn?: { readonly beatId: Id; readonly pass: TurnPass };
}

export type GenPurpose = 'line' | 'nudge' | 'fallback' | 'meaning';

export type SceneEffect =
  | { readonly type: 'beat_changed'; readonly beatId: Id; readonly progress: number }
  | {
      readonly type: 'play_rec';
      readonly beatId: Id;
      readonly lineId: Id;
      readonly character: CharacterId;
      readonly caption: string;
      /** False while the line waits for its recording: speak `text` with the character's TTS. */
      readonly recorded: boolean;
      readonly text: string;
      /** Said again one speed step slower with longer breaks (the live voice reads `text`). */
      readonly slower?: true;
      /** Not English (Linh's Vietnamese): the TTS language while the line is pending. */
      readonly language?: Exclude<LineLanguage, 'en'>;
    }
  /**
   * A short fixed line (praise, "Again?", "That's okay!"), not waited on: its recording when
   * `lineId` has one, else the speaker's live voice reads `text`. `{name}` is the learner's name.
   */
  | {
      readonly type: 'say';
      readonly beatId: Id;
      readonly speaker: CharacterId;
      readonly text: string;
      readonly lineId: Id | null;
      readonly language: LineLanguage;
      readonly glosses: Glosses;
    }
  | {
      readonly type: 'gen';
      readonly beatId: Id;
      readonly purpose: GenPurpose;
      readonly speaker: CharacterId;
      readonly intent: string;
      readonly constraints: readonly string[];
      readonly example: string | null;
      readonly resolution: string | null;
      /** Target phrases to give the learner a chance to use. */
      readonly elicits: readonly Id[];
      /** For `meaning`: the line asked about (null: the last generated line) and a written answer. */
      readonly meaning: { readonly lineId: Id | null; readonly known: Meaning | null } | null;
    }
  | {
      readonly type: 'hint';
      readonly beatId: Id;
      /** The phrase, or the first card. */
      readonly hint: GlossedText;
      /** The cards, one or two, when the turn has them. */
      readonly choices?: readonly GlossedText[];
      /** The written line that says the answer, for the card's tap-to-hear. */
      readonly modelLineId?: Id;
      /** The card stays up for the whole turn. */
      readonly persistent?: true;
    }
  | { readonly type: 'correction'; readonly beatId: Id; readonly speaker: CharacterId }
  | { readonly type: 'show_ui'; readonly beatId: Id; readonly ui: UiSpec }
  | { readonly type: 'scene_end'; readonly reason: 'complete' };

export interface Step {
  readonly state: RunnerState;
  readonly effects: readonly SceneEffect[];
}

/** Hint and meaning requests on one beat before the next one counts as a try. */
export const MAX_ASKS = 3;

/** English tries without the beat's words after which a card turn passes anyway. */
export const GENEROUS_AFTER = 2;
