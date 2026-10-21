/**
 * Captions highlight word by word from real timing: the TTS alignment of a live line, or the
 * `.timing.json` of a recorded one. Never from a guessed reading speed. Plain functions, so the
 * worklet that follows the audio clock and the tests run the same code.
 */

/** Character timing as ElevenLabs returns it (and the recorded lines store it). */
export interface CharAlignment {
  readonly characters: readonly string[];
  readonly character_start_times_seconds: readonly number[];
}

/** One word of a caption: when it starts being spoken, and where it ends in the caption. */
export interface CaptionWord {
  /** Seconds from the start of the line's audio. */
  readonly at: number;
  /** The caption's length up to and including this word (and the punctuation stuck to it). */
  readonly end: number;
}

const isSpace = (c: string) => /\s/.test(c);

/**
 * The start time of every character of `caption`, matched in order against the spoken text's
 * alignment. Delivery tags (`[whispers]`) and anything else the caption leaves out are skipped; a
 * caption character the alignment lacks takes the time of the one before it.
 */
export function captionCharTimes(caption: string, alignment: CharAlignment): number[] {
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const out: number[] = [];
  let j = 0;
  let inTag = false;
  let last = starts[0] ?? 0;
  for (const c of caption) {
    let found = -1;
    for (let k = j; k < chars.length; k++) {
      const a = chars[k] ?? '';
      if (a === '[') inTag = true;
      if (inTag) {
        if (a === ']') inTag = false;
        continue;
      }
      if (a === c || (isSpace(a) && isSpace(c))) {
        found = k;
        break;
      }
    }
    if (found >= 0) {
      last = starts[found] ?? last;
      j = found + 1;
    }
    out.push(last);
  }
  return out;
}

/** A caption's words with the time each starts, from its characters' start times. */
export function captionWords(caption: string, charTimes: readonly number[]): CaptionWord[] {
  const words: CaptionWord[] = [];
  let i = 0;
  while (i < caption.length) {
    while (i < caption.length && isSpace(caption.charAt(i))) i++;
    if (i >= caption.length) break;
    const at = charTimes[i] ?? charTimes[charTimes.length - 1] ?? 0;
    while (i < caption.length && !isSpace(caption.charAt(i))) i++;
    words.push({ at, end: i });
  }
  return words;
}

/**
 * How much of the caption has been said at `seconds` into the audio: the length of its said part,
 * whole words only. A word counts as said from the moment it starts.
 */
export function saidLength(words: readonly CaptionWord[], seconds: number): number {
  'worklet';
  let said = 0;
  for (const word of words) {
    if (word.at > seconds) break;
    said = word.end;
  }
  return said;
}
