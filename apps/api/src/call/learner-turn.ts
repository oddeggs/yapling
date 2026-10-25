import type { EndTurnFrame, HeardWord, HoldFrame, SpeechFrame, TurnMode } from '@yapling/contracts';

import { Endpointer, holdFor, joinSegments, ENDPOINTING, PATIENT_HOLD } from './endpointing';
import type { SpokenLine } from './line';
import { hasRealWords } from './real-words';
import { SttSession } from './stt';

/*
 * The learner's side of turn-taking: mic audio into Scribe and the energy gate, segments joined
 * into one turn, the answer started speculatively and released after enough silence (or at once
 * on a hold-to-talk release or a hands-free tap), dropped when the learner speaks again before it reaches the phone.
 * "Chờ chút" pauses all of it until the learner speaks or the hold runs out. While the scene is
 * listening and nobody speaks, the quiet is measured, from when the learner last stopped speaking,
 * for the long-quiet hint offer (silence never ends or counts as a turn); a pause inside a held
 * hold-to-talk turn is never quiet. A turn with no real words (noise, "um") is not a turn: it is
 * dropped unanswered, and the phone hears `notHeard`.
 *
 * When the phone sends its own speech start and end (`speech` frames, from its echo-cancelled
 * mic), they decide when speech starts and ends, and the answer waits the patient holds; the energy
 * gate (with the spike's shorter holds) stays as the fallback for a phone that doesn't send them.
 * Silence is still counted on the mic clock, from the phone's end. The phone streams only around
 * speech (with a pre-roll, and a tail long enough for the holds), so idle quiet costs nothing; the
 * long-quiet offer is timed on the wall clock when no audio comes.
 *
 * The learner can switch modes mid-call. A `speech` frame means the phone is listening hands-free;
 * `end_turn` in hands-free is "I'm done": a held answer goes at once, or the words so far are
 * committed and answered as soon as their text is back. A hold-to-talk release is the same thing,
 * so a phone that went back to holding the mic is still answered.
 */

/** The phone's speech flags, once it has sent any. */
interface PhoneVad {
  speaking: boolean;
  /** Where the last speech ended, on the mic clock. */
  endMs: number;
  /** The segment that ended there was committed. */
  committed: boolean;
}

/** Scribe's final text normally follows a commit within about 300 ms. */
const FINAL_TIMEOUT_MS = 2_500;
const TICK_MS = 250;
/** The transcriber needs 0.3 s of audio to commit; less than that holds no word. */
const MIN_TURN_BYTES = 300 * 32;
/** A held turn whose mic chunks stopped this long ago is no longer streaming (a lost release). */
const HELD_STALE_MS = 1_500;

export interface TurnHost {
  /** The scene waits for the learner and nothing is playing. */
  accepting(): boolean;
  partial(text: string): void;
  /** A turn to answer; returns its line, or null when it can't be answered now. */
  answer(text: string, speechEndAt: number, gated: boolean): SpokenLine | null;
  /** The learner was quiet for `ms` while the scene waited (the hint may be offered). */
  silence(ms: number): void;
  /** A turn with no real words: not a turn, nothing answered. */
  notHeard(): void;
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
  private phone: PhoneVad | null = null;
  /** Hold-to-talk: when the last mic chunk of a press arrived; 0 once the turn was released. */
  private heldAt = 0;
  /** Words before this point on the mic clock belong to a dropped turn. */
  private wordsFrom = 0;
  /** Mic audio arrived since the last commit. */
  private uncommitted = false;
  /** Mic bytes since the last commit (16 kHz PCM16: 32 a millisecond). */
  private turnBytes = 0;
  /** The learner said they're done: the text, when it's back, is answered at once. */
  private answerNow = false;

  constructor(
    key: string,
    private mode: TurnMode,
    private readonly host: TurnHost,
  ) {
    this.stt = new SttSession(key, {
      partial: (text) => this.host.partial(text),
      committed: (text) => this.onFinal(text),
      words: (words) => this.words.push(...words.filter((w) => w.startMs >= this.wordsFrom)),
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

  /** Waits for the learner, telling the host once the quiet reaches `silenceMs`. */
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

  /** The learner stopped speaking at `endMs` on the mic clock: the quiet counts from there. */
  private quietFrom(endMs: number): void {
    const ago = Math.max(0, this.endpointer.audioMs - endMs);
    this.quietSince = { audioMs: this.endpointer.audioMs - ago, wall: Date.now() - ago };
  }

  /**
   * The answer's line was replaced (by a line written for the judged case, or by a replay of the
   * last line): the new line is held and released, or dropped, in its place.
   */
  swapReply(from: SpokenLine, to: SpokenLine): void {
    if (this.reply === from) this.reply = to;
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
    // Hold-to-talk sends audio only while the button is held: a press is streaming.
    if (this.mode === 'hold_to_talk') this.heldAt = Date.now();
    this.uncommitted = true;
    this.turnBytes += chunk.byteLength;
    this.stt.audio(chunk);
    const events = this.endpointer.feed(chunk);
    // The phone's flags, when it sends them, decide; the energy gate is the fallback.
    for (const event of this.phone === null ? events : []) {
      if (event.type === 'speech_start') this.speechStarted();
      else {
        this.quietFrom(event.speechEndMs);
        if (this.mode === 'hands_free') this.segmentEnded(event.speechEndMs);
      }
    }
    const talked = this.endpointer.speechMs - this.lastSpeechMs;
    if (talked > 0) {
      this.lastSpeechMs = this.endpointer.speechMs;
      this.host.talked(talked);
    }
    this.check();
  }

  /** The phone's turn frames: the end of a turn, "Chờ chút", its speech flags. */
  frame(frame: EndTurnFrame | HoldFrame | SpeechFrame): void {
    if (frame.type === 'end_turn') this.endTurn();
    else if (frame.type === 'hold') this.hold(frame.seconds);
    else this.speech(frame.state, frame.atMs);
  }

  /** The turn mode in effect (the hello's, until the phone switches to hands-free). */
  get turnMode(): TurnMode {
    return this.mode;
  }

  /**
   * The phone's voice activity: speech started or ended at `atMs` on the mic clock. Only a phone
   * listening hands-free sends it, so it also switches the call to hands-free.
   */
  speech(state: 'start' | 'end', atMs: number): void {
    this.mode = 'hands_free';
    this.phone ??= { speaking: false, endMs: 0, committed: true };
    if (state === 'start') {
      if (!this.phone.speaking) this.speechStarted();
      this.phone.speaking = true;
      this.phone.committed = false;
    } else {
      if (this.phone.speaking) this.quietFrom(atMs);
      this.phone.speaking = false;
      this.phone.endMs = atMs;
    }
    this.check();
  }

  /** The learner let go of the mic (hold-to-talk), or tapped it to say they're done (hands-free). */
  endTurn(): void {
    if (this.mode === 'hands_free') {
      this.finishNow();
      return;
    }
    this.speechEndAt = Date.now();
    this.heldAt = 0;
    this.endpointer.reset();
    this.restartQuiet();
    // Too little audio to hold a word (a dead mic, a slip): not a turn, said at once rather than
    // after the transcriber refuses it and the wait for its text runs out.
    if (this.turnBytes < MIN_TURN_BYTES && this.pending === '' && this.awaitingFinal === 0) {
      this.turnBytes = 0;
      this.forgetTurn();
      this.host.notHeard();
      return;
    }
    this.commit();
  }

  /** Hands-free "I'm done": the answer without the rest of the hold. */
  private finishNow(): void {
    const reply = this.reply;
    if (reply) {
      if (reply.isGated && !reply.isAborted) {
        reply.release();
        this.host.released(reply);
      }
      return;
    }
    // Nothing said since the last turn: nothing to finish.
    if (!this.uncommitted && this.awaitingFinal === 0 && this.pending === '') return;
    this.answerNow = true;
    if (this.awaitingFinal !== 0) return; // the text is on its way
    const phone = this.phone;
    if (phone) {
      if (phone.speaking) phone.endMs = this.endpointer.audioMs;
      phone.speaking = false;
      phone.committed = true;
    }
    this.speechEndAt = Date.now();
    this.endpointer.reset();
    this.restartQuiet();
    this.commit();
  }

  /** A new phone socket: a fresh mic clock and nothing pending. */
  close(): void {
    if (this.tick !== null) clearInterval(this.tick);
    this.tick = null;
    this.dropReply();
    this.stt.close();
  }

  private speechStarted(): void {
    this.holdUntil = 0;
    this.restartQuiet();
    // Speech resumed before the reply reached the phone: drop it, keep the learner's words.
    if (this.reply && !this.reply.committed && this.mode === 'hands_free') this.dropReply();
  }

  /** A segment ended at `speechEndMs` on the mic clock: commit it and start the reply. */
  private segmentEnded(speechEndMs: number): void {
    this.speechEndAt = Date.now() - Math.max(0, this.endpointer.audioMs - speechEndMs);
    this.commit();
  }

  /** Whether the learner is speaking: by the phone's flags when it sends them, else the gate. */
  private inSpeech(): boolean {
    return this.phone === null ? this.endpointer.inSpeech : this.phone.speaking;
  }

  /** Silence since the learner's speech ended, in mic ms. */
  private silence(): number {
    if (this.phone === null) return this.endpointer.silenceMs;
    return this.phone.speaking ? 0 : Math.max(0, this.endpointer.audioMs - this.phone.endMs);
  }

  private commit(): void {
    this.awaitingFinal = Date.now();
    this.uncommitted = false;
    this.turnBytes = 0;
    this.stt.commit();
  }

  private onFinal(text: string): void {
    this.awaitingFinal = 0;
    if (this.reply === null && !this.host.accepting()) return; // an aside while a line plays
    if (this.mode === 'hands_free' && this.inSpeech()) {
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
    const now = this.answerNow;
    this.answerNow = false;
    if (!hasRealWords(this.pending)) {
      // Noise or "um" only: not a turn. The beat stays, nothing is answered, and the phone shows
      // it quietly (in hands-free a cough is not worth more).
      this.forgetTurn();
      this.host.notHeard();
      return;
    }
    this.reply = this.host.answer(
      this.pending,
      this.speechEndAt,
      this.mode === 'hands_free' && !now,
    );
  }

  /** Drops what was heard of a turn that wasn't one, its late word timings included. */
  private forgetTurn(): void {
    this.answerNow = false;
    this.pending = '';
    this.words = [];
    this.wordsFrom = this.endpointer.audioMs;
  }

  private dropReply(): void {
    const reply = this.reply;
    this.reply = null;
    reply?.abort();
  }

  /** Hold-to-talk: the button is down and its audio is still arriving. */
  private pressStreaming(): boolean {
    if (this.heldAt === 0) return false;
    if (Date.now() - this.heldAt < HELD_STALE_MS) return true;
    this.heldAt = 0;
    this.restartQuiet();
    return false;
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
    // The phone said speech ended: commit once the speculative silence has passed.
    const phone = this.phone;
    if (phone && !phone.speaking && !phone.committed && this.mode === 'hands_free') {
      if (this.endpointer.audioMs - phone.endMs >= ENDPOINTING.specMs) {
        phone.committed = true;
        this.segmentEnded(phone.endMs);
      }
    }
    const reply = this.reply;
    if (reply?.isGated && !reply.isAborted) {
      const quiet = !this.inSpeech() && !this.holding();
      const holds = this.phone === null ? ENDPOINTING : PATIENT_HOLD;
      if (quiet && this.silence() >= holdFor(this.pending, holds)) {
        reply.release();
        this.host.released(reply);
      }
      return;
    }
    if (!this.windowOpen || reply !== null || this.awaitingFinal !== 0) return;
    // A pause inside a held turn is the learner thinking, never silence to nudge.
    if (this.inSpeech() || this.holding() || this.pressStreaming() || this.pending !== '') return;
    if (!this.host.accepting()) return;
    const quietMs = Math.max(
      this.endpointer.audioMs -
        Math.max(this.quietSince.audioMs, this.endpointer.audioMs - this.silence()),
      Date.now() - this.quietSince.wall,
    );
    if (quietMs >= this.silenceMs) {
      this.restartQuiet();
      this.host.silence(quietMs);
    }
  }
}
