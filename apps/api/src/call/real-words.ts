/*
 * Whether a learner's turn holds real words. A press with nothing in it, room noise Scribe wrote
 * down as a tag ("(coughs)", "[noise]"), or only hesitation sounds ("uh", "um", "ờ", "uh huh") is
 * not a turn: nothing is answered and no try counts. Any other word counts, in any language,
 * however short ("I", "no", "ok", "25"): what it means is the character's to judge.
 *
 * `speechKind` goes one step further for code that needs it (a card match must not take "Trà" for
 * "Tea"): text with real words is Vietnamese when a real word carries Vietnamese marks. In the turn
 * judge spike (`spikes/jev`, candidate 2) the two rules together sorted 91.5% of turns into English
 * attempt, Vietnamese or noise; Vietnamese typed without marks ("Toi khong biet") still reads as
 * English.
 */

/** Scribe's sound tags: (laughs), [noise], *cough*. */
const SOUND_TAG = /\([^)]*\)|\[[^\]]*\]|\{[^}]*\}|\*[^*]*\*/gu;

/** "uh huh", "uh-huh", "mm hm", "un huh": agreement sounds, never an answer on their own. */
const UH_HUH = /(?<![\p{L}\p{N}])(?:u+h*|u+n+|m+)[\s-]+h+u+h+(?![\p{L}\p{N}])/gu;

/** Hesitation sounds, any length ("ummm", "hmmm"), in English and Vietnamese. */
const FILLER =
  /^(?:u+h*|u+m+|uh+m+|e+r+m*|e+h+|e+|a+h*|o+h*|h+m+|m+|m+h+m+|ờ+|ừ+m+|ư+m*|ơ+|à+|ạ+|ồ+|ò+|ô+)$/u;

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Letters only Vietnamese writes (with tone and vowel marks). */
const VIETNAMESE_MARKS = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/u;

/** The words of a turn that aren't hesitation sounds or sound tags, lower-cased. */
function realWords(text: string): string[] {
  const cleaned = text.normalize('NFC').toLowerCase().replace(SOUND_TAG, ' ').replace(UH_HUH, ' ');
  return cleaned
    .split(/[^\p{L}\p{M}\p{N}']+/u)
    .map((token) => token.replace(/'/g, ''))
    .filter((token) => LETTER_OR_DIGIT.test(token) && !FILLER.test(token));
}

/** True when `text` has at least one word that isn't a hesitation sound or a sound tag. */
export function hasRealWords(text: string): boolean {
  return realWords(text).length > 0;
}

export type SpeechKind = 'english' | 'vietnamese' | 'noise';

/** What a turn most likely was: noise (no real words), Vietnamese (marks on a real word), else English. */
export function speechKind(text: string): SpeechKind {
  const words = realWords(text);
  if (words.length === 0) return 'noise';
  return words.some((w) => VIETNAMESE_MARKS.test(w)) ? 'vietnamese' : 'english';
}
