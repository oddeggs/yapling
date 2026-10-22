/*
 * Keeps narration out of a character's spoken line, as the model streams it. The model sometimes
 * writes about the scene instead of speaking in it ("The learner has been silent, so I need to
 * respond gently.", "Pip opens it.", `Pip says something short, like "Take your time."`).
 *
 * Words go to the voice as soon as they arrive, so the guard decides on a sentence's first words:
 * - A sentence that starts like speech passes at once, word by word (no added latency).
 * - A sentence that starts suspiciously (the speaker's own name, "The", "I", "Let", "Since"…) is
 *   held for a word or three until it is clearly speech (then released) or narration. Narration
 *   is held to the sentence's end and dropped; when it describes the speaker speaking, the words
 *   it quotes (or that follow a colon) are spoken.
 * - Asides in brackets and stage directions in asterisks are dropped wherever they appear, a
 *   speaker label ("Mei:") is dropped, and quotation marks are never spoken.
 */

export type GuardAction = 'dropped' | 'extracted';

const SENTENCE_END = /[.!?…]["'”’)\]*]*$/;
const DOUBLE_QUOTES = /["“”]/g;
const EDGE_PUNCTUATION = /^["“”'‘’([*]+|["“”'‘’)\].,!?;:…*]+$/g;

/** "The …" opens narration when one of these follows. */
const META_NOUNS = new Set([
  'learner',
  "learner's",
  'learners',
  'user',
  "user's",
  'student',
  "student's",
  'narrator',
  'assistant',
]);

/** A first word that only ever opens a note about the scene. */
const META_LEADS = new Set([
  'learner',
  'user',
  'student',
  'narrator',
  'narration',
  'note',
  'stage',
]);

/** Labels the model may put before a line; dropped, and the line goes on. */
const LABELS = new Set(['response', 'reply', 'output', 'line', 'answer', 'spoken', 'speech']);

/** "I need to …", "I'll …": modals before a verb about replying. */
const MODALS = new Set(['need', 'should', 'must', 'will', 'have', 'want', 'can', 'could', 'would']);
const SOFTENERS = new Set(['to', 'just', 'now', 'gently', 'kindly', 'first', 'simply', 'really']);
const META_VERBS = new Set([
  'respond',
  'reply',
  'react',
  'acknowledge',
  'encourage',
  'prompt',
  'steer',
  'redirect',
  'nudge',
  'rephrase',
  'output',
  'write',
  'stay',
]);

/** First words that open a clause where "the learner" may follow ("Since the learner…"). */
const CLAUSE_LEADS = new Set(['since', 'as', 'so', 'because', 'given']);

const bare = (word: string) => word.toLowerCase().replace(EDGE_PUNCTUATION, '');

type Verdict = 'speech' | 'narration' | 'wait';

type Mode =
  /** At a sentence's start. */
  | 'start'
  /** Speech: every word passes. */
  | 'pass'
  /** Holding a suspicious start until it reads as speech or narration. */
  | 'hold'
  /** Narration: held to the sentence's end, then dropped (its quotes spoken). */
  | 'narration';

/** Holding a sentence longer than this decides it as it stands. */
const MAX_HELD = 40;

export class NarrationGuard {
  private mode: Mode = 'start';
  private held: string[] = [];
  /** Inside a bracket or asterisk aside, until its closing mark. */
  private aside: ')' | ']' | '*' | null = null;
  private readonly own: string;
  private readonly droppedText: string[] = [];
  private extractedAny = false;

  constructor(speakerName: string) {
    this.own = speakerName.toLowerCase();
  }

  /** What the guard did to the line so far: null when it passed untouched. */
  get action(): GuardAction | null {
    if (this.extractedAny) return 'extracted';
    return this.droppedText.length > 0 ? 'dropped' : null;
  }

  /** The text kept from the voice, for the logs. */
  get dropped(): readonly string[] {
    return this.droppedText;
  }

  /** One raw word in; the words now safe to speak out (none while held). */
  push(raw: string): string[] {
    if (raw === '') return [];
    if (this.aside !== null) {
      this.drop(raw);
      if (closes(raw, this.aside)) this.aside = null;
      this.afterWord(raw);
      return [];
    }
    const opened = opens(raw);
    if (opened !== null) {
      if (opened === '*' && isSingleEmphasis(raw)) {
        // *really*: emphasis on a word, spoken without the marks.
        return this.word(raw.replace(/\*/g, ''));
      }
      this.drop(raw);
      if (!closes(raw.slice(1), opened)) this.aside = opened;
      this.afterWord(raw);
      return [];
    }
    return this.word(raw);
  }

  /** The stream ended: a held sentence is decided as it stands. */
  end(): string[] {
    this.aside = null;
    const out = this.held.length > 0 ? this.resolve(true) : [];
    this.mode = 'start';
    return out;
  }

  private word(raw: string): string[] {
    switch (this.mode) {
      case 'start': {
        if (this.isLabel(raw)) {
          this.drop(raw);
          return [];
        }
        if (this.suspicious(raw)) {
          this.mode = 'hold';
          this.held = [raw];
          return this.decide();
        }
        this.mode = SENTENCE_END.test(raw) ? 'start' : 'pass';
        return speakable([raw]);
      }
      case 'pass':
        if (SENTENCE_END.test(raw)) this.mode = 'start';
        return speakable([raw]);
      case 'hold':
        this.held.push(raw);
        return this.decide();
      case 'narration':
        this.held.push(raw);
        if (SENTENCE_END.test(raw) || this.held.length >= MAX_HELD) return this.resolve(true);
        return [];
    }
  }

  private decide(): string[] {
    const ended = SENTENCE_END.test(this.held.at(-1) ?? '') || this.held.length >= MAX_HELD;
    const verdict = this.judge(this.held, ended);
    if (verdict === 'speech') {
      const out = this.held;
      this.held = [];
      this.mode = ended ? 'start' : 'pass';
      return speakable(out);
    }
    if (verdict === 'narration') {
      this.mode = 'narration';
      return ended ? this.resolve(true) : [];
    }
    return ended ? this.resolve(true) : [];
  }

  /** Ends a held sentence: speech is released, narration dropped but for what it quotes. */
  private resolve(ended: boolean): string[] {
    const words = this.held;
    this.held = [];
    const narration = this.mode === 'narration' || this.judge(words, ended) === 'narration';
    this.mode = 'start';
    if (!narration) return speakable(words);
    const text = words.join(' ');
    this.droppedText.push(text);
    // Only the speaker's own words are spoken from narration ("Pip says, like "Take your time.""):
    // a quote in a note about the learner is the learner's ("The learner said "I'm not sure"").
    if (bare(words[0] ?? '') !== this.own) return [];
    const quoted = [...text.matchAll(/["“]([^"“”]+)["”]?/g)]
      .map((m) => (m[1] ?? '').trim())
      .filter((q) => q !== '');
    const afterColon = quoted.length === 0 ? /:\s*(.+)$/.exec(text)?.[1]?.trim() : undefined;
    const kept = quoted.length > 0 ? quoted.join(' ') : (afterColon ?? '');
    if (kept === '') return [];
    this.extractedAny = true;
    return speakable(kept.split(/\s+/));
  }

  private judge(words: readonly string[], ended: boolean): Verdict {
    const w = words.map(bare);
    const first = w[0] ?? '';
    const enough = (n: number): Verdict | null =>
      w.length < n ? (ended ? 'speech' : 'wait') : null;

    if (first === this.own) {
      // "Pip!" or "Pip, …": a name called out, not narration.
      if (/[!?,.…]["”]?$/.test(words[0] ?? '')) return 'speech';
      const short = enough(2);
      if (short) return short;
      const next = words[1] ?? '';
      const verb = w[1] ?? '';
      return /^[a-z]/.test(next) && /(?:s|ed)$/.test(verb) && verb !== 'and'
        ? 'narration'
        : 'speech';
    }
    if (META_LEADS.has(first)) return 'narration';
    if (first === 'the') {
      const short = enough(2);
      if (short) return short;
      return META_NOUNS.has(w[1] ?? '') ? 'narration' : 'speech';
    }
    if (CLAUSE_LEADS.has(first)) {
      for (let i = 1; i < Math.min(w.length, 5); i++) {
        if (w[i] === 'the' && META_NOUNS.has(w[i + 1] ?? '')) return 'narration';
        if (META_NOUNS.has(w[i] ?? '') && w[i - 1] === 'the') return 'narration';
      }
      return w.length >= 5 || ended ? 'speech' : 'wait';
    }
    if (first === 'i' || first === "i'll" || first === 'let') {
      let i = 1;
      if (first === 'i') {
        const short = enough(2);
        if (short) return short;
        if (!MODALS.has(w[1] ?? '')) return 'speech';
        i = 2;
      } else if (first === 'let') {
        const short = enough(2);
        if (short) return short;
        if (w[1] !== 'me') return 'speech';
        i = 2;
      }
      while (i < w.length && SOFTENERS.has(w[i] ?? '')) i++;
      if (i >= w.length) return ended ? 'speech' : 'wait';
      return META_VERBS.has(w[i] ?? '') ? 'narration' : 'speech';
    }
    return 'speech';
  }

  private suspicious(raw: string): boolean {
    const w = bare(raw);
    return (
      w === this.own ||
      META_LEADS.has(w) ||
      w === 'the' ||
      CLAUSE_LEADS.has(w) ||
      w === 'i' ||
      w === "i'll" ||
      w === 'let'
    );
  }

  /** "Mei:", "Response:": a label before the line. */
  private isLabel(raw: string): boolean {
    if (!/:$/.test(raw)) return false;
    const w = bare(raw);
    return w === this.own || LABELS.has(w);
  }

  private drop(raw: string): void {
    this.droppedText.push(raw);
  }

  private afterWord(raw: string): void {
    if (this.mode === 'pass' && SENTENCE_END.test(raw)) this.mode = 'start';
  }
}

function opens(raw: string): ')' | ']' | '*' | null {
  const c = raw.replace(DOUBLE_QUOTES, '').charAt(0);
  return c === '(' ? ')' : c === '[' ? ']' : c === '*' ? '*' : null;
}

function closes(raw: string, mark: ')' | ']' | '*'): boolean {
  return raw.replace(/[.,!?;:…"“”]+$/, '').endsWith(mark);
}

/** `*smiles*` is a direction; `*really*` is emphasis. */
function isSingleEmphasis(raw: string): boolean {
  const m = /^\*+([^*\s]+)\*+[.,!?;:…]*$/.exec(raw);
  if (!m) return false;
  const word = (m[1] ?? '').toLowerCase();
  return !/(?:s|ed|ing)$/.test(word);
}

/** Words as the voice gets them: no quotation marks. */
function speakable(words: readonly string[]): string[] {
  return words.map((w) => w.replace(DOUBLE_QUOTES, '')).filter((w) => w !== '');
}
