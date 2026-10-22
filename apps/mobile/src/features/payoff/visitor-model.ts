import type { CallRecord, CharacterId, FirstLanguage, Progress, Stage } from '@yapling/contracts';
import {
  SETTLING_SCENES,
  settlingPhrasesFor,
  type SettlingChapter,
  type SettlingSceneId,
} from '@yapling/domain';
import type { Translate } from '@yapling/i18n';
import { CAST, findPhrase, findScene, glossFor } from '@yapling/story';

import { earnedKeepsakes, type EarnedKeepsakes } from './keepsake-model';
import { isFirstRingCall, ringChange, type PayoffLearner } from './model';

/*
 * The Visitor's after-call card, as data: the learner's own sentences back as stickers, the
 * chapter's seed packet, and a one-tap "Vừa sức / Khó quá" with the guide's reply. No score and no
 * fixes. The sentences are what the call heard the learner say; when the call screen didn't hand
 * them over (the app was closed in between), the lines the server kept as can-do evidence for
 * this call stand in. Nothing here invents a line.
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

/**
 * The learner's own English sentences from the call: what the call heard, in order, without
 * repeats, empty turns or Vietnamese; otherwise the lines the server kept as can-do evidence.
 */
export function saidLines(
  heard: readonly string[] | null,
  call: Pick<CallRecord, 'id' | 'summary'>,
  progress: Pick<Progress, 'canDos'> | null,
): string[] {
  const evidence = [
    ...(call.summary?.canDoEvidence.map((e) => e.quote) ?? []),
    ...(progress?.canDos.flatMap((c) =>
      c.evidence.filter((e) => e.callRecordId === call.id).map((e) => e.quote),
    ) ?? []),
  ];
  const source = heard !== null && heard.some((l) => l.trim() !== '') ? heard : evidence;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of source) {
    const line = asSticker(raw);
    const key = line.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (key === '' || VIETNAMESE.test(line) || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out.slice(0, SAID_MAX);
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
  const lines = saidLines(heard, call, progress);
  const ring = ringChange(progress?.weeks, call.id);
  const keepsakes = progress ? earnedKeepsakes(call, progress, learner) : null;
  const guide = CAST[GUIDE].name;
  return {
    state: 'visitor',
    kicker:
      chapter !== null
        ? t('payoff.visitor.kicker', { chapter, total: SETTLING_SCENES.length, title })
        : isFirstRingCall(progress?.weeks, call.id)
          ? t('payoff.afterCall.firstCall')
          : t(`payoff.afterCall.kind.${call.kind}`),
    title: t('payoff.afterCall.done'),
    host: call.character,
    said:
      lines.length > 0
        ? {
            title: t('payoff.visitor.said'),
            lines,
            a11y: t('payoff.visitor.a11ySaid', { lines: lines.join(' ') }),
          }
        : null,
    seed: seedOf(call, chapter, firstLanguage, t),
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
    box:
      chapter !== null && title !== ''
        ? t('payoff.visitor.box', { title })
        : ring !== null && ring.week === 1
          ? t('payoff.afterCall.boxUnpacked')
          : null,
    keepsakes,
    cta: keepsakes ? t('common.continue') : t('payoff.afterCall.cta'),
  };
}
