import type { CharacterId } from '@yapling/contracts';
import { isCardTurn, type Answer, type SceneEffect, type SceneEvent } from '@yapling/story';

import { judgeCard } from './card-judge';
import { addSample } from './costs';
import type { Director } from './director';
import type { CallData } from './finalize';
import type { FrameSender } from './frames';
import type { AgainAsk } from './judge';
import type { LearnerTurn } from './learner-turn';
import { SpokenLine, type LineHost } from './line';
import { speechKind } from './real-words';
import { passOf } from './placement';
import type { LearnerLine } from './transcript';
import type { TtsVoice } from './tts';
import { logTurn } from './turn-log';
import { againAsk, cardWords, matchesCard, withName } from './words';

/*
 * A card turn (say-this cards with words to match, the Visitor's turns) is decided without a
 * model: no reply is generated, and the scene's own lines follow at once (the praise recording,
 * the next line), so the learner hears an answer about as fast as a recorded reaction.
 *
 * In order:
 * 1. "Sorry? Again, please." or "Slowly, please." (the phrase list): the last line again, never a
 *    try. On a turn that teaches the phrase (`onReplay: 'pass'`), its words are the answer first.
 * 2. One of the beat's words (`matchesCard`, mis-hearings included): `fine`. The learner's name
 *    counts only in an English try.
 * 3. Vietnamese (marks on a word): `not_english`, never a try.
 * 4. Another English try: Jev's card question (`card-judge.ts`); a card at p ≥ 0.75 is `fine`,
 *    else `unclear` (the runner says "Again?" and the line once more; the second miss passes).
 *    On Pip's minute's fix turn Jev is shown Pip's mistake as the other card, and only the right
 *    words pass: reading Pip's version back never does.
 *
 * A card that is itself "Sorry? Again, please." or "Slowly, please." (a lifesaver to read back, as
 * on Pip's minute's fix turn) is answered by its words first, like a turn that teaches it; a turn
 * that replays to pass (`replay_and_pass`) still replays.
 *
 * The decision is held like a reply (a `hold` line): in hands-free it waits for the end of the
 * learner's pause, and a learner who goes on is answered again with the joined words.
 */

export interface CardHost {
  readonly data: CallData;
  readonly director: Director;
  readonly judgeKey: string | undefined;
  frames(): FrameSender;
  learner(): LearnerTurn | null;
  accepting(): boolean;
  lineHost(): LineHost;
  voice(character: CharacterId): TtsVoice;
  run(effects: readonly SceneEffect[]): void;
  /** "Again" or "slowly": the last line said again (by the runner, or by the call itself). */
  askedAgain(ask: AgainAsk): void;
  pump(): void;
}

type CardEvent = Extract<SceneEvent['type'], 'fine' | 'unclear' | 'not_english'>;

interface Decision {
  readonly event: CardEvent | null;
  readonly again: AgainAsk | null;
  readonly by: 'words' | 'jev';
  /** Jev's card question: asked and answered, asked and failed, or not asked (null). */
  readonly jev: 'answered' | 'failed' | null;
  /** Jev's card question passed it (null: not asked, or no answer). */
  readonly cardMatch: boolean | null;
  readonly judgeMs: number | null;
}

interface CardTurn {
  readonly beatId: string;
  readonly answer: Answer;
  readonly said: string;
  readonly speechEndAt: number;
  readonly abort: AbortController;
  readonly decision: Promise<Decision>;
  /** Holds the decision until the learner's pause is over; aborted when they go on. */
  readonly hold: SpokenLine;
}

/** Pip's slightly-wrong line before a Pip's-minute fix turn; null for any other turn. */
const mistakeOf = (data: CallData, beatId: string): string | null =>
  data.meta.pipsMinute?.turns.find((t) => t.beatId === beatId)?.mistake ?? null;

export class CardTurns {
  private turn: CardTurn | null = null;
  /** The phone's lag for the first line after a card turn is the turn's. */
  private lagDue = false;

  constructor(private readonly host: CardHost) {}

  /**
   * A card turn is being decided: nothing else plays or answers meanwhile. A turn whose hold was
   * dropped (the learner went on) isn't: the joined words are answered at once.
   */
  get busy(): boolean {
    return this.turn !== null && !this.turn.hold.isAborted;
  }

  /** The phone's lag for a line: end of the learner's speech → the first line after the turn heard. */
  lag(lagMs: number): void {
    if (!this.lagDue) return;
    this.lagDue = false;
    const { data } = this.host;
    if (!data.awaitingLag) return;
    addSample(data.samples, 'phoneLag', lagMs);
    data.awaitingLag = false;
  }

  /** Whether the beat now waiting is a card turn. */
  handles(): boolean {
    const now = this.host.director.listening();
    return now !== null && isCardTurn(now.answer);
  }

  /** The phone went away: the turn being decided is dropped (it is answered again on resume). */
  drop(): void {
    this.turn?.abort.abort();
    this.turn = null;
  }

  /** Starts deciding a turn; returns the line holding it, or null when it can't be taken now. */
  answer(text: string, speechEndAt: number, gated: boolean): SpokenLine | null {
    const { host } = this;
    if (!host.accepting()) return null;
    const now = host.director.listening();
    if (now === null || !isCardTurn(now.answer)) return null;
    this.turn?.abort.abort();
    const abort = new AbortController();
    const hold = new SpokenLine(host.lineHost(), {
      speaker: now.answer.listener,
      voice: host.voice(now.answer.listener),
      source: { kind: 'hold' },
      gated,
      maxWords: 1,
      afterReaction: false,
    });
    const turn: CardTurn = {
      beatId: now.beatId,
      answer: now.answer,
      said: text,
      speechEndAt,
      abort,
      decision: this.decide(text, now.beatId, now.answer, abort.signal),
      hold,
    };
    this.turn = turn;
    host.learner()?.closeWindow();
    void hold.done.then(async (result) => {
      host.learner()?.replyDone(hold);
      if (this.turn !== turn) return;
      if (result.aborted) {
        // The learner went on: the joined words are a new turn.
        abort.abort();
        this.turn = null;
        return;
      }
      const decision = await turn.decision;
      if (this.turn !== turn) return;
      this.turn = null;
      this.commit(turn, decision);
    });
    hold.start();
    return hold;
  }

  private async decide(
    text: string,
    beatId: string,
    answer: Answer,
    signal: AbortSignal,
  ): Promise<Decision> {
    const { data } = this.host;
    const words = () => ({ by: 'words' as const, jev: null, cardMatch: null, judgeMs: null });
    const ask = againAsk(text);
    // A card that is the lifesaver itself, on a turn that doesn't replay to pass, is the answer.
    const lifesaver =
      answer.onReplay === 'replay' && answer.choices.some((c) => againAsk(c.en) !== null);
    const teaches = answer.onReplay === 'pass' || lifesaver;
    if (ask !== null && !teaches) return { event: null, again: ask, ...words() };
    // A name is no English: "Mình là Lan." is Vietnamese, though it holds the card's name.
    const kind = speechKind(text);
    const name = kind === 'english' ? data.learner.name : '';
    if (matchesCard(text, cardWords(answer.accept, name))) {
      return { event: 'fine', again: null, ...words() };
    }
    if (ask !== null) return { event: null, again: ask, ...words() };
    if (kind !== 'english') return { event: 'not_english', again: null, ...words() };
    const cards = answer.choices.map((c) => withName(c.en, data.learner.name));
    const mistake = mistakeOf(data, beatId);
    const judged = await judgeCard(
      { cards: mistake === null ? cards : [...cards.slice(0, 1), mistake], said: text },
      { apiKey: this.host.judgeKey, signal },
    );
    if (judged === null) return { event: 'unclear', again: null, ...words(), jev: 'failed' };
    data.jevInputTokens = (data.jevInputTokens ?? 0) + judged.inputTokens;
    addSample(data.samples, 'judge', judged.ms);
    const passed = mistake === null ? judged.card !== null : judged.card === 0;
    return {
      event: passed ? 'fine' : 'unclear',
      again: null,
      by: 'jev',
      jev: 'answered',
      cardMatch: passed,
      judgeMs: judged.ms,
    };
  }

  /** The turn is final: `heard`, its line in the transcript, and the runner moved on. */
  private commit(turn: CardTurn, decision: Decision): void {
    const { host } = this;
    const { data, director } = host;
    const heard = host.learner()?.takeTurn() ?? { text: turn.said, words: [] };
    if (director.listening()?.beatId !== turn.beatId) {
      host.pump();
      return;
    }
    data.turns += 1;
    host.frames().send({
      type: 'heard',
      turn: data.turns,
      text: heard.text.slice(0, 2_000),
      words: heard.words.slice(0, 1_000),
    });
    const fine = decision.event === 'fine';
    const line: LearnerLine = {
      speaker: 'learner',
      text: heard.text,
      at: Date.now(),
      turn: data.turns,
      words: heard.words,
      beatId: turn.beatId,
      outcome: fine ? 'fine' : 'unclear',
      phrasesUsed: fine ? turn.answer.phrases : [],
      canDo: fine ? turn.answer.canDo : null,
      targetId: null,
      correctionFixed: null,
    };
    data.transcript.push(line);
    const before = director.state.lastTurn;
    const decidedAt = Date.now();
    if (turn.speechEndAt > 0) addSample(data.samples, 'cardOut', decidedAt - turn.speechEndAt);
    data.awaitingLag = true;
    this.lagDue = true;
    if (decision.again !== null) host.askedAgain(decision.again);
    else if (decision.event !== null) host.run(director.dispatch({ type: decision.event }));
    logTurn({
      callId: data.meta.callId,
      turn: data.turns,
      beatId: turn.beatId,
      outcome: fine ? 'fine' : 'unclear',
      applied: decision.again === null ? decision.event : `${decision.again}_request`,
      speech: speechKind(turn.said),
      judge: {
        by: decision.by,
        status: decision.jev ?? 'pending',
        ms: decision.judgeMs,
        outcome: null,
        lineCase: null,
        agree: null,
        switched: false,
        replay: decision.again,
      },
      result: null,
      timings: { start: decidedAt },
      speechEndAt: turn.speechEndAt,
      pass: passOf(before, director.state.lastTurn, turn.beatId),
      cardMatch: decision.cardMatch,
      decidedAt,
    });
  }
}
