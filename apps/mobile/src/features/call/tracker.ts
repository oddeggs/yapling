import type { CallServerFrame, HeardWord, Stage } from '@yapling/contracts';
import {
  findLine,
  stageValue,
  type Answer,
  type Beat,
  type Letter,
  type Scene,
} from '@yapling/story';

import type { CaptionLine } from '../../voice/call-state';
import { noteShown, type SpokenLine } from './line-history';

/*
 * What the call screen remembers from the call's frames beyond the voice engine's state: the beat
 * and what it shows (the letter, the phone, a timer, the fluency mirror), the hint, the two beats
 * of a correction, "What does that mean?", which lines are reaction clips, and every heard turn
 * with its word timings. A pure reducer, so the screen's behaviour is tested without a phone.
 */

export interface HeardTurn {
  /** The beat the turn answered. */
  readonly beatId: string | null;
  readonly turn: number;
  readonly text: string;
  readonly words: readonly HeardWord[];
}

/** The line a "What does that mean?" is about, kept on screen while Pip explains it. */
export interface MeaningLine {
  readonly speaker: string;
  readonly text: string;
  readonly lineId: string | null;
}

export interface MeaningState {
  /** `asked`: waiting for the answer; `shown`: simple English; `translated`: the gloss is open. */
  readonly phase: 'asked' | 'shown' | 'translated';
  readonly line: MeaningLine | null;
  readonly about: string | null;
  readonly simple: string | null;
  readonly gloss: string | null;
  /** The stream that speaks the explanation; once a later line plays, the bubble moves on. */
  readonly spokenStream: number | null;
}

export interface TimerState {
  readonly beatId: string;
  /** Seconds for this round at the learner's stage. */
  readonly total: number;
  /** The learner started speaking: the ring counts down. */
  readonly started: boolean;
  /** It reached zero, or the turn was heard. */
  readonly done: boolean;
}

export interface TrackerState {
  readonly beatId: string | null;
  /** Grows on every beat change (keys a timer's remount). */
  readonly beatSeq: number;
  /** Recorded lines by stream: their glosses, and which are reaction clips. */
  readonly recorded: Readonly<Record<number, string>>;
  readonly reactions: readonly number[];
  readonly hint: { readonly phrase: string; readonly gloss: string | null } | null;
  readonly correction: { readonly original: string; readonly prompt: string } | null;
  /** "You fixed it yourself": when the learner's second try fixed it. */
  readonly fixedAt: number | null;
  readonly meaning: MeaningState | null;
  readonly heard: readonly HeardTurn[];
  /** The last turn came back with no words: the character asks for it another way. */
  readonly lastHeardEmpty: boolean;
  /** How many turns had been heard when the learner last started talking. */
  readonly heardAtSpeech: number;
  readonly letter: Letter | null;
  readonly phone: boolean;
  /** The fluency mirror after Pass it on round N. */
  readonly mirrorRound: number | null;
  readonly timer: TimerState | null;
  /** Every character line shown so far, for reading a missed one again. */
  readonly lines: readonly SpokenLine[];
  /** An earlier line the learner went back to in the bubble; null for the line now. */
  readonly browsing: number | null;
  /** The call's resume token from `ready`: names the call for a tapped line's translation. */
  readonly callToken: string | null;
}

export const initialTracker: TrackerState = {
  beatId: null,
  beatSeq: 0,
  recorded: {},
  reactions: [],
  hint: null,
  correction: null,
  fixedAt: null,
  meaning: null,
  heard: [],
  lastHeardEmpty: false,
  heardAtSpeech: 0,
  letter: null,
  phone: false,
  mirrorRound: null,
  timer: null,
  lines: [],
  browsing: null,
  callToken: null,
};

export type TrackerEvent =
  | { readonly type: 'frame'; readonly frame: CallServerFrame; readonly now: number }
  | { readonly type: 'hint_dismissed' }
  | { readonly type: 'meaning_requested'; readonly line: MeaningLine | null }
  | { readonly type: 'translation_shown' }
  | { readonly type: 'translation_hidden' }
  | { readonly type: 'meaning_closed' }
  /** The learner started talking on this beat. */
  | { readonly type: 'speech_started' }
  | { readonly type: 'timer_done' }
  /** A character line came on screen, or its caption grew. */
  | { readonly type: 'line_shown'; readonly caption: CaptionLine }
  /** The learner went back to an earlier line of the turn (null: back to the line now). */
  | { readonly type: 'browse'; readonly streamId: number | null };

export interface TrackerContext {
  readonly scene: Scene;
  readonly stage: Stage;
}

/** How long "You fixed it yourself" stays up. */
export const FIXED_SHOWN_MS = 3_200;

export const beatOf = (scene: Scene, beatId: string | null): Beat | undefined =>
  beatId === null ? undefined : scene.beats.find((b) => b.id === beatId);

export const answerOf = (beat: Beat | undefined): Answer | null =>
  beat?.kind === 'learner' ? beat.answer : beat?.kind === 'gen' ? beat.answer : null;

/** The scene's timed rounds, in order (Pass it on, the teach-back). */
export const timedBeats = (scene: Scene): readonly Beat[] =>
  scene.beats.filter((b) => answerOf(b)?.timer != null);

export function reduceTracker(
  state: TrackerState,
  event: TrackerEvent,
  ctx: TrackerContext,
): TrackerState {
  switch (event.type) {
    case 'frame':
      return onFrame(state, event.frame, event.now, ctx);
    case 'hint_dismissed':
      return { ...state, hint: null };
    case 'meaning_requested':
      return {
        ...state,
        meaning: {
          phase: 'asked',
          line: event.line,
          about: null,
          simple: null,
          gloss: null,
          spokenStream: null,
        },
      };
    case 'translation_shown':
      return state.meaning?.phase === 'shown' && state.meaning.gloss !== null
        ? { ...state, meaning: { ...state.meaning, phase: 'translated' } }
        : state;
    case 'translation_hidden':
      return state.meaning?.phase === 'translated'
        ? { ...state, meaning: { ...state.meaning, phase: 'shown' } }
        : state;
    case 'meaning_closed':
      return { ...state, meaning: null };
    case 'speech_started':
      return {
        ...state,
        hint: null,
        browsing: null,
        heardAtSpeech: state.heard.length,
        timer: state.timer && !state.timer.done ? { ...state.timer, started: true } : state.timer,
      };
    case 'timer_done':
      return state.timer ? { ...state, timer: { ...state.timer, done: true } } : state;
    case 'line_shown': {
      const lines = noteShown(state.lines, event.caption, {
        recorded: state.recorded,
        reactions: state.reactions,
        heardCount: state.heard.length,
      });
      if (lines === state.lines) return state;
      // A new line takes the bubble back from an earlier one.
      const fresh = lines.length > state.lines.length;
      return { ...state, lines, browsing: fresh ? null : state.browsing };
    }
    case 'browse':
      return state.browsing === event.streamId ? state : { ...state, browsing: event.streamId };
  }
}

function onFrame(
  state: TrackerState,
  frame: CallServerFrame,
  now: number,
  ctx: TrackerContext,
): TrackerState {
  switch (frame.type) {
    case 'beat':
      return onBeat(state, frame.beatId, ctx);
    case 'play_rec': {
      const reaction = findLine(frame.lineId)?.kind === 'reaction';
      return {
        ...state,
        recorded: { ...state.recorded, [frame.streamId]: frame.lineId },
        reactions: reaction ? [...state.reactions, frame.streamId] : state.reactions,
      };
    }
    case 'hint':
      return { ...state, hint: { phrase: frame.phrase, gloss: frame.gloss } };
    case 'heard': {
      const turn: HeardTurn = {
        beatId: state.beatId,
        turn: frame.turn,
        text: frame.text,
        words: frame.words,
      };
      const timer =
        state.timer && state.timer.beatId === state.beatId && state.timer.started
          ? { ...state.timer, done: true }
          : state.timer;
      return {
        ...state,
        heard: [...state.heard, turn],
        lastHeardEmpty: frame.text.trim() === '',
        hint: null,
        timer,
      };
    }
    case 'correction':
      return {
        ...state,
        correction: { original: frame.original, prompt: frame.prompt },
        fixedAt: null,
      };
    case 'correction_resolved':
      return { ...state, correction: null, fixedAt: frame.fixed ? now : null };
    case 'meaning':
      return {
        ...state,
        meaning: {
          phase: 'shown',
          line: state.meaning?.line ?? null,
          about: frame.about,
          simple: frame.simple,
          gloss: frame.gloss,
          spokenStream: null,
        },
      };
    case 'say_start':
      // The call speaks the explanation next, in the listener's voice.
      return state.meaning && state.meaning.phase !== 'asked' && state.meaning.spokenStream === null
        ? { ...state, meaning: { ...state.meaning, spokenStream: frame.streamId } }
        : state;
    case 'ready':
      return state.callToken === frame.resumeToken
        ? state
        : { ...state, callToken: frame.resumeToken };
    case 'partial':
    case 'alignment':
    case 'say_end':
    case 'minutes':
    case 'safety':
    case 'thinking':
    case 'error':
    case 'ended':
    case 'unknown':
      // The engine keeps these.
      return state;
  }
}

function onBeat(state: TrackerState, beatId: string, ctx: TrackerContext): TrackerState {
  if (beatId === state.beatId) return state;
  const beat = beatOf(ctx.scene, beatId);
  const next: TrackerState = {
    ...state,
    beatId,
    beatSeq: state.beatSeq + 1,
    hint: null,
    correction: null,
    timer: null,
  };
  const timer = answerOf(beat)?.timer;
  if (timer) {
    return {
      ...next,
      timer: { beatId, total: stageValue(timer, ctx.stage), started: false, done: false },
      // A new round clears the last round's mirror.
      mirrorRound: null,
    };
  }
  if (beat?.kind !== 'ui') return next;
  const ui = beat.ui;
  switch (ui.type) {
    case 'letter':
      return { ...next, letter: ui.letter };
    case 'phone':
      return ui.state === 'ringing'
        ? { ...next, phone: true }
        : { ...next, phone: false, letter: null };
    case 'fluency_mirror':
      return { ...next, mirrorRound: ui.round };
    case 'timer':
    case 'notebook':
    case 'knock':
    case 'dusk_letter':
    case 'postcard':
    case 'voicemail':
    case 'phrase_grows':
    case 'sfx':
      // Shown by the screens that play those scenes, or by the answer's own timer.
      return next;
  }
}

/** Whether a beat waits for the learner (a learner beat, or a line with an answer). */
export const expectsAnswer = (scene: Scene, beatId: string | null): boolean =>
  answerOf(beatOf(scene, beatId)) !== null;
