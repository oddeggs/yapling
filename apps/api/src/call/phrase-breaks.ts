/*
 * Phrase breaks for slow stages, as long as the stage's `phraseBreakSeconds` in `@yapling/domain`.
 * The cast voices run too fast on Flash for Newcomer pace even at the stage's speed, so a short
 * SSML break goes between phrases (after , . ? !): about 115–126 words a minute for Pip at
 * Newcomer. The TTS socket parses SSML only with
 * `enable_ssml_parsing=true`; without it the voice reads the tag out.
 *
 * Breaks go *before* the word that follows the punctuation, never after the last word, so a turn
 * never ends on silence and a tag is never split across two pushes.
 *
 * Flash returns the tag's characters (and sometimes an extra ". ") in its alignment, so
 * `AlignmentMapper` maps the provider's characters back onto the plain caption the phone shows.
 */

const PHRASE_END = /[,.?!…]["'”’)]*$/;

export const breakTag = (seconds: number): string => `<break time="${seconds}s" />`;

/** Inserts breaks into whole-word pieces (each ends with a space) as they stream to TTS. */
export class BreakInserter {
  private afterPhrase = false;

  constructor(private readonly seconds: number | null) {}

  push(piece: string): string {
    if (this.seconds === null || piece.trim() === '') return piece;
    const tag = breakTag(this.seconds);
    const words = piece.split(' ').filter((w) => w !== '');
    let out = '';
    for (const word of words) {
      if (this.afterPhrase) out += tag;
      out += `${word} `;
      this.afterPhrase = PHRASE_END.test(word);
    }
    return out;
  }
}

/** One provider alignment chunk: characters with start and duration, from the chunk's start. */
export interface ProviderAlignment {
  readonly chars: readonly string[];
  readonly charStartTimesMs: readonly number[];
  readonly charDurationsMs: readonly number[];
}

export interface MappedAlignment {
  readonly chars: string[];
  readonly startMs: number[];
  readonly endMs: number[];
}

/** How far ahead a provider character may match the caption after characters were skipped. */
const LOOKAHEAD = 3;

/**
 * Maps provider alignment onto the plain text that was sent (tags removed), across chunks: drops
 * tag characters and characters the provider added, fills caption characters it skipped with a
 * zero-length timing, and offsets every time by the audio already sent on the stream.
 */
export class AlignmentMapper {
  private expected = '';
  private pos = 0;
  private inTag = false;

  /** The plain text of a piece pushed to TTS. */
  addText(plain: string): void {
    this.expected += plain;
  }

  map(alignment: ProviderAlignment, offsetMs: number): MappedAlignment {
    const out: MappedAlignment = { chars: [], startMs: [], endMs: [] };
    const emit = (ch: string, start: number, end: number) => {
      out.chars.push(ch);
      out.startMs.push(Math.max(0, Math.round(start)));
      out.endMs.push(Math.max(0, Math.round(Math.max(start, end))));
    };
    alignment.chars.forEach((ch, i) => {
      const start = offsetMs + (alignment.charStartTimesMs[i] ?? 0);
      const end = start + (alignment.charDurationsMs[i] ?? 0);
      if (this.inTag) {
        if (ch === '>') this.inTag = false;
        return;
      }
      if (ch === '<') {
        this.inTag = true;
        return;
      }
      if (this.pos >= this.expected.length) return;
      if (this.expected[this.pos] === ch) {
        emit(ch, start, end);
        this.pos++;
        return;
      }
      if (/\s/.test(ch)) return;
      for (let k = 1; k <= LOOKAHEAD; k++) {
        if (this.expected[this.pos + k] !== ch) continue;
        for (let j = 0; j < k; j++) emit(this.expected[this.pos + j] ?? ' ', start, start);
        emit(ch, start, end);
        this.pos += k + 1;
        return;
      }
      // A character the provider added (". " after a break): not in the caption.
    });
    return out;
  }
}

/** The plain text of a piece: tags removed. */
export const withoutTags = (text: string): string => text.replace(/<[^>]*>/g, '');
