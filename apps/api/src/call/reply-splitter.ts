import { CONTROL_MARKER } from './control';
import { NarrationGuard, type GuardAction } from './narration-guard';

/*
 * Splits a streamed model reply into the words to speak and the control line, as text arrives.
 *
 * - Only whole words leave the splitter while streaming (a word is whole once whitespace follows
 *   it); the last word leaves at `end()`.
 * - Everything from the control marker (`§`), or from a `{` (spoken lines never hold braces), is
 *   control and is never returned as speech.
 * - The spoken line is trimmed: two sentences at most (an exclamation of one or two words, like
 *   "Hi!", doesn't count; a third that is a question is kept, so a reply ends on its question),
 *   and about `maxWords` words (cut at the next clause end once over, hard
 *   cut a few words later).
 * - A leading case tag (`[unclear]`), which the model writes first to commit to how the
 *   learner's turn went, is kept for the call and never spoken.
 * - After a recorded reaction ("Ooh,") has played, a leading reaction word is dropped.
 * - Narration is kept from the voice (`NarrationGuard`): notes about the scene, the speaker
 *   described in the third person, asides and stage directions, labels and quotation marks.
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
  /** The speaker's name, so the guard knows the speaker described in the third person. */
  readonly speaker?: string;
  /** The learner's name, so the guard knows a sentence about them (not to them). */
  readonly learner?: string;
  /** What the learner just said, so a reply that opens by quoting it is checked. */
  readonly heard?: string;
  /** False for written text, which never holds narration. */
  readonly guard?: boolean;
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
  /** Words in the sentence being spoken. */
  private sentenceWords = 0;
  /** Past two sentences: a last sentence held, spoken only if it is a question. */
  private trailing: string[] | null = null;
  private done = false;
  private first = true;
  private capitalizeNext = false;
  private readonly spoken: string[] = [];
  private readonly guard: NarrationGuard | null;
  private tag: string | null = null;
  private tagChecked = false;

  constructor(private readonly options: SplitterOptions) {
    this.guard =
      options.guard === false
        ? null
        : new NarrationGuard(options.speaker ?? '', options.learner ?? '', options.heard ?? '');
  }

  /** The case tag the line started with (`[question]` → `question`), or null. */
  get caseTag(): string | null {
    return this.tag;
  }

  /** True once the first word was read, so `caseTag` is final (null when the line had none). */
  get caseTagKnown(): boolean {
    return this.tagChecked;
  }

  /** What the narration guard did to the line: null when it passed untouched. */
  get guardAction(): GuardAction | null {
    return this.guard?.action ?? null;
  }

  /** The text the guard kept from the voice. */
  get guardDropped(): readonly string[] {
    return this.guard?.dropped ?? [];
  }

  /**
   * Speaks written text in place of a line that had nothing safe left (it was all narration).
   * Returns the words to speak; the text is the line's from now on.
   */
  speakInstead(text: string): string {
    this.pending = '';
    this.done = false;
    this.first = false;
    const out: string[] = [];
    for (const word of text.split(/\s+/)) this.emit(word, out);
    if (out.length === 0) return '';
    this.spoken.push(...out);
    return `${out.join(' ')} `;
  }

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
    for (const piece of ready.split(' ')) {
      const raw = this.tagChecked ? piece : this.takeTag(piece);
      if (raw === '') continue;
      for (const word of this.guard ? this.guard.push(raw) : [raw]) this.emit(word, out);
    }
    if (all && this.guard) for (const word of this.guard.end()) this.emit(word, out);
    if (out.length === 0) return '';
    this.spoken.push(...out);
    return `${out.join(' ')} `;
  }

  /** The first word: a `[case]` tag is taken off it. */
  private takeTag(raw: string): string {
    if (raw === '') return raw;
    this.tagChecked = true;
    const m = /^\[([a-z_]{2,20})\](.*)$/i.exec(raw);
    if (!m) return raw;
    this.tag = (m[1] ?? '').toLowerCase();
    return m[2] ?? '';
  }

  /** One word the guard let through: markup off, the reaction dropped, the trims applied. */
  private emit(raw: string, out: string[]): void {
    const word = raw.replace(MARKUP, '');
    if (word === '' || this.done) return;
    if (this.first) {
      this.first = false;
      if (this.options.afterReaction === true && REACTION_WORD.test(word)) {
        this.capitalizeNext = true;
        return;
      }
    }
    if (this.trailing !== null) {
      this.trailing.push(word);
      const ended = SENTENCE_END.test(word);
      if (ended && /\?["'”’)]*$/.test(word)) out.push(...this.trailing);
      if (ended || this.words + this.trailing.length > this.options.maxWords + OVERRUN_WORDS) {
        this.trailing = null;
        this.done = true;
      }
      return;
    }
    let spoken = word;
    if (this.capitalizeNext || (this.spoken.length + out.length === 0 && this.guardAction)) {
      spoken = spoken.charAt(0).toUpperCase() + spoken.slice(1);
      this.capitalizeNext = false;
    }
    this.words++;
    this.sentenceWords++;
    if (SENTENCE_END.test(spoken)) {
      // "Hi!", "Oh, okay.": an exclamation doesn't use up one of the two sentences.
      if (this.sentenceWords > 2) this.sentences++;
      this.sentenceWords = 0;
    }
    const overLimit = this.words >= this.options.maxWords;
    if (this.sentences >= (this.options.maxSentences ?? 2)) {
      // A reply may still end on its question: a last sentence is held to see.
      if (/\?["'”’)]*$/.test(spoken) || this.words >= this.options.maxWords) this.done = true;
      else this.trailing = [];
    } else if (overLimit && CLAUSE_END.test(spoken)) {
      spoken = spoken.replace(/[,;:]$/, '.');
      this.done = true;
    } else if (this.words >= this.options.maxWords + OVERRUN_WORDS) {
      spoken = `${spoken.replace(/[,;:]$/, '')}.`;
      this.done = true;
    }
    out.push(spoken);
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
