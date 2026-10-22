import type { CharacterId, Id, Stage } from '@yapling/contracts';
import type { TurnPass } from '@yapling/domain';

import { getScene } from './catalogue';
import { getLine } from './lines';
import {
  answerOf,
  fromStart,
  hintEffect,
  isCardTurn,
  playEffect,
  sayLine,
  sayShared,
  sayText,
  visitorRun,
} from './runner-effects';
import {
  GENEROUS_AFTER,
  MAX_ASKS,
  type GenPurpose,
  type RunnerState,
  type SceneEffect,
  type SceneEvent,
  type Step,
} from './runner-types';
import { S1_SHARED_LINES } from './season-1/shared-lines';
import { STAGE_SPEECH, stageInRange, stageValue } from './stage';
import type { Answer, Beat, Scene } from './types';

export * from './runner-types';
export { isCardTurn } from './runner-effects';

/*
 * The scene runner: a pure reducer from learner outcomes and playback events to the next beat
 * and the effects the director carries out. State is plain JSON, so a dropped call resumes on the
 * same beat (`resumeScene`).
 *
 * Thinking time is the learner's: silence never ends, moves or fails a turn, never counts as a
 * try and never brings a spoken nudge. A long quiet (`silent`) may offer the phrase hint once,
 * silently, and nothing else.
 *
 * Termination: rec and gen beats move on when their audio is done; an answer moves on when the
 * learner is fine, after one correction, when the timer ends, or after `maxTries` real tries that
 * didn't get there (unclear answers, hinted errors: the fallback line); asking for hints or
 * meanings more than `MAX_ASKS` times counts as such a try. Beats only ever point forward (checked
 * by `validateScene`), so every scene ends for a learner who keeps talking.
 *
 * Card turns (say-this cards with words to match, the Visitor's turns): the cards are up from the
 * start; the beat's word passes; an English try without it brings "Again?" and the line once more,
 * and the second such try passes anyway (the generous pass); Vietnamese or noise is never a try.
 * At every stage, "again" and "slowly" replay the last line and never count as a try, and a
 * skipped turn moves on with a kind "That's okay!".
 */

/** Directions are instructions to the character, never text about the learner it could echo. */
const NUDGE_INTENT =
  'Ask your last question again, kindly, in fewer and simpler words, and wait for the answer. Never answer it for them.';

const MEANING_INTENT = 'Explain what that means in simple English, in one short sentence.';

export const activeBeats = (scene: Scene, stage: Stage): readonly Beat[] =>
  scene.beats.filter((b) => stageInRange(stage, b.minStage, b.maxStage));

const beatOf = (scene: Scene, id: Id): Beat => {
  const beat = scene.beats.find((b) => b.id === id);
  if (!beat) throw new Error(`No beat ${id} in ${scene.id}`);
  return beat;
};

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

/** What starts a turn: the timer ring, and the card when it is up from the start. */
const listenEffects = (beat: Beat, stage: Stage): { effects: SceneEffect[]; hinted: boolean } => {
  const answer = answerOf(beat);
  const effects = timerEffects(beat, stage);
  const hint = answer && fromStart(answer, stage) ? hintEffect(beat, answer, stage) : null;
  if (hint) effects.push(hint);
  return { effects, hinted: hint !== null };
};

const ended = (state: RunnerState): Step => ({
  state: {
    ...state,
    beatId: null,
    phase: 'ended',
    tries: 0,
    asks: 0,
    correcting: false,
    hinted: false,
  },
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
    const base = {
      ...state,
      beatId: beat.id,
      tries: 0,
      asks: 0,
      correcting: false,
      hinted: false,
    };
    switch (beat.kind) {
      case 'ui':
        effects.push({ type: 'show_ui', beatId: beat.id, ui: beat.ui });
        beat = nextBeat(scene, state.stage, beat);
        continue;
      case 'rec':
        lastLine = beat.line;
        effects.push(playEffect(beat, beat.line, beat.slower === true));
        return { state: { ...base, phase: 'playing', lastLine }, effects };
      case 'gen':
        effects.push(genEffect(beat, 'line', beat.speaker, beat.intent));
        return { state: { ...base, phase: 'speaking', lastLine: null }, effects };
      case 'learner': {
        const start = listenEffects(beat, state.stage);
        effects.push(...start.effects);
        return {
          state: { ...base, phase: 'listening', lastLine, hinted: start.hinted },
          effects,
        };
      }
    }
  }
  const end = ended({ ...state, lastLine });
  return { state: end.state, effects: [...effects, ...end.effects] };
};

const advance = (scene: Scene, state: RunnerState, beat: Beat, to?: Id): Step =>
  enter(scene, state, nextBeat(scene, state.stage, beat, to));

/** Leaves a turn: what is said first (not waited on), then the next beat. */
const leaveTurn = (
  scene: Scene,
  state: RunnerState,
  beat: Beat,
  pass: TurnPass,
  to: Id | undefined,
  said: readonly SceneEffect[] = [],
): Step => {
  const next = advance(scene, { ...state, lastTurn: { beatId: beat.id, pass } }, beat, to);
  return { state: next.state, effects: [...said, ...next.effects] };
};

/** One praise line from the answer's pool, picked by the beat's place so it varies. */
const praiseEffects = (scene: Scene, beat: Beat, answer: Answer): SceneEffect[] => {
  const pool = answer.praise;
  if (pool.length === 0) return [];
  const id = pool[scene.beats.indexOf(beat) % pool.length];
  return id === undefined ? [] : [sayLine(beat, id)];
};

const passTurn = (scene: Scene, state: RunnerState, beat: Beat, answer: Answer): Step =>
  leaveTurn(scene, state, beat, 'match', answer.exits.fine.to, praiseEffects(scene, beat, answer));

/** The second English try without the words: the listener says it properly, and on we go. */
const generousPass = (scene: Scene, state: RunnerState, beat: Beat, answer: Answer): Step => {
  const said =
    answer.recast === null
      ? praiseEffects(scene, beat, answer)
      : [sayText(beat, answer.listener, { en: answer.recast, glosses: {} })];
  return leaveTurn(scene, state, beat, 'generous', answer.exits.fine.to, said);
};

/**
 * The line to say again: `lineId` (or the last written line) played, slower when asked, preceded
 * at the Visitor's pace by the speaker's "Sure. Slowly.". After a generated line there is no
 * written one: the call says its own last line again (it has the text), so nothing here.
 */
const replayEffects = (
  scene: Scene,
  state: RunnerState,
  beat: Beat,
  slower: boolean,
  lineId: Id | null = state.lastLine,
): SceneEffect[] => {
  if (lineId === null) return [];
  const before = S1_SHARED_LINES.slowly[getLine(lineId).character];
  const lead = slower && visitorRun(scene, state.stage) && before ? [sayLine(beat, before)] : [];
  return [...lead, playEffect(beat, lineId, slower)];
};

/** "Again" or "slowly" during a turn. */
const replayRequest = (
  scene: Scene,
  state: RunnerState,
  beat: Beat,
  answer: Answer,
  slower: boolean,
): Step => {
  switch (answer.onReplay) {
    case 'pass':
      return passTurn(scene, state, beat, answer);
    case 'replay_and_pass': {
      if (state.lastLine === null) return passTurn(scene, state, beat, answer);
      // Said slower, waited on, then the turn is passed (`rec_played` moves on).
      return {
        state: { ...state, phase: 'playing', lastTurn: { beatId: beat.id, pass: 'match' } },
        effects: replayEffects(scene, state, beat, true),
      };
    }
    case 'replay':
      return { state, effects: replayEffects(scene, state, beat, slower) };
  }
};

/** An English try without the words on the cards: "Again?" and the line once more. */
const askAgain = (scene: Scene, state: RunnerState, beat: Beat, answer: Answer): Step => {
  const line = answer.model ?? state.lastLine;
  const again = sayShared(
    beat,
    answer.listener,
    S1_SHARED_LINES.again[answer.listener],
    S1_SHARED_LINES.againText,
  );
  return {
    state: { ...state, lastLine: line },
    effects: [again, ...replayEffects(scene, state, beat, false, line)],
  };
};
/** An unclear try or a hinted error: a hint (or a nudge), then the fallback after `maxTries`. */
const tryAgain = (
  scene: Scene,
  state: RunnerState,
  beat: Beat,
  answer: Answer,
  alwaysHint: boolean,
): Step => {
  const tries = state.tries + 1;
  const { hint, maxTries, fallback } = answer.exits.silent;
  if (isCardTurn(answer)) {
    return tries >= GENEROUS_AFTER
      ? generousPass(scene, { ...state, tries }, beat, answer)
      : askAgain(scene, { ...state, tries }, beat, answer);
  }
  if (tries >= maxTries) {
    return {
      state: {
        ...state,
        tries,
        phase: 'fallback',
        correcting: false,
        lastLine: null,
        lastTurn: { beatId: beat.id, pass: 'fallback' },
      },
      effects: [genEffect(beat, 'fallback', fallback.speaker, fallback.intent)],
    };
  }
  const effect = hint ? hintEffect(beat, answer, state.stage) : null;
  if (effect && (alwaysHint || STAGE_SPEECH[state.stage].hintsOnSilence)) {
    return { state: { ...state, tries, hinted: true }, effects: [effect] };
  }
  return {
    state: { ...state, tries, lastLine: null },
    effects: [genEffect(beat, 'nudge', answer.listener, NUDGE_INTENT)],
  };
};

/** A long quiet: the hint card, once and silently, where the stage offers it; else nothing. */
const quietOffer = (state: RunnerState, beat: Beat, answer: Answer): Step => {
  const { hint } = answer.exits.silent;
  if (!hint || state.hinted === true || !STAGE_SPEECH[state.stage].hintsOnSilence) {
    return { state, effects: [] };
  }
  const effect = hintEffect(beat, answer, state.stage);
  return effect ? { state: { ...state, hinted: true }, effects: [effect] } : { state, effects: [] };
};

const listen = (
  scene: Scene,
  state: RunnerState,
  beat: Beat,
  answer: Answer,
  event: SceneEvent,
): Step => {
  const stay: Step = { state, effects: [] };
  const fine = () => passTurn(scene, state, beat, answer);
  const linhHere = scene.cast.includes('linh');
  switch (event.type) {
    case 'fine':
      return fine();
    case 'timer_end':
      return answer.timer ? fine() : stay;
    case 'not_english':
      // Never a try. Once a scene, on a card, Linh asks (in Vietnamese) for the card in English.
      if (!isCardTurn(answer) || !linhHere || state.askedEnglish === true) return stay;
      return {
        state: { ...state, askedEnglish: true },
        effects: [sayLine(beat, S1_SHARED_LINES.english)],
      };
    case 'repeat_request':
      return replayRequest(scene, state, beat, answer, false);
    case 'slower_request':
      return replayRequest(scene, state, beat, answer, true);
    case 'skip': {
      const { listener } = answer;
      const kind = sayShared(
        beat,
        listener,
        S1_SHARED_LINES.skip[listener],
        S1_SHARED_LINES.skipText,
      );
      return leaveTurn(scene, state, beat, 'skip', answer.exits.silent.fallback.to, [kind]);
    }
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
    case 'unclear':
      return tryAgain(scene, state, beat, answer, false);
    case 'silent':
      return quietOffer(state, beat, answer);
    case 'hint_request': {
      const asks = state.asks + 1;
      if (asks > MAX_ASKS) return tryAgain(scene, { ...state, asks }, beat, answer, false);
      if (isCardTurn(answer) && linhHere) {
        // Linh offers to say it together, and the line that says it plays again.
        const line = answer.model ?? state.lastLine;
        return {
          state: { ...state, asks, hinted: true, lastLine: line },
          effects: [
            sayLine(beat, S1_SHARED_LINES.together),
            ...replayEffects(scene, state, beat, false, line),
          ],
        };
      }
      const hint = hintEffect(beat, answer, state.stage);
      return hint
        ? { state: { ...state, asks, hinted: true }, effects: [hint] }
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
      // A turn's line said again before it passes moves on by the turn's fine exit.
      return event.type === 'rec_played'
        ? advance(scene, state, beat, answer?.exits.fine.to)
        : { state, effects: [] };
    case 'speaking': {
      if (event.type !== 'gen_done') return { state, effects: [] };
      if (!answer) return advance(scene, state, beat);
      const start = listenEffects(beat, state.stage);
      return {
        state: { ...state, phase: 'listening', hinted: start.hinted || state.hinted === true },
        effects: start.effects,
      };
    }
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
      hinted: false,
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
      // A turn's slow replay was cut off: the turn had passed, so go on.
      if (answerOf(beat)) return advance(scene, state, beat, answerOf(beat)?.exits.fine.to);
      return enter(scene, state, beat);
    case 'speaking':
      return enter(scene, state, beat);
    case 'listening':
      effects.push(...listenEffects(beat, state.stage).effects);
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
