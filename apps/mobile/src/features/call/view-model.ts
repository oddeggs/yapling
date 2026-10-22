import type { Mood } from '@yapling/art';
import type { CharacterId, FirstLanguage, Stage } from '@yapling/contracts';
import { findLine, glossFor, type Letter, type Scene } from '@yapling/story';

import type { MicState } from '../../ui/mic-button';
import type { CallState } from '../../voice/call-state';
import { currentRound, mirrorFor, roundsOf, type Mirror } from './fluency-mirror';
import type { CallLayout } from './scene-layout';
import {
  answerOf,
  beatOf,
  expectsAnswer,
  FIXED_SHOWN_MS,
  type MeaningState,
  type TrackerState,
} from './tracker';

/*
 * The call screen as data: the engine's call state and the tracked frames in, everything the
 * screen draws out (which bubble with which line, the mic, the hint, the correction's beat, the
 * timer and rounds, the mirror, the letter, the error sheets). Copy stays out: the screen looks it
 * up. Pure, so the mapping is tested on its own.
 */

export type CallScreenMode =
  /** The phone rings while the socket opens: the face and the rings. */
  | 'ringing'
  | 'live'
  /** No connection: Pip's line is crackly. */
  | 'error_net'
  /** The microphone is off for Yapling. */
  | 'error_mic';

export interface BubbleView {
  readonly speaker: CharacterId;
  readonly streamId: number;
  /** The line so far; empty while a reaction clip plays or a reply is on its way. */
  readonly text: string;
  /** The caption follows the audio clock (the line is playing). */
  readonly playing: boolean;
  /** The thinking dots instead of words. */
  readonly thinking: boolean;
  /** The Vietnamese for a written line, for the tap-to-gloss. */
  readonly gloss: string | null;
}

export interface TimerView {
  readonly key: string;
  readonly total: number;
  readonly running: boolean;
}

export interface RoundView {
  readonly listener: CharacterId;
  readonly seconds: number;
  readonly state: 'done' | 'now' | 'next';
}

export interface CallView {
  readonly mode: CallScreenMode;
  readonly mic: MicState;
  /** Who is talking, for "PIP ĐANG NÓI". */
  readonly talking: CharacterId | null;
  /** The scene is over: the exit is the primary button. */
  readonly sceneDone: boolean;
  readonly bubble: BubbleView | null;
  /** What the learner said: the partial while talking, then the heard line. */
  readonly you: { readonly text: string; readonly heard: boolean } | null;
  readonly hint: { readonly phrase: string; readonly gloss: string | null } | null;
  readonly meaningChip: boolean;
  readonly meaning: MeaningState | null;
  /** The correction's first beat: the character asked it back and waits for the second try. */
  readonly correcting: boolean;
  /** "You fixed it yourself", with its sparkles. */
  readonly fixed: boolean;
  readonly timer: TimerView | null;
  readonly rounds: readonly RoundView[] | null;
  readonly mirror: Mirror | null;
  readonly letter: Letter | null;
  readonly phone: boolean;
  /** Each critter's mood on the stage. */
  readonly moods: Readonly<Partial<Record<CharacterId, Mood>>>;
  /** Who tilts their head while a reply is on its way. */
  readonly thinker: CharacterId | null;
  /** Seconds left while the scene wraps up for today. */
  readonly wrapUpSeconds: number | null;
  /** A crisis: the safety sheet opens. */
  readonly safety: boolean;
}

export interface CallViewInput {
  readonly call: CallState;
  readonly tracker: TrackerState;
  readonly scene: Scene;
  readonly layout: CallLayout;
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  readonly now: number;
  /** The learner turned the microphone off for the app. */
  readonly micDenied: boolean;
  /** The socket never came up, or the session could not be had. */
  readonly connectFailed: boolean;
}

/** Errors the screen shows as "no connection"; the rest end in the wrap-up. */
const NET_ERRORS = new Set([
  'no_connection',
  'stt_failed',
  'llm_failed',
  'tts_failed',
  'unauthorized',
  'update_required',
]);

export function callView(input: CallViewInput): CallView {
  const { call, tracker, scene, layout, stage, firstLanguage, now } = input;
  const mode = modeOf(input);
  const sceneDone =
    call.endReason !== null || call.error === 'minutes_exhausted' || call.phase === 'ended';
  const live = mode === 'live' && !sceneDone;
  const beat = beatOf(scene, tracker.beatId);
  const waiting = expectsAnswer(scene, tracker.beatId);
  const listener = answerOf(beat)?.listener ?? null;

  const mic = micOf(call, live, waiting);
  const talking = mic === 'speaking' ? (call.caption?.character ?? null) : null;
  const thinking = live && call.phase === 'thinking' && call.serverThinking;
  const bubble = bubbleOf(call, tracker, thinking, listener ?? layout.pill, firstLanguage);
  const fixed = tracker.fixedAt !== null && now - tracker.fixedAt < FIXED_SHOWN_MS;

  // The engine keeps the last heard line until the next partial: only this turn's words show.
  const thisTurn = !call.learnerFinal || tracker.heard.length > tracker.heardAtSpeech;
  const you =
    live &&
    thisTurn &&
    call.learnerText !== '' &&
    (call.phase === 'listening' || call.phase === 'thinking')
      ? { text: call.learnerText, heard: call.learnerFinal }
      : live && tracker.correction !== null && call.phase !== 'listening'
        ? { text: tracker.correction.original, heard: true }
        : null;

  const yourTurn = mic === 'yourTurn' || (mic === 'listening' && call.turnMode === 'hands_free');
  const hint = live && yourTurn && call.phase === 'your_turn' ? tracker.hint : null;

  const timer =
    tracker.timer && live && !tracker.timer.done
      ? {
          key: `${tracker.beatSeq}:${tracker.timer.beatId}`,
          total: tracker.timer.total,
          running: tracker.timer.started,
        }
      : null;

  const rounds = layout.rounds ? roundsOf(scene, stage) : [];
  const round = currentRound(rounds, tracker.beatId, tracker.mirrorRound);
  const roundViews: RoundView[] | null = layout.rounds
    ? rounds.map((r, i) => ({
        listener: r.listener,
        seconds: r.seconds,
        state: i + 1 < round ? 'done' : i + 1 === round ? 'now' : 'next',
      }))
    : null;
  const mirror =
    tracker.mirrorRound !== null ? mirrorFor(rounds, tracker.heard, tracker.mirrorRound) : null;

  // A written line opens its Vietnamese with a tap; a generated one offers "What does that mean?"
  // (simple English first). Pass it on gives no first-language help.
  const meaningChip =
    live &&
    tracker.meaning === null &&
    bubble !== null &&
    !bubble.thinking &&
    bubble.text !== '' &&
    bubble.gloss === null &&
    (call.phase === 'your_turn' || call.phase === 'character_speaking') &&
    scene.kind !== 'practice';

  return {
    mode,
    mic,
    talking,
    sceneDone,
    bubble,
    you,
    hint,
    meaningChip,
    meaning: live ? tracker.meaning : null,
    correcting: live && tracker.correction !== null,
    fixed: live && fixed,
    timer,
    rounds: roundViews,
    mirror,
    letter: live ? tracker.letter : null,
    phone: live && tracker.phone,
    moods: moodsOf(input, { mic, thinking, fixed, listener, talking }),
    thinker: thinking ? (listener ?? layout.pill) : null,
    wrapUpSeconds:
      live && call.wrappingUp && call.secondsLeft !== null ? Math.max(0, call.secondsLeft) : null,
    safety: call.safety === 'crisis',
  };
}

function modeOf(input: CallViewInput): CallScreenMode {
  const { call } = input;
  if (input.micDenied) return 'error_mic';
  if (input.connectFailed) return 'error_net';
  if (call.error !== null && NET_ERRORS.has(call.error)) return 'error_net';
  if (call.endReason !== null || call.error !== null) return 'live';
  // Until the call first answers (retries included) the phone rings; a later drop is live.
  if (!call.connected && call.sessionId === null && call.caption === null) return 'ringing';
  return 'live';
}

function micOf(call: CallState, live: boolean, waiting: boolean): MicState {
  if (!live) return 'idle';
  if (call.onHold) return 'paused';
  switch (call.phase) {
    case 'character_speaking':
      return 'speaking';
    case 'listening':
      return 'listening';
    case 'your_turn':
      // Only a beat that waits for the learner is their turn; between lines the mic rests.
      if (!waiting) return 'idle';
      return call.turnMode === 'hands_free' ? 'listening' : 'yourTurn';
    case 'idle':
    case 'connecting':
    case 'thinking':
    case 'ended':
    case 'error':
      return 'idle';
  }
}

function bubbleOf(
  call: CallState,
  tracker: TrackerState,
  thinking: boolean,
  thinker: CharacterId,
  firstLanguage: FirstLanguage,
): BubbleView | null {
  // While "What does that mean?" is answered, the line asked about stays put; the next line after
  // the explanation takes the bubble again (the whisper stays until closed).
  const meaning = tracker.meaning;
  const asked = meaning?.line;
  const later =
    meaning?.spokenStream != null && (call.caption?.streamId ?? 0) > meaning.spokenStream;
  if (asked && !later) {
    const lineGloss = asked.lineId ? findLine(asked.lineId) : undefined;
    return {
      speaker: asked.speaker as CharacterId,
      streamId: -1,
      text: asked.text,
      playing: false,
      thinking: false,
      gloss: lineGloss ? glossFor(lineGloss.glosses, firstLanguage) : null,
    };
  }
  if (thinking) {
    return {
      speaker: thinker,
      streamId: -1,
      text: '',
      playing: false,
      thinking: true,
      gloss: null,
    };
  }
  const caption = call.caption;
  if (!caption) return null;
  const reaction = tracker.reactions.includes(caption.streamId);
  if (reaction) {
    // A recorded "Ooh," covers the wait: the dots show until the reply's own words arrive.
    return {
      speaker: caption.character,
      streamId: caption.streamId,
      text: '',
      playing: call.playing,
      thinking: true,
      gloss: null,
    };
  }
  if (caption.text.trim() === '') return null;
  const lineId = tracker.recorded[caption.streamId];
  const line = lineId ? findLine(lineId) : undefined;
  return {
    speaker: caption.character,
    streamId: caption.streamId,
    text: caption.text,
    playing: call.playing,
    thinking: false,
    gloss: line ? glossFor(line.glosses, firstLanguage) : null,
  };
}

function moodsOf(
  input: CallViewInput,
  s: {
    mic: MicState;
    thinking: boolean;
    fixed: boolean;
    listener: CharacterId | null;
    talking: CharacterId | null;
  },
): Partial<Record<CharacterId, Mood>> {
  const { layout, call, tracker } = input;
  const out: Partial<Record<CharacterId, Mood>> = {};
  for (const spot of [...layout.cast, ...layout.castFront]) {
    const c = spot.character;
    let mood: Mood = 'happy';
    if (call.onHold) mood = 'patient';
    else if (s.fixed && (c === s.listener || c === 'pip')) mood = 'excited';
    else if (tracker.correction !== null && c === (s.listener ?? 'pip')) mood = 'confused';
    else if (s.thinking && c === (s.listener ?? layout.pill)) mood = 'think';
    else if (s.talking === c) mood = 'happy';
    else if (s.mic === 'yourTurn' || s.mic === 'listening') mood = 'listen';
    out[c] = mood;
  }
  return out;
}
