import type { CallRecord, CharacterId, FirstLanguage, Progress, Stage } from '@yapling/contracts';
import {
  SETTLING_SCENES,
  settlingPhrasesFor,
  type SettlingChapter,
  type SettlingSceneId,
} from '@yapling/domain';
import type { Translate } from '@yapling/i18n';
import {
  CAST,
  activeBeats,
  findPhrase,
  findScene,
  glossFor,
  isCardTurn,
  passesOnWords,
  withName,
  type Answer,
} from '@yapling/story';

import { earnedKeepsakes, type EarnedKeepsakes } from './keepsake-model';
import { isFirstRingCall, ringChange, type PayoffLearner } from './model';

/*
 * The Visitor's after-call card, as data: the learner's own sentences back as stickers, the
 * chapter's seed packet, and a one-tap "Vừa sức / Khó quá" with the guide's reply. No score and no
 * fixes. The sentences are what the call heard the learner say; when the call screen didn't hand
 * them over (the app was closed in between), the lines the server kept as can-do evidence for
 * this call stand in. Nothing here invents a line.
 *
 * In a call of card turns (every Settling-in chapter), only a turn that passed on its own words
 * gives its sentence back; a turn passed another way (the generous second try, a skip) shows its
 * card, the line the listener said back, never what was heard.
 */

/** Who guides Settling in and answers "Vừa sức / Khó quá". */
export const GUIDE: CharacterId = 'linh';

/** How many of the learner's sentences the card shows (the board fits three to six). */
export const SAID_MAX = 6;

export interface VisitorInput {
  readonly call: CallRecord;
  readonly progress: Pick<Progress, 'canDos' | 'keepsakes' | 'weeks'> | null;
  readonly learner: PayoffLearner;
  readonly firstLanguage: FirstLanguage;
  /** What the call heard the learner say, in order; null when the call screen didn't hand it on. */
  readonly heard: readonly string[] | null;
}

export interface VisitorSeed {
  /** "GÓI HẠT · CHƯƠNG 1". */
  readonly tag: string;
  readonly phrase: string;
  /** The meaning in the learner's language; null when there is none. */
  readonly gloss: string | null;
  readonly sub: string;
}

export interface VisitorAfterCall {
  readonly state: 'visitor';
  /** "Làm quen · 1/6 · Hello". */
  readonly kicker: string;
  readonly title: string;
  /** The face on the sticker beside the title: whoever led the call. */
  readonly host: CharacterId;
  readonly said: {
    readonly title: string;
    readonly lines: readonly string[];
    readonly a11y: string;
  } | null;
  readonly seed: VisitorSeed | null;
  readonly feel: {
    readonly title: string;
    readonly justRight: string;
    readonly tooHard: string;
    readonly replies: {
      readonly justRight: string;
      readonly slower: string;
      readonly practise: string;
    };
  };
  /** "Thùng "Hello" đã được dỡ trong hang". */
  readonly box: string | null;
  readonly keepsakes: EarnedKeepsakes | null;
  readonly cta: string;
}

/** The Visitor card is for every call a Visitor makes, and for every Settling-in chapter. */
export const isVisitorCall = (call: Pick<CallRecord, 'kind'>, stage: Stage | null): boolean =>
  call.kind === 'settling' || stage === 'visitor';

/** A Settling-in chapter's number from its scene; null for any other scene. */
export function settlingChapterOf(sceneId: string): SettlingChapter | null {
  const index = SETTLING_SCENES.indexOf(sceneId as SettlingSceneId);
  return index < 0 ? null : ((index + 1) as SettlingChapter);
}

/** Vietnamese letters: a turn heard in Vietnamese isn't one of the learner's English sentences. */
const VIETNAMESE = /[ăâđêôơưàáạảãầấậẩẫằắặẳẵèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;

/** A heard line as a sticker: trimmed, its first letter a capital. */
function asSticker(line: string): string {
  const text = line.trim().replace(/\s+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A heard line or a card as a sticker's key: letters and digits only, lower case. */
const keyOf = (line: string) => line.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Lines as stickers, in order, without repeats, empty lines or Vietnamese, at most `SAID_MAX`. */
function stickers(source: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of source) {
    const line = asSticker(raw);
    const key = keyOf(line);
    if (key === '' || VIETNAMESE.test(line) || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out.slice(0, SAID_MAX);
}

/**
 * The scene's turns as a Visitor plays them, when every one is a card turn (passed by its words);
 * null for a scene with an open turn too, or none.
 */
function cardTurnsOf(sceneId: string): readonly Answer[] | null {
  const scene = findScene(sceneId);
  if (!scene) return null;
  const answers = activeBeats(scene, 'visitor').flatMap((b) =>
    (b.kind === 'learner' || b.kind === 'gen') && b.answer !== null ? [b.answer] : [],
  );
  return answers.length > 0 && answers.every(isCardTurn) ? answers : null;
}

/** The card a turn passed without its words shows: the first, with the name; none for "…". */
function cardLine(answer: Answer, learnerName: string): string | null {
  const card = answer.choices[0]?.en;
  if (card === undefined) return null;
  const line = withName(card, learnerName);
  return line.includes('…') ? null : line;
}

/**
 * A card call's sentences, turn by turn: the heard line that passed it on its words, else its card.
 * Heard lines are matched to the turns in order; a turn after the last one matched counts as
 * reached only when the scene played to its end.
 */
function cardCallLines(
  heard: readonly string[],
  turns: readonly Answer[],
  learnerName: string,
  complete: boolean,
): string[] {
  const passed = new Map<number, string>();
  let next = 0;
  for (const line of heard) {
    if (VIETNAMESE.test(line)) continue;
    const at = turns.findIndex((a, i) => i >= next && passesOnWords(a, line, learnerName));
    if (at < 0) continue;
    passed.set(at, line);
    next = at + 1;
  }
  const reached = complete ? turns.length : next;
  return turns
    .slice(0, reached)
    .flatMap((answer, i) => passed.get(i) ?? cardLine(answer, learnerName) ?? []);
}

/**
 * The learner's own English sentences from the call: what the call heard, in order, without
 * repeats, empty turns or Vietnamese (in a call of card turns, only what passed on its words, the
 * card for the rest); otherwise the lines the server kept as can-do evidence.
 */
export function saidLines(
  heard: readonly string[] | null,
  call: Pick<CallRecord, 'id' | 'summary'> & Partial<Pick<CallRecord, 'sceneId' | 'endReason'>>,
  progress: Pick<Progress, 'canDos'> | null,
  learnerName = '',
): string[] {
  const evidence = [
    ...(call.summary?.canDoEvidence.map((e) => e.quote) ?? []),
    ...(progress?.canDos.flatMap((c) =>
      c.evidence.filter((e) => e.callRecordId === call.id).map((e) => e.quote),
    ) ?? []),
  ];
  if (heard === null || !heard.some((l) => l.trim() !== '')) return stickers(evidence);
  const turns = call.sceneId === undefined ? null : cardTurnsOf(call.sceneId);
  return stickers(
    turns === null
      ? heard
      : cardCallLines(heard, turns, learnerName, call.endReason === 'scene_complete'),
  );
}

/** The phrase a call seeded: the chapter's own for Settling in, else the first met in the call. */
function seedOf(
  call: CallRecord,
  chapter: SettlingChapter | null,
  language: FirstLanguage,
  t: Translate,
): VisitorSeed | null {
  const id =
    chapter !== null
      ? settlingPhrasesFor(chapter)[0]?.id
      : call.summary?.phraseEvents.find((e) => e.event === 'met')?.phraseId;
  if (id === undefined) return null;
  const phrase = findPhrase(id);
  const text =
    phrase?.en ?? call.summary?.phraseEvents.find((e) => e.phraseId === id)?.text ?? null;
  if (text === null) return null;
  return {
    tag:
      chapter !== null ? t('payoff.visitor.seedTag', { chapter }) : t('payoff.visitor.seedTagCall'),
    phrase: text,
    gloss: phrase ? glossFor(phrase.glosses, language) : null,
    sub: t('payoff.visitor.seedSub'),
  };
}

/** Everything the Visitor's after-call card shows. */
export function buildVisitorAfterCall(input: VisitorInput, t: Translate): VisitorAfterCall {
  const { call, progress, learner, firstLanguage, heard } = input;
  const chapter = settlingChapterOf(call.sceneId);
  const scene = findScene(call.sceneId);
  const title = scene?.title ?? '';
  const lines = saidLines(heard, call, progress, learner.name);
  const ring = ringChange(progress?.weeks, call.id);
  const keepsakes = progress ? earnedKeepsakes(call, progress, learner) : null;
  const guide = CAST[GUIDE].name;
  // A chapter left before its end isn't done: its box stays packed in the burrow, its seed packet
  // isn't earned, and the card says see you next time.
  const unfinished = chapter !== null && call.endReason !== 'scene_complete';
  return {
    state: 'visitor',
    kicker:
      chapter !== null
        ? t('payoff.visitor.kicker', { chapter, total: SETTLING_SCENES.length, title })
        : isFirstRingCall(progress?.weeks, call.id)
          ? t('payoff.afterCall.firstCall')
          : t(`payoff.afterCall.kind.${call.kind}`),
    title: unfinished ? t('payoff.visitor.notDone') : t('payoff.afterCall.done'),
    host: call.character,
    said:
      lines.length > 0
        ? {
            title: t('payoff.visitor.said'),
            lines,
            a11y: t('payoff.visitor.a11ySaid', { lines: lines.join(' ') }),
          }
        : null,
    seed: unfinished ? null : seedOf(call, chapter, firstLanguage, t),
    feel: {
      title: t('payoff.visitor.feelTitle'),
      justRight: t('payoff.visitor.justRight'),
      tooHard: t('payoff.visitor.tooHard'),
      replies: {
        justRight: t('payoff.visitor.replyJustRight', { name: guide }),
        slower: t('payoff.visitor.replySlower', { name: guide }),
        practise: t('payoff.visitor.replyPractise', { name: guide }),
      },
    },
    box: unfinished
      ? null
      : chapter !== null && title !== ''
        ? t('payoff.visitor.box', { title })
        : ring !== null && ring.week === 1
          ? t('payoff.afterCall.boxUnpacked')
          : null,
    keepsakes,
    cta: keepsakes ? t('common.continue') : t('payoff.afterCall.cta'),
  };
}
