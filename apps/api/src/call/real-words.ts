/*
 * Whether a learner's turn holds real words. A press with nothing in it, room noise Scribe wrote
 * down as a tag ("(coughs)", "[noise]"), or only hesitation sounds ("uh", "um", "ờ") is not a
 * turn: nothing is answered and no try counts. Any other word counts, in any language, however
 * short ("I", "no", "ok", "25"): what it means is the character's to judge.
 */

/** Scribe's sound tags: (laughs), [noise], *cough*. */
const SOUND_TAG = /\([^)]*\)|\[[^\]]*\]|\{[^}]*\}|\*[^*]*\*/gu;

/** Hesitation sounds, any length ("ummm", "hmmm"), in English and Vietnamese. */
const FILLER =
  /^(?:u+h*|u+m+|uh+m+|e+r+m*|e+h+|e+|a+h*|o+h*|h+m+|m+|m+h+m+|ờ+|ừ+m+|ư+m*|ơ+|à+|ạ+|ồ+|ò+|ô+)$/u;

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** True when `text` has at least one word that isn't a hesitation sound or a sound tag. */
export function hasRealWords(text: string): boolean {
  const cleaned = text.normalize('NFC').toLowerCase().replace(SOUND_TAG, ' ');
  return cleaned
    .split(/[^\p{L}\p{M}\p{N}']+/u)
    .map((token) => token.replace(/'/g, ''))
    .some((token) => LETTER_OR_DIGIT.test(token) && !FILLER.test(token));
}
