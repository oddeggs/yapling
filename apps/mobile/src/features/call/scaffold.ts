import type { FirstLanguage, Pace, Stage } from '@yapling/contracts';
import { findLine, glossFor, type Scene } from '@yapling/story';

import type { CallState } from '../../voice/call-state';
import { answerOf, beatOf, cardOf, type SayCard, type TrackerState } from './tracker';

/*
 * The beginner path's help around the mic, as data: the say-this cards (one, or two to choose from,
 * up for the whole turn, ticked once the turn passes), the task card in the learner's language,
 * "Nói lại" / "Chậm thôi" in every call, "Bỏ qua" after a try at a card, and "Gợi ý" from Newcomer
 * up. Copy stays out: the screen looks it up. Pure, so the rules are tested on their own.
 */

export interface CardView {
  readonly phrase: string;
  readonly gloss: string | null;
  /** This card's "hear it" plays the recorded line that says it. */
  readonly hear: boolean;
  /** The card the learner said, once the turn passed (of two, the one whose words were heard). */
  readonly said: boolean;
}

export interface CardsView {
  /** Keys the cards' entrance: a new turn's cards rise again. */
  readonly key: string;
  readonly cards: readonly CardView[];
  /** The turn passed: "BẠN ĐÃ NÓI", mint, the tick. */
  readonly passed: boolean;
  /** The recorded line the cards' "hear it" plays. */
  readonly modelLineId: string | null;
}

export interface ScaffoldView {
  readonly cards: CardsView | null;
  /** The task, in the learner's first language, until "OK". */
  readonly task: { readonly key: string; readonly text: string } | null;
  /** "Nói lại" / "Chậm thôi": shown once a line has been said; tappable while the call waits. */
  readonly replay: { readonly enabled: boolean; readonly slowerOn: boolean } | null;
  readonly skip: boolean;
  readonly hint: boolean;
  /** A recorded line can be played on the phone now (nothing else is heard or held). */
  readonly canHear: boolean;
}

export interface ScaffoldInput {
  readonly call: CallState;
  readonly tracker: TrackerState;
  readonly scene: Scene;
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  /** The call is live and its scene still going. */
  readonly live: boolean;
  /** The classic hint card is up. */
  readonly hintShown: boolean;
  /** The pace the call speaks at now (the profile's, or changed in the call). */
  readonly pace: Pace | null;
}

const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Number words as digits ("forty-five" → "45"), as the transcript writes them. */
const digits = (text: string) =>
  text
    .replace(
      new RegExp(`\\b(${TENS.slice(2).join('|')})[- ](${UNITS.slice(1).join('|')})\\b`, 'g'),
      (_, t: string, u: string) => String(TENS.indexOf(t) * 10 + UNITS.indexOf(u)),
    )
    .replace(/\b[a-z]+\b/g, (w) => {
      const unit = UNITS.indexOf(w);
      const teen = TEENS.indexOf(w);
      const tens = TENS.indexOf(w);
      if (unit >= 0) return String(unit);
      if (teen >= 0) return String(teen + 10);
      return tens >= 2 ? String(tens * 10) : w;
    });

const words = (text: string) =>
  digits(text.toLowerCase())
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

/** Which card the model line says: the one with its words, else the first. */
function heardCard(card: SayCard): number {
  if (card.modelLineId === null || !findLine(card.modelLineId)?.audio) return -1;
  if (card.choices.length < 2) return 0;
  const said = words(findLine(card.modelLineId)?.caption ?? '');
  const at = card.choices.findIndex((c) => said.includes(words(c.phrase)));
  return at < 0 ? 0 : at;
}

/** Of two cards, the one whose words the learner's last try on its beat had most of; -1: unsure. */
function saidCard(card: SayCard, tracker: TrackerState): number {
  if (card.choices.length < 2) return -1;
  const turn = tracker.heard.filter((h) => h.beatId === card.beatId).at(-1);
  if (!turn) return -1;
  const heard = new Set(words(turn.text).split(' '));
  const scores = card.choices.map(
    (c) =>
      words(c.phrase.replace(/\{name\}/g, ''))
        .split(' ')
        .filter((w) => heard.has(w)).length,
  );
  const best = Math.max(...scores);
  return best > 0 && scores.filter((n) => n === best).length === 1 ? scores.indexOf(best) : -1;
}

function cardsView(tracker: TrackerState): CardsView | null {
  const now = cardOf(tracker);
  const { passed } = tracker;
  const shown = passed && passed.beatId === tracker.beatId ? passed : (now ?? passed ?? null);
  if (!shown) return null;
  const hear = heardCard(shown);
  const done = shown === passed;
  const said = done ? saidCard(shown, tracker) : -1;
  return {
    key: shown.beatId ?? '',
    cards: shown.choices.map((c, i) => ({
      phrase: c.phrase,
      gloss: c.gloss,
      hear: i === hear,
      said: done && (said < 0 || said === i),
    })),
    passed: done,
    modelLineId: hear < 0 ? null : shown.modelLineId,
  };
}

export function scaffoldView(input: ScaffoldInput): ScaffoldView {
  const { call, tracker, scene, stage, firstLanguage, live } = input;
  const answer = answerOf(beatOf(scene, tracker.beatId));
  const quiet = !call.playing && !call.learnerSpeaking && !call.talkHeld;
  const waiting =
    live && answer !== null && quiet && (call.phase === 'your_turn' || call.phase === 'listening');
  const cards = live ? cardsView(tracker) : null;
  const task =
    live && answer?.task && tracker.taskDone !== tracker.beatId
      ? {
          key: tracker.beatId ?? '',
          text: glossFor(answer.task.glosses, firstLanguage) ?? answer.task.en,
        }
      : null;
  const turnCard = cards !== null && !cards.passed;
  return {
    cards,
    task,
    replay:
      live && tracker.lines.length > 0
        ? { enabled: waiting, slowerOn: input.pace === 'slower' }
        : null,
    skip: waiting && turnCard && tracker.beatTries > 0 && !tracker.skipped,
    hint:
      waiting &&
      stage !== 'visitor' &&
      !turnCard &&
      !input.hintShown &&
      tracker.hint === null &&
      answer?.timer == null &&
      answer?.exits.silent.hint != null,
    canHear: live && quiet && call.phase !== 'thinking',
  };
}
