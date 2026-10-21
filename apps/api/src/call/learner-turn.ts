import type { HeardWord, TurnMode } from '@yapling/contracts';

import { Endpointer, holdFor, joinSegments, ENDPOINTING } from './endpointing';
import type { SpokenLine } from './line';
import { SttSession } from './stt';

/*
 * The learner's side of turn-taking: mic audio into Scribe and the energy gate, segments joined
 * into one turn, the answer started speculatively and released after enough silence (or at once
 * on a hold-to-talk release), dropped when the learner speaks again before it reaches the phone.
 * "Chờ chút" pauses all of it until the learner speaks or the hold runs out. While the scene is
 * listening and nobody speaks, the silence is measured for the stage's hint pause.
 */

/** Scribe's final text normally follows a commit within about 300 ms. */
const FINAL_TIMEOUT_MS = 2_500;
const TICK_MS = 250;

export interface TurnHost {
  /** The scene waits for the learner and nothing is playing. */
  accepting(): boolean;
  partial(text: string): void;
  /** A turn to answer; returns its line, or null when it can't be answered now. */
  answer(text: string, speechEndAt: number, gated: boolean): SpokenLine | null;
  /** The learner was quiet for `ms` while the scene waited. */
  silence(ms: number): void;
  /** The thinking head tilt: the reply was released before any audio was ready. */
  released(line: SpokenLine): void;
  /** Learner talk, for metering. */
  talked(ms: number): void;
  sttFailed(detail: string): void;
}

export class LearnerTurn {
  readonly endpointer = new Endpointer();
  readonly stt: SttSession;
  private pending = '';
  private words: HeardWord[] = [];
  private reply: SpokenLine | null = null;
  private awaitingFinal = 0;
  private speechEndAt = 0;
  private holdUntil = 0;
  private quietSince = { audioMs: 0, wall: 0 };
  private windowOpen = false;
  private silenceMs = Number.POSITIVE_INFINITY;
  private tick: ReturnType<typeof setInterval> | null = null;
  private lastSpeechMs = 0;

  constructor(
    key: string,
    private readonly mode: TurnMode,
    private readonly host: TurnHost,
  ) {
    this.stt = new SttSession(key, {
      partial: (text) => this.host.partial(text),
      committed: (text) => this.onFinal(text),
      words: (words) => this.words.push(...words),
      failed: (detail) => this.host.sttFailed(detail),
    });
    this.tick = setInterval(() => this.check(), TICK_MS);
  }

  /** The words of the turn being answered (taken once it reaches the phone). */
  takeTurn(): { text: string; words: HeardWord[] } {
    const turn = { text: this.pending, words: this.words };
    this.pending = '';
    this.words = [];
    return turn;
  }

  get speechEnd(): number {
    return this.speechEndAt;
  }

  /** Waits for the learner, counting silence toward `silenceMs`. */
  openWindow(silenceMs: number): void {
    this.windowOpen = true;
    this.silenceMs = silenceMs;
    this.restartQuiet();
  }

  closeWindow(): void {
    this.windowOpen = false;
  }

  /** The silence count starts again (after a hint, a hold, or a reply). */
  restartQuiet(): void {
    this.quietSince = { audioMs: this.endpointer.audioMs, wall: Date.now() };
  }

  /** The reply line finished or was dropped. */
  replyDone(line: SpokenLine): void {
    if (this.reply === line) this.reply = null;
  }

  hold(seconds: number): void {
    this.holdUntil = seconds > 0 ? Date.now() + seconds * 1_000 : 0;
    if (seconds === 0) this.restartQuiet();
  }

  mic(chunk: Uint8Array): void {
    this.stt.audio(chunk);
    for (const event of this.endpointer.feed(chunk)) {
      if (event.type === 'speech_start') {
        this.holdUntil = 0;
        this.restartQuiet();
        // Speech resumed before the reply reached the phone: drop it, keep the learner's words.
        if (this.reply && !this.reply.committed && this.mode === 'hands_free') this.dropReply();
      } else if (this.mode === 'hands_free') {
        this.speechEndAt = Date.now() - (this.endpointer.audioMs - event.speechEndMs);
        this.commit();
      }
    }
    const talked = this.endpointer.speechMs - this.lastSpeechMs;
    if (talked > 0) {
      this.lastSpeechMs = this.endpointer.speechMs;
      this.host.talked(talked);
    }
    this.check();
  }

  /** Hold-to-talk: the learner let go of the mic. */
  endTurn(): void {
    if (this.mode !== 'hold_to_talk') return;
    this.speechEndAt = Date.now();
    this.endpointer.reset();
    this.commit();
  }

  /** A new phone socket: a fresh mic clock and nothing pending. */
  close(): void {
    if (this.tick !== null) clearInterval(this.tick);
    this.tick = null;
    this.dropReply();
    this.stt.close();
  }

  private commit(): void {
    this.awaitingFinal = Date.now();
    this.stt.commit();
  }

  private onFinal(text: string): void {
    this.awaitingFinal = 0;
    if (this.reply === null && !this.host.accepting()) return; // an aside while a line plays
    if (this.mode === 'hands_free' && this.endpointer.inSpeech) {
      // The learner started again before this segment's text came back: wait for the rest.
      if (this.reply && !this.reply.committed) this.dropReply();
      if (text) this.pending = joinSegments(this.pending, text);
      return;
    }
    if (this.reply) {
      if (this.reply.committed) return;
      this.dropReply();
    }
    if (text) this.pending = joinSegments(this.pending, text);
    if (!this.pending) return;
    this.reply = this.host.answer(this.pending, this.speechEndAt, this.mode === 'hands_free');
  }

  private dropReply(): void {
    const reply = this.reply;
    this.reply = null;
    reply?.abort();
  }

  private holding(): boolean {
    if (this.holdUntil === 0) return false;
    if (Date.now() < this.holdUntil) return true;
    this.holdUntil = 0;
    this.restartQuiet();
    return false;
  }

  private check(): void {
    if (this.awaitingFinal !== 0 && Date.now() - this.awaitingFinal > FINAL_TIMEOUT_MS) {
      this.onFinal('');
    }
    const reply = this.reply;
    if (reply?.isGated && !reply.isAborted) {
      const quiet = !this.endpointer.inSpeech && !this.holding();
      if (quiet && this.endpointer.silenceMs >= holdFor(this.pending, ENDPOINTING)) {
        reply.release();
        this.host.released(reply);
      }
      return;
    }
    if (!this.windowOpen || reply !== null || this.awaitingFinal !== 0) return;
    if (this.endpointer.inSpeech || this.holding() || this.pending !== '') return;
    if (!this.host.accepting()) return;
    const quietMs = Math.max(
      this.endpointer.audioMs -
        Math.max(this.quietSince.audioMs, this.endpointer.audioMs - this.endpointer.silenceMs),
      Date.now() - this.quietSince.wall,
    );
    if (quietMs >= this.silenceMs) {
      this.restartQuiet();
      this.host.silence(quietMs);
    }
  }
}
