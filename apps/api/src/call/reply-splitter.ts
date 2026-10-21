import { CONTROL_MARKER } from './control';

/*
 * Splits a streamed model reply into the words to speak and the control line, as text arrives.
 *
 * - Only whole words leave the splitter while streaming (a word is whole once whitespace follows
 *   it); the last word leaves at `end()`.
 * - Everything from the control marker (`§`), or from a `{` (spoken lines never hold braces), is
 *   control and is never returned as speech.
 * - The spoken line is trimmed: two sentences at most, and about `maxWords` words (cut at the
 *   next clause end once over, hard cut a few words later).
 * - After a recorded reaction ("Ooh,") has played, a leading reaction word is dropped.
 * - Markup the voice would read out (`*`, `_`, `#`, backticks) is removed.
 */

const REACTION_WORD = /^(?:o+h+|oh|mm+|hmm+|ah+|aww*|wow)[,.!…]*$/i;
const SENTENCE_END = /[.!?…]["'”’)]*$/;
const CLAUSE_END = /[,;:.!?…]["'”’)]*$/;
const MARKUP = /[*_#`]/g;
/** Words allowed past `maxWords` while waiting for a clause to end. */
const OVERRUN_WORDS = 8;

export interface SplitterOptions {
  readonly maxWords: number;
  readonly maxSentences?: number;
  /** A recorded reaction already started the reply: drop a leading "Ooh"/"Mm". */
  readonly afterReaction?: boolean;
}

export interface SplitEnd {
  /** The last spoken words, if any. */
  readonly tail: string;
  /** The text after the control marker, or null when the reply had none. */
  readonly control: string | null;
}

export class ReplySplitter {
  private pending = '';
  private control: string | null = null;
  private words = 0;
  private sentences = 0;
  private done = false;
  private first = true;
  private capitalizeNext = false;
  private readonly spoken: string[] = [];

  constructor(private readonly options: SplitterOptions) {}

  /** The whole spoken line so far. */
  get text(): string {
    return this.spoken.join(' ');
  }

  /** True once the line is complete (trimmed); later text is dropped. */
  get finished(): boolean {
    return this.done;
  }

  /** Feeds a streamed delta; returns the whole words now safe to speak ("" when none). */
  push(delta: string): string {
    if (this.control !== null) {
      this.control += delta;
      return '';
    }
    const marker = firstMarker(delta);
    if (marker >= 0) {
      this.pending += delta.slice(0, marker);
      this.control = delta.slice(marker);
      return this.takeWords(true);
    }
    this.pending += delta;
    return this.takeWords(false);
  }

  /** Ends the stream: the last words and the control line. */
  end(): SplitEnd {
    const tail = this.takeWords(true);
    return { tail, control: this.control === null ? null : stripMarker(this.control) };
  }

  private takeWords(all: boolean): string {
    const text = this.pending.replace(/\s+/g, ' ');
    const cut = all ? text.length : text.lastIndexOf(' ');
    if (cut <= 0 && !all) return '';
    const ready = text.slice(0, Math.max(0, cut));
    this.pending = all ? '' : text.slice(cut + 1);
    const out: string[] = [];
    for (const raw of ready.split(' ')) {
      const word = raw.replace(MARKUP, '');
      if (word === '' || this.done) continue;
      if (this.first) {
        this.first = false;
        if (this.options.afterReaction === true && REACTION_WORD.test(word)) {
          this.capitalizeNext = true;
          continue;
        }
      }
      let spoken = word;
      if (this.capitalizeNext) {
        spoken = spoken.charAt(0).toUpperCase() + spoken.slice(1);
        this.capitalizeNext = false;
      }
      this.words++;
      if (SENTENCE_END.test(spoken)) this.sentences++;
      const overLimit = this.words >= this.options.maxWords;
      if (this.sentences >= (this.options.maxSentences ?? 2)) {
        this.done = true;
      } else if (overLimit && CLAUSE_END.test(spoken)) {
        spoken = spoken.replace(/[,;:]$/, '.');
        this.done = true;
      } else if (this.words >= this.options.maxWords + OVERRUN_WORDS) {
        spoken = `${spoken.replace(/[,;:]$/, '')}.`;
        this.done = true;
      }
      out.push(spoken);
    }
    if (out.length === 0) return '';
    this.spoken.push(...out);
    return `${out.join(' ')} `;
  }
}

function firstMarker(text: string): number {
  const a = text.indexOf(CONTROL_MARKER);
  const b = text.indexOf('{');
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}

function stripMarker(text: string): string {
  return text.startsWith(CONTROL_MARKER) ? text.slice(CONTROL_MARKER.length) : text;
}
