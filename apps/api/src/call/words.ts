import type { AgainAsk } from './judge';

/*
 * The words of a learner turn, read without a model: whether it holds one of a card turn's words
 * (`matchesCard`), and whether it asks to hear the last line again or slower (`againAsk`).
 *
 * Both read the turn as speech recognition wrote it: lower case, punctuation off, numbers as words
 * ("45", "forty-five" and "forty five" are the same), and common mis-hearings of accented speech
 * read as the word meant ("US." for "Yes", "Taron." for "Pardon?"). The mis-hearings come from
 * the turn judge spike's Scribe transcripts and its card set (`spikes/jev/sets/c4-card.json`);
 * what they miss, Jev's card question catches (`card-judge.ts`).
 */

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const;
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0–99 in words ("forty five"); larger numbers stay digits. */
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return ONES[n] ?? String(n);
  const ten = TENS[Math.floor(n / 10)] ?? '';
  const one = n % 10;
  return one === 0 ? ten : `${ten} ${ONES[one]}`;
}

/** Lower case, words only (apostrophes kept), digits as words. */
export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/(\d+)/g, (d) => ` ${numberWords(Number(d))} `)
    .replace(/[^\p{L}\p{M}\p{N}']+/gu, ' ')
    .replace(/(^|\s)'+|'+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A heard word → the word most likely meant. Whole words only. */
export const MISHEARD: Readonly<Record<string, string>> = {
  // Yes / no
  us: 'yes',
  yet: 'yes',
  yas: 'yes',
  yess: 'yes',
  // Hi / bye
  high: 'hi',
  hai: 'hi',
  hay: 'hi',
  bai: 'bye',
  buy: 'bye',
  by: 'bye',
  // Thank you
  tank: 'thank',
  sank: 'thank',
  tanks: 'thanks',
  // Again, pardon, slowly, please
  taron: 'pardon',
  pardo: 'pardon',
  agen: 'again',
  agan: 'again',
  slowy: 'slowly',
  slowley: 'slowly',
  plis: 'please',
  pees: 'please',
  plea: 'please',
  // Nice to meet you
  nai: 'nice',
  meat: 'meet',
  mit: 'meet',
  // Tea, coffee, how much, here you go
  tee: 'tea',
  t: 'tea',
  copy: 'coffee',
  mud: 'much',
  hear: 'here',
  hia: 'here',
  // Books, clothes
  box: 'books',
  close: 'clothes',
  // Numbers
  too: 'two',
  won: 'one',
  night: 'nine',
  tan: 'ten',
  fife: 'five',
  // I like …
  lie: 'like',
};

/** Phrases heard for one word, matched before the single words. */
const MISHEARD_PHRASES: readonly (readonly [RegExp, string])[] = [
  [/\bfor tea\b/g, 'forty'],
  [/\bhammer\b/g, 'how much'],
];

/** The turn as heard, and as meant (mis-hearings read as the words meant). */
export function readings(text: string): readonly string[] {
  const heard = normalize(text);
  let meant = heard;
  for (const [pattern, word] of MISHEARD_PHRASES) meant = meant.replace(pattern, word);
  meant = meant
    .split(' ')
    .map((w) => MISHEARD[w] ?? w)
    .join(' ');
  return meant === heard ? [heard] : [heard, meant];
}

/** A card turn's words, with `{name}` as the learner's name (left out when there is none). */
export function cardWords(accept: readonly string[], learnerName: string): string[] {
  const name = normalize(learnerName);
  return accept
    .map((word) => (word.includes('{name}') ? (name ? word.replaceAll('{name}', name) : '') : word))
    .map(normalize)
    .filter((word) => word !== '');
}

/** Whether the turn holds one of the words (or phrases), as whole words. */
export function matchesCard(text: string, words: readonly string[]): boolean {
  const heard = readings(text).map((r) => ` ${r} `);
  return words.some((word) => heard.some((r) => r.includes(` ${word} `)));
}

const SLOWER = / (slow|slowly|slower|too fast|so fast|very fast|chậm|nhanh quá) /u;
const REPEAT_ALONE = /^ (sorry|pardon|excuse me|what|huh) $/;
const REPEAT =
  / (again|pardon|repeat|say that again|what did you say|one more time|nói lại|say it again) /u;
const SORRY_PLEASE = /^ sorry (again|please)/;

/**
 * "Sorry? Again, please." or "Slowly, please." without the model: the fuller phrase list of the
 * turn judge spike (85% on its again set, against Jev's 100%), for turns Jev doesn't judge.
 */
export function againAsk(text: string): AgainAsk | null {
  for (const reading of readings(text)) {
    const t = ` ${reading} `;
    if (SLOWER.test(t)) return 'slower';
    if (REPEAT_ALONE.test(t) || REPEAT.test(t) || SORRY_PLEASE.test(t)) return 'repeat';
  }
  return null;
}

/** `{name}` in a card or line as the learner's name; "…" (their own words) when there is none. */
export function withName(text: string, name: string): string {
  return text.replaceAll('{name}', name.trim() || '…');
}
