import type { CharacterId, Id, Stage } from '@yapling/contracts';

import { getScene } from './catalogue';
import { getLine } from './lines';
import { STAGE_SPEECH, stageInRange, stageValue } from './stage';
import type { Answer, Beat, GlossedText, Meaning, Scene, UiSpec } from './types';

/*
 * The scene runner: a pure reducer from learner outcomes and playback events to the next beat
 * and the effects the director carries out. State is plain JSON, so a dropped call resumes on the
 * same beat (`resumeScene`).
 *
 * Termination: rec and gen beats move on when their audio is done; an answer moves on when the
 * learner is fine, after one correction, when the timer ends, or after `maxTries` silences (the
 * fallback line); asking for hints or meanings more than `MAX_ASKS` times counts as a silence.
 * Beats only ever point forward (checked by `validateScene`), so every scene ends.
 */

export type SceneEvent =
  | { readonly type: 'fine' }
  | { readonly type: 'target_error' }
  | { readonly type: 'silent' }
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
  /** Silences and hinted errors on this beat. */
  readonly tries: number;
  /** Hint and meaning requests on this beat. */
  readonly asks: number;
  /** A correction prompt is waiting for the learner's second try. */
  readonly correcting: boolean;
  /** The written line spoken last, for "What does that mean?"; null after a generated line. */
  readonly lastLine: Id | null;
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
  | { readonly type: 'hint'; readonly beatId: Id; readonly hint: GlossedText }
  | { readonly type: 'correction'; readonly beatId: Id; readonly speaker: CharacterId }
  | { readonly type: 'show_ui'; readonly beatId: Id; readonly ui: UiSpec }
  | { readonly type: 'scene_end'; readonly reason: 'complete' };

export interface Step {
  readonly state: RunnerState;
  readonly effects: readonly SceneEffect[];
}

/** Hint and meaning requests on one beat before the next one counts as a silence. */
export const MAX_ASKS = 3;

const NUDGE_INTENT =
  'The learner is quiet. Kindly ask again more simply, in a few words. Do not answer for them.';

const MEANING_INTENT =
  'The learner asked what that means. Explain it in simple English, in one short sentence.';

export const activeBeats = (scene: Scene, stage: Stage): readonly Beat[] =>
  scene.beats.filter((b) => stageInRange(stage, b.minStage, b.maxStage));

const beatOf = (scene: Scene, id: Id): Beat => {
  const beat = scene.beats.find((b) => b.id === id);
  if (!beat) throw new Error(`No beat ${id} in ${scene.id}`);
  return beat;
};

const answerOf = (beat: Beat): Answer | null =>
  beat.kind === 'learner' ? beat.answer : beat.kind === 'gen' ? beat.answer : null;

/** The first beat at or after `id` (in scene order) that plays at this stage. */
const firstActiveFrom = (scene: Scene, stage: Stage, index: number): Beat | null =>
  scene.beats.slice(index).find((b) => stageInRange(stage, b.minStage, b.maxStage)) ?? null;

/** Where to go after `beat`: `to`, else its `next`, else the next active beat. */
export const nextBeat = (scene: Scene, stage: Stage, beat: Beat, to?: Id): Beat | null => {
  const target = to ?? beat.next;
  if (target !== undefined) {
    return firstActiveFrom(
      scene,
      stage,
      scene.beats.findIndex((b) => b.id === target),
    );
  }
  return firstActiveFrom(scene, stage, scene.beats.indexOf(beat) + 1);
};

const progressOf = (scene: Scene, stage: Stage, beat: Beat): number => {
  const active = activeBeats(scene, stage);
  return Math.round((active.indexOf(beat) / active.length) * 1000) / 1000;
};

const genEffect = (
  beat: Beat,
  purpose: GenPurpose,
  speaker: CharacterId,
  intent: string,
  extra: Partial<Pick<Extract<SceneEffect, { type: 'gen' }>, 'meaning'>> = {},
): SceneEffect => ({
  type: 'gen',
  beatId: beat.id,
  purpose,
  speaker,
  intent,
  constraints: beat.kind === 'gen' && purpose === 'line' ? beat.constraints : [],
  example: beat.kind === 'gen' && purpose === 'line' ? beat.example : null,
  resolution: beat.kind === 'gen' && purpose === 'line' ? beat.resolution : null,
  elicits: answerOf(beat)?.phrases ?? [],
  meaning: extra.meaning ?? null,
});

const timerEffects = (beat: Beat, stage: Stage): SceneEffect[] => {
  const timer = answerOf(beat)?.timer;
  return timer
    ? [
        {
          type: 'show_ui',
          beatId: beat.id,
          ui: { type: 'timer', seconds: stageValue(timer, stage) },
        },
      ]
    : [];
};

const ended = (state: RunnerState): Step => ({
  state: { ...state, beatId: null, phase: 'ended', tries: 0, asks: 0, correcting: false },
  effects: [{ type: 'scene_end', reason: 'complete' }],
});

/** Enters `beat` (or ends the scene), passing through `ui` beats. */
const enter = (scene: Scene, state: RunnerState, first: Beat | null): Step => {
  const effects: SceneEffect[] = [];
  let beat = first;
  let lastLine = state.lastLine;
  for (let hops = 0; beat !== null; hops++) {
    if (hops > scene.beats.length) throw new Error(`Beats loop in ${scene.id}`);
    effects.push({
      type: 'beat_changed',
      beatId: beat.id,
      progress: progressOf(scene, state.stage, beat),
    });
    const base = { ...state, beatId: beat.id, tries: 0, asks: 0, correcting: false };
    switch (beat.kind) {
      case 'ui':
        effects.push({ type: 'show_ui', beatId: beat.id, ui: beat.ui });
        beat = nextBeat(scene, state.stage, beat);
        continue;
      case 'rec': {
        const line = getLine(beat.line);
        lastLine = line.id;
        effects.push({
          type: 'play_rec',
          beatId: beat.id,
          lineId: line.id,
          character: line.character,
          caption: line.caption,
          recorded: line.audio !== null,
          text: line.text,
        });
        return { state: { ...base, phase: 'playing', lastLine }, effects };
      }
      case 'gen':
        effects.push(genEffect(beat, 'line', beat.speaker, beat.intent));
        return { state: { ...base, phase: 'speaking', lastLine: null }, effects };
      case 'learner':
        effects.push(...timerEffects(beat, state.stage));
        return { state: { ...base, phase: 'listening', lastLine }, effects };
    }
  }
  const end = ended({ ...state, lastLine });
  return { state: end.state, effects: [...effects, ...end.effects] };
};

const advance = (scene: Scene, state: RunnerState, beat: Beat, to?: Id): Step =>
  enter(scene, state, nextBeat(scene, state.stage, beat, to));

/** A silence or a hinted error: a hint (or a nudge), then the fallback after `maxTries`. */
const tryAgain = (
  scene: Scene,
  state: RunnerState,
  beat: Beat,
  answer: Answer,
  alwaysHint: boolean,
): Step => {
  const tries = state.tries + 1;
  const { hint, maxTries, fallback } = answer.exits.silent;
  if (tries >= maxTries) {
    return {
      state: { ...state, tries, phase: 'fallback', correcting: false, lastLine: null },
      effects: [genEffect(beat, 'fallback', fallback.speaker, fallback.intent)],
    };
  }
  if (hint && (alwaysHint || STAGE_SPEECH[state.stage].hintsOnSilence)) {
    return { state: { ...state, tries }, effects: [{ type: 'hint', beatId: beat.id, hint }] };
  }
  return {
    state: { ...state, tries, lastLine: null },
    effects: [genEffect(beat, 'nudge', answer.listener, NUDGE_INTENT)],
  };
};

const listen = (
  scene: Scene,
  state: RunnerState,
  beat: Beat,
  answer: Answer,
  event: SceneEvent,
): Step => {
  const stay: Step = { state, effects: [] };
  const fine = () => advance(scene, state, beat, answer.exits.fine.to);
  switch (event.type) {
    case 'fine':
      return fine();
    case 'timer_end':
      return answer.timer ? fine() : stay;
    case 'target_error':
      switch (answer.exits.targetError.mode) {
        case 'accept':
          return fine();
        case 'hint':
          return tryAgain(scene, state, beat, answer, true);
        case 'correct':
          return state.correcting
            ? fine()
            : {
                state: { ...state, correcting: true, lastLine: null },
                effects: [{ type: 'correction', beatId: beat.id, speaker: answer.listener }],
              };
      }
      return stay;
    case 'silent':
      return tryAgain(scene, state, beat, answer, false);
    case 'hint_request': {
      const asks = state.asks + 1;
      if (asks > MAX_ASKS) return tryAgain(scene, { ...state, asks }, beat, answer, false);
      const { hint } = answer.exits.silent;
      return hint
        ? { state: { ...state, asks }, effects: [{ type: 'hint', beatId: beat.id, hint }] }
        : {
            state: { ...state, asks, lastLine: null },
            effects: [genEffect(beat, 'nudge', answer.listener, NUDGE_INTENT)],
          };
    }
    case 'meaning_request': {
      const asks = state.asks + 1;
      if (asks > MAX_ASKS) return tryAgain(scene, { ...state, asks }, beat, answer, false);
      return {
        state: { ...state, asks },
        effects: [meaningEffect(scene, state, beat, answer)],
      };
    }
    case 'rec_played':
    case 'gen_done':
      return stay;
  }
};

/** Who explains, and with what: the last written line's meaning, else the answer's. */
const meaningEffect = (
  scene: Scene,
  state: RunnerState,
  beat: Beat,
  answer: Answer | null,
): SceneEffect => {
  const lineId = state.lastLine;
  const known = (lineId === null ? null : getLine(lineId).meaning) ?? answer?.exits.meaning ?? null;
  const speaker: CharacterId = scene.cast.includes('pip')
    ? 'pip'
    : (answer?.listener ?? scene.cast[0] ?? 'pip');
  return genEffect(beat, 'meaning', speaker, MEANING_INTENT, { meaning: { lineId, known } });
};

/** Applies one event. Events that don't fit the current phase change nothing. */
export const reduceScene = (scene: Scene, state: RunnerState, event: SceneEvent): Step => {
  if (state.phase === 'ended' || state.beatId === null) return { state, effects: [] };
  const beat = beatOf(scene, state.beatId);
  const answer = answerOf(beat);

  if (state.phase === 'listening' && answer) return listen(scene, state, beat, answer, event);

  if (event.type === 'meaning_request') {
    return { state, effects: [meaningEffect(scene, state, beat, answer)] };
  }
  switch (state.phase) {
    case 'playing':
      return event.type === 'rec_played' ? advance(scene, state, beat) : { state, effects: [] };
    case 'speaking':
      if (event.type !== 'gen_done') return { state, effects: [] };
      return answer
        ? { state: { ...state, phase: 'listening' }, effects: timerEffects(beat, state.stage) }
        : advance(scene, state, beat);
    case 'fallback':
      return event.type === 'gen_done'
        ? advance(scene, state, beat, answer?.exits.silent.fallback.to)
        : { state, effects: [] };
    case 'listening':
      return { state, effects: [] };
  }
};

/** Starts a scene at the learner's stage. */
export const startScene = (scene: Scene, stage: Stage): Step =>
  enter(
    scene,
    {
      version: 1,
      sceneId: scene.id,
      stage,
      beatId: null,
      phase: 'ended',
      tries: 0,
      asks: 0,
      correcting: false,
      lastLine: null,
    },
    firstActiveFrom(scene, stage, 0),
  );

/** The effects that put a resumed call back on its beat (replaying the line in progress). */
export const resumeScene = (scene: Scene, state: RunnerState): Step => {
  if (state.phase === 'ended' || state.beatId === null) return ended(state);
  const beat = beatOf(scene, state.beatId);
  const effects: SceneEffect[] = [
    { type: 'beat_changed', beatId: beat.id, progress: progressOf(scene, state.stage, beat) },
  ];
  switch (state.phase) {
    case 'playing':
    case 'speaking':
      return enter(scene, state, beat);
    case 'listening':
      effects.push(...timerEffects(beat, state.stage));
      break;
    case 'fallback': {
      const fallback = answerOf(beat)?.exits.silent.fallback;
      if (fallback) effects.push(genEffect(beat, 'fallback', fallback.speaker, fallback.intent));
      break;
    }
  }
  return { state, effects };
};

/** The reducer over the catalogue: the state names its scene. */
export const sceneReducer = (state: RunnerState, event: SceneEvent): Step =>
  reduceScene(getScene(state.sceneId), state, event);
