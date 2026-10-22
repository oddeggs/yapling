import type { CharacterId, Id } from '@yapling/contracts';

import { answer, rec, scene, ui, type AnswerSpec } from '../build';
import { glossed, NO_GLOSS, viDraft } from '../gloss';
import type { Answer, Beat, GlossedText, Scene } from '../types';

/*
 * Small builders for the weeks after the first (`docs/season-1-script.md`, "Weeks 2–7"): the
 * stage bounds, Newcomer turns with their hint, and the listening scenes (stories, postcards,
 * voicemails), which play the same recordings at every stage and hold only written lines.
 */

/** Only at Visitor: the Visitor version of a turn or line. */
export const V = { maxStage: 'visitor' } as const;
/** From Newcomer up: the beats a Visitor plays in another form, or skips. */
export const N = { minStage: 'newcomer' } as const;

/** A Visitor-row live line. */
export const VISITOR_LINE = 'One short sentence, eight words at most. Simple, slow English.';

/** A Newcomer hint: English, with its Vietnamese draft. */
export const hint = (en: string, vi: string): GlossedText => glossed(en, viDraft(vi));

/** A hint with no first-language help (Pass it on rounds, timed pitches, listening checks). */
export const englishOnly = (en: string): GlossedText => glossed(en, NO_GLOSS);

export interface TurnSpec extends Omit<AnswerSpec, 'fallback' | 'hint'> {
  readonly hint: GlossedText;
  /** What the listener (or `by`) says to move on when the learner stays stuck. */
  readonly stuck: string;
  readonly by?: CharacterId;
}

/** A Newcomer turn: judged by the director, with the phrase hint and a kind way forward. */
export const turn = ({ stuck, by, ...spec }: TurnSpec): Answer =>
  answer({ ...spec, fallback: { speaker: by ?? spec.listener, intent: stuck } });

/** Words that pass a "my job" card: "I'm a …", "I work at …" and the commonest job words. */
export const JOB_WORDS: readonly string[] = [
  "i'm a",
  'i am a',
  "i'm an",
  'i am an',
  'i work',
  'job',
  'student',
  'office',
];

/** A Teach-the-yapling turn: the learner explains a word, and Pip works it out if they're stuck. */
export const explain = (word: string, expects: string, en: string, vi: string): Answer =>
  turn({
    listener: 'pip',
    expects,
    hint: hint(en, vi),
    stuck: `Work out what "${word}" means aloud from what the learner said, and thank them.`,
  });

/** Lines as `rec` beats, `line-1`, `line-2`, … */
const lineBeats = (lines: readonly Id[]): Beat[] =>
  lines.map((line, i) => rec(`line-${i + 1}`, line));

export interface ListeningSpec {
  readonly id: Id;
  readonly title: string;
  readonly summary: string;
  readonly phrases?: readonly Id[];
}

/** Pip's story: recorded lines, each tappable for its gloss. */
export const pipStory = (spec: ListeningSpec, lines: readonly Id[]): Scene =>
  scene({
    ...spec,
    kind: 'story',
    place: 'burrow',
    cast: ['pip'],
    goal: 'Listen to a short story.',
    beats: lineBeats(lines),
  });

/** A postcard (or a stack of them): each card shown, then its recorded line. */
export const postcards = (
  spec: ListeningSpec,
  cards: readonly (readonly [CharacterId, Id])[],
): Scene =>
  scene({
    ...spec,
    kind: 'postcard',
    place: 'burrow',
    cast: [...new Set(cards.map(([from]) => from))],
    goal: 'Read and listen.',
    beats: cards.flatMap(([from, line], i) => {
      const n = cards.length === 1 ? '' : `-${i + 1}`;
      return [ui(`postcard${n}`, { type: 'postcard', from }), rec(`line${n}`, line)];
    }),
  });

/** A voicemail: the phone, the recorded message, and the beep when the message is cut off. */
export const voicemail = (
  spec: ListeningSpec & { readonly from: CharacterId; readonly line: Id; readonly beep?: boolean },
): Scene =>
  scene({
    id: spec.id,
    title: spec.title,
    summary: spec.summary,
    ...(spec.phrases === undefined ? {} : { phrases: spec.phrases }),
    kind: 'voicemail',
    place: 'burrow',
    cast: [spec.from],
    goal: 'Listen to the news.',
    beats: [
      ui('voicemail', { type: 'voicemail', from: spec.from }),
      rec('news', spec.line),
      ...(spec.beep === true ? [ui('beep', { type: 'sfx', sound: 's1-sfx-voicemail-beep' })] : []),
    ],
  });
