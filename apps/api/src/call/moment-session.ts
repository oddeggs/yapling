import type {
  CallClientFrame,
  CallEndReason,
  CharacterId,
  Stage as ContractStage,
  TurnMode,
} from '@yapling/contracts';
import type { PlaceId, Weather } from '@yapling/scene';
import { CAST, SAFE_REPLY } from '@yapling/story';

import {
  actorSystem,
  pickLane,
  turnDirection,
  type Lane,
  type MomentLearner,
} from '../director/actor';
import type { MomentPlan } from '../director/moment';
import type { Bindings } from '../env';
import { userObject, type ChargeResult } from '../user';
import type { Control } from './control';
import { addSample, noSamples, type Samples } from './costs';
import { FrameSender } from './frames';
import { isCrisis, judgeTurn } from './judge';
import { LearnerTurn } from './learner-turn';
import { SpokenLine, type LineHost, type LineResult, type LineSource } from './line';
import { anthropicClient, HEDGE, messagesFor, noUsage, turnParams, type Usage } from './llm';
import { Meter, type MeterState } from './meter';
import { crisisResourcesKey, discloseAi, keepHouse, type SafetyClock } from './safety';
import {
  isLearnerLine,
  lastCharacterLine,
  type CharacterLine,
  type TranscriptLine,
} from './transcript';
import type { TtsVoice } from './tts';
import { slowerVoice, stageVoice, VoicePool } from './voice-pool';
import { againAsk } from './words';

/*
 * One planned moment, live: the resident says the director's opening, then answers each learner
 * turn from the beat it is on, moving on when the beat's goal is met (the line's control says so;
 * code moves on anyway after three replies on one beat). After the second reply, code picks a
 * lane from how the learner actually talks. "Again" or "slowly" says the last line again. The
 * minutes, the guardrails and the turn-taking are the scene calls' own.
 */

const PLAYED_GRACE_MS = 3_000;
const HOUSEKEEPING_MS = 15_000;
/** Replies on one beat before code moves the actor on. */
const BEAT_TURNS_MAX = 3;
/** Learner replies before the actor is told to land the ending, whatever beat it is on. */
const LAND_AFTER_TURNS = 12;
const REPLAY_MAX_WORDS = 60;

export interface MomentMeta {
  readonly callId: string;
  readonly userId: string;
  readonly momentId: string;
  readonly startedAt: number;
  readonly resumeSecret: string;
  readonly country: string;
  readonly turnMode: TurnMode;
  readonly place: PlaceId;
  readonly variant: number;
  readonly speaker: CharacterId;
  /** The learner's local hour, date and the town's weather at the start. */
  readonly hour: number;
  readonly localDate: string;
  readonly weather: Weather;
  readonly timezone: string;
}

export interface MomentData extends SafetyClock {
  readonly version: 1;
  readonly kind: 'moment';
  readonly meta: MomentMeta;
  readonly plan: MomentPlan;
  learner: MomentLearner;
  beat: number;
  beatTurns: number;
  lane: Lane;
  laneSwitched: boolean;
  replies: string[];
  opened: boolean;
  transcript: TranscriptLine[];
  turns: number;
  streamSeq: number;
  meter: MeterState;
  usage: Usage;
  jevInputTokens: number;
  sttSeconds: number;
  ttsChars: number;
  samples: Samples;
  secondsLeft: number;
  wrapping: boolean;
  wrapStarted: boolean;
  /** The moment closed in story (its last line said "end"), not just stopped. */
  closed: boolean;
  crisis: boolean;
  detachedAt: number | null;
  endReason: CallEndReason | null;
}

export function newMomentData(
  meta: MomentMeta,
  plan: MomentPlan,
  learner: MomentLearner,
  facts: {
    secondsLeft: number;
    wrapping: boolean;
    priorCallSeconds: number;
    continuousSince: number;
  },
): MomentData {
  return {
    version: 1,
    kind: 'moment',
    meta,
    plan,
    learner,
    beat: 0,
    beatTurns: 0,
    lane: 'planned',
    laneSwitched: false,
    replies: [],
    opened: false,
    transcript: [],
    turns: 0,
    streamSeq: 0,
    meter: { learnerMs: 0, characterMs: 0, billedLearner: 0, billedCharacter: 0 },
    usage: noUsage(),
    jevInputTokens: 0,
    sttSeconds: 0,
    ttsChars: 0,
    samples: noSamples(),
    secondsLeft: facts.secondsLeft,
    wrapping: facts.wrapping,
    wrapStarted: false,
    closed: false,
    crisis: false,
    priorCallSeconds: facts.priorCallSeconds,
    continuousSince: facts.continuousSince,
    disclosedAtMs: 0,
    breakSent: false,
    detachedAt: null,
    endReason: null,
  };
}

/** A line playing out: done when its audio is all sent and the phone says it played. */
interface Active {
  readonly streamId: number;
  durationMs: number;
  ready: boolean;
  played: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  endAfter: CallEndReason | null;
}

/** The answer to one learner turn, until its line is done. */
interface Reply {
  line: SpokenLine;
  readonly said: string;
  readonly speechEndAt: number;
  committed: boolean;
  replay: 'repeat' | 'slower' | null;
  learnerIndex: number;
  readonly judge: AbortController;
  /** It was written to close the moment because time is nearly up. */
  readonly wrapUp: boolean;
}

export type MomentFinisher = (data: MomentData) => Promise<boolean>;

export class MomentSession {
  private frames = new FrameSender(null);
  private learnerTurn: LearnerTurn | null = null;
  private readonly meter: Meter;
  private readonly llm;
  private readonly voices: VoicePool;
  private active: Active | null = null;
  private reply: Reply | null = null;
  private opening: SpokenLine | null = null;
  private thinkingOn = false;
  private housekeeping: ReturnType<typeof setInterval> | null = null;
  private ended = false;

  constructor(
    private readonly env: Bindings,
    readonly data: MomentData,
    private readonly persist: () => void,
    private readonly finish: MomentFinisher,
    private readonly onEnded: () => void,
  ) {
    this.meter = new Meter((seconds, kind) =>
      userObject(env, data.meta.userId).charge(seconds, kind, 'moment'),
    );
    this.meter.restore(data.meter);
    this.llm = anthropicClient(env.ANTHROPIC_API_KEY ?? '');
    this.voices = new VoicePool(env.ELEVENLABS_API_KEY ?? '');
  }

  private get speaker(): CharacterId {
    return this.data.meta.speaker;
  }

  // ---- lifecycle ----

  async attach(socket: WebSocket, how: { readonly newCall: boolean }, resumeToken: string) {
    this.detachPhone();
    this.frames = new FrameSender(socket);
    this.data.detachedAt = null;
    const turn = new LearnerTurn(this.env.ELEVENLABS_API_KEY ?? '', this.data.meta.turnMode, {
      accepting: () => this.accepting(),
      partial: (text) => this.frames.send({ type: 'partial', text: text.slice(0, 2_000) }),
      answer: (text, speechEndAt, gated) => this.answer(text, speechEndAt, gated),
      // Silence never ends a turn and asks for nothing: the learner thinks as long as they like.
      silence: () => undefined,
      notHeard: () => this.frames.send({ type: 'not_heard' }),
      released: (line) => {
        if (this.reply?.line === line && !line.committed) this.thinking(true);
      },
      talked: (ms) => {
        this.meter.addLearner(ms);
        void this.meter.flush().then((r) => this.charged(r));
      },
      sttFailed: (detail) => {
        console.error('stt failed', { detail });
        this.frames.send({ type: 'error', code: 'stt_failed', fatal: false });
      },
    });
    this.learnerTurn = turn;
    const sttOpen = turn.stt.open().catch((error: unknown) => {
      console.error('stt connect failed', { error: String(error) });
      this.frames.send({ type: 'error', code: 'stt_failed', fatal: false });
    });
    if (how.newCall) this.voices.warm(this.voice());
    await sttOpen;
    this.frames.send({
      type: 'ready',
      sessionId: this.data.meta.callId,
      secondsLeft: this.data.secondsLeft,
      recordedLineBaseUrl: null,
      resumeToken,
      resumed: !how.newCall,
    });
    if (how.newCall) discloseAi(this.data, this.frames);
    this.housekeeping ??= setInterval(() => this.keepHouse(), HOUSEKEEPING_MS);
    if (!this.data.opened) this.open();
    else this.listen();
    this.persistState();
  }

  detach(): void {
    this.detachPhone();
    this.frames = new FrameSender(null);
    this.data.detachedAt = Date.now();
    void this.meter.flush(true);
    this.persistState();
  }

  replace(): void {
    this.frames.send({
      type: 'ended',
      reason: 'replaced',
      summaryPending: false,
      callRecordId: this.data.meta.callId,
    });
  }

  private detachPhone(): void {
    if (this.reply) {
      this.reply.judge.abort();
      this.reply.line.abort();
      this.reply = null;
    }
    this.opening?.abort();
    this.opening = null;
    if (this.active?.timer) clearTimeout(this.active.timer);
    this.active = null;
    this.learnerTurn?.close();
    this.learnerTurn = null;
    this.thinkingOn = false;
  }

  async end(reason: CallEndReason): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.data.endReason = reason;
    if (this.housekeeping) clearInterval(this.housekeeping);
    await this.meter.flush(true);
    this.syncData();
    const frames = this.frames;
    this.detachPhone();
    this.frames = frames;
    this.voices.close();
    let summaryPending = false;
    try {
      summaryPending = await this.finish(this.data);
    } catch (error) {
      console.error('moment record failed', { error: String(error) });
    }
    this.frames.send({
      type: 'ended',
      reason,
      summaryPending,
      callRecordId: this.data.meta.callId,
    });
    this.onEnded();
  }

  // ---- phone frames ----

  mic(chunk: Uint8Array): void {
    if (!this.ended) this.learnerTurn?.mic(chunk);
  }

  frame(frame: CallClientFrame): void {
    if (this.ended) return;
    switch (frame.type) {
      case 'end_turn':
      case 'hold':
      case 'speech':
        this.learnerTurn?.frame(frame);
        return;
      case 'played':
        this.played(frame.streamId, frame.lagMs);
        return;
      case 'hangup':
        void this.end(frame.reason ?? 'hangup');
        return;
      case 'replay':
        // The control's "say it again": the last line, as asked, while the moment waits.
        if (this.accepting()) this.sayAgain(frame.slower ? 'slower' : 'repeat');
        return;
      default:
        return;
    }
  }

  // ---- lines ----

  private voice(): TtsVoice {
    const { lane } = this.data;
    const stage: ContractStage =
      lane === 'simple'
        ? 'visitor'
        : lane === 'rich' &&
            (this.data.learner.stage === 'visitor' || this.data.learner.stage === 'newcomer')
          ? 'neighbour'
          : this.data.learner.stage;
    return stageVoice(this.speaker, stage, null);
  }

  private lineHost(): LineHost {
    return {
      frames: this.frames,
      llm: this.llm,
      nextStreamId: () => ++this.data.streamSeq,
      takeTts: (voice) => this.voices.take(voice),
    };
  }

  /** The director's opening, said as written: no model, so the moment starts at once. */
  private open(): void {
    const { plan } = this.data;
    const line = new SpokenLine(this.lineHost(), {
      speaker: this.speaker,
      voice: this.voice(),
      source: { kind: 'text', text: plan.opening_line },
      gated: false,
      maxWords: 40,
      maxSentences: 8,
      afterReaction: false,
    });
    this.opening = line;
    const active = this.newActive(line.streamId);
    void line.done.then((result) => {
      if (this.opening !== line) return;
      this.opening = null;
      this.addUsage(line);
      if (result.failed !== null || result.aborted) {
        this.frames.send({ type: 'error', code: 'tts_failed', fatal: false });
      }
      this.data.opened = true;
      if (result.text) this.pushCharacterLine(result.text);
      active.durationMs = result.audioMs;
      this.ready(active, result.text === '');
    });
    line.start();
    if (plan.opening_gloss) {
      this.frames.send({
        type: 'gloss',
        streamId: line.streamId,
        text: plan.opening_gloss.slice(0, 2_000),
      });
    }
  }

  /** Waits for the learner: the window is open for as long as they like. */
  private listen(): void {
    if (this.data.wrapping && !this.data.wrapStarted && this.data.opened && !this.ended) {
      this.wrapUpNow();
      return;
    }
    this.learnerTurn?.openWindow(Number.POSITIVE_INFINITY);
  }

  private accepting(): boolean {
    return (
      !this.ended &&
      !this.data.crisis &&
      this.data.opened &&
      this.active === null &&
      this.reply === null &&
      this.opening === null &&
      !this.data.wrapStarted
    );
  }

  private modelSource(direction: string, pending: TranscriptLine | null): LineSource {
    const system = actorSystem(this.data.plan, this.data.learner, this.data.meta.hour);
    const transcript = pending ? [...this.data.transcript, pending] : this.data.transcript;
    return {
      kind: 'model',
      params: turnParams(system, messagesFor(this.speaker, transcript, direction)),
      hedge: HEDGE,
    };
  }

  /** Starts the answer to a learner turn; null when the moment can't take one now. */
  private answer(text: string, speechEndAt: number, gated: boolean): SpokenLine | null {
    if (!this.accepting()) return null;
    const ask = againAsk(text);
    const last = lastCharacterLine(this.data.transcript);
    const state = this.nextState(text);
    const reply: Reply = {
      line: null as unknown as SpokenLine,
      said: text,
      speechEndAt,
      committed: false,
      replay: ask !== null && last !== null ? ask : null,
      learnerIndex: -1,
      judge: new AbortController(),
      wrapUp: state.wrapUp,
    };
    const onFirstAudio = () => this.committed(reply);
    if (reply.replay !== null && last !== null) {
      reply.line = this.textLine(last.text, reply.replay === 'slower', gated, onFirstAudio);
    } else {
      const { direction, maxWords } = turnDirection(this.data.plan, this.data.learner, state);
      const source = this.modelSource(direction, this.learnerLine(text));
      reply.line = this.modelLine(source, maxWords, gated, onFirstAudio);
    }
    this.reply = reply;
    this.learnerTurn?.closeWindow();
    this.watch(reply, reply.line);
    reply.line.start();
    if (reply.replay === null) this.judge(reply, last);
    if (!gated) {
      setTimeout(() => {
        if (this.reply === reply && !reply.committed && !reply.line.isAborted) this.thinking(true);
      }, 600);
    }
    return reply.line;
  }

  private textLine(
    text: string,
    slower: boolean,
    gated: boolean,
    onFirstAudio?: () => void,
  ): SpokenLine {
    const voice = this.voice();
    return new SpokenLine(this.lineHost(), {
      speaker: this.speaker,
      voice: slower ? slowerVoice(voice) : voice,
      source: { kind: 'text', text },
      gated,
      maxWords: REPLAY_MAX_WORDS,
      maxSentences: 8,
      afterReaction: false,
      ...(onFirstAudio ? { onFirstAudio } : {}),
    });
  }

  private modelLine(
    source: LineSource,
    maxWords: number,
    gated: boolean,
    onFirstAudio?: () => void,
  ): SpokenLine {
    return new SpokenLine(this.lineHost(), {
      speaker: this.speaker,
      voice: this.voice(),
      source,
      gated,
      // The limit is the prompt's; the splitter allows a little over before it cuts.
      maxWords: maxWords + 6,
      // A reaction, the move on, and the question it ends on.
      maxSentences: 3,
      afterReaction: false,
      safeLine: SAFE_REPLY,
      ...(onFirstAudio ? { onFirstAudio } : {}),
    });
  }

  /** Jev, beside the line: a crisis stops the moment; "again" before the line is heard says it again. */
  private judge(reply: Reply, last: CharacterLine | null): void {
    const turn = {
      lastLine: last ? `${CAST[last.speaker].name}: ${last.text}` : null,
      hoped:
        this.data.plan.beats[Math.min(this.data.beat, this.data.plan.beats.length - 1)]?.goal ??
        'answer',
      said: reply.said,
      targets: [],
    };
    const started = Date.now();
    void judgeTurn(turn, { apiKey: this.env.TYPESAFE_API_KEY, signal: reply.judge.signal }).then(
      (j) => {
        if (j === null) return;
        this.data.jevInputTokens += j.inputTokens;
        addSample(this.data.samples, 'judge', Date.now() - started);
        if (isCrisis(j, false)) {
          this.crisis();
          return;
        }
        if (this.reply !== reply || reply.committed || j.again === null || last === null) return;
        // They asked to hear it again: the last line instead of a reply, not a try.
        const next = this.textLine(last.text, j.again === 'slower', reply.line.isGated, () =>
          this.committed(reply),
        );
        const previous = reply.line;
        const released = !previous.isGated;
        reply.line = next;
        reply.replay = j.again;
        this.learnerTurn?.swapReply(previous, next);
        previous.abort();
        this.watch(reply, next);
        next.start();
        if (released) next.release();
      },
    );
  }

  private watch(reply: Reply, line: SpokenLine): void {
    void line.done.then((result) => this.done(reply, line, result));
  }

  /** The answer reached the phone: the learner's turn is final. */
  private committed(reply: Reply): void {
    if (reply.committed || this.reply !== reply) return;
    reply.committed = true;
    if (reply.wrapUp) this.data.wrapStarted = true;
    this.thinking(false);
    const turn = this.learnerTurn?.takeTurn() ?? { text: reply.said, words: [] };
    this.data.turns += 1;
    this.frames.send({
      type: 'heard',
      turn: this.data.turns,
      text: turn.text.slice(0, 2_000),
      words: turn.words.slice(0, 1_000),
    });
    reply.learnerIndex = this.data.transcript.length;
    this.data.transcript.push({ ...this.learnerLine(turn.text || reply.said), words: turn.words });
    if (reply.speechEndAt > 0) this.data.samples.replyOut.push(Date.now() - reply.speechEndAt);
    const t = reply.line.timings;
    if (t.llmFirstToken) this.data.samples.llmFirstToken.push(t.llmFirstToken - t.start);
    if (reply.replay === null) this.advanceLane(turn.text || reply.said);
    this.newActive(reply.line.streamId);
  }

  private done(reply: Reply, line: SpokenLine, result: LineResult): void {
    this.learnerTurn?.replyDone(line);
    this.addUsage(line);
    if (this.reply !== reply || reply.line !== line) return;
    if (result.aborted) {
      // The learner went on talking: the joined turn is answered again.
      this.reply = null;
      reply.judge.abort();
      this.thinking(false);
      return;
    }
    if (!reply.committed) {
      if (result.failed !== null) {
        this.frames.send({
          type: 'error',
          code: result.failed === 'llm' ? 'llm_failed' : 'tts_failed',
          fatal: false,
        });
        this.reply = null;
        reply.judge.abort();
        this.thinking(false);
        this.listen();
        return;
      }
      this.committed(reply);
    }
    this.reply = null;
    if (result.text) this.pushCharacterLine(result.text);
    const active = this.active;
    if (reply.replay === null) this.apply(result.control, active);
    if (this.data.crisis) {
      void this.end('safety');
      return;
    }
    if (active?.streamId === line.streamId) {
      active.durationMs = result.audioMs;
      this.ready(active, result.text === '');
    } else {
      this.listen();
    }
  }

  /** The line's control: the gloss under it, and whether its beat moved on or the moment closed. */
  private apply(control: Control, active: Active | null): void {
    const d = this.data;
    if (control.gloss && active) {
      this.frames.send({
        type: 'gloss',
        streamId: active.streamId,
        text: control.gloss.slice(0, 2_000),
      });
    }
    if (control.crisis) {
      this.crisis();
      return;
    }
    const forced = d.beatTurns >= BEAT_TURNS_MAX;
    if (control.beat === 'end' || d.wrapStarted) {
      d.closed = true;
      if (active) active.endAfter = d.wrapStarted ? 'minutes_exhausted' : 'scene_complete';
    } else if (control.beat === 'next' || forced) {
      d.beat += 1;
      d.beatTurns = 0;
    }
  }

  /** The state the next reply is written for, counting the turn being answered. */
  private nextState(text: string) {
    const d = this.data;
    const replies = [...d.replies, text];
    let lane = d.lane;
    let switched = false;
    if (replies.length === 2 && !d.laneSwitched) {
      lane = pickLane(replies, d.learner.stage);
      switched = lane !== 'planned';
    }
    return {
      beat: d.beat,
      beatTurns: d.beatTurns,
      lane,
      laneSwitched: switched,
      landNow: replies.length >= LAND_AFTER_TURNS,
      wrapUp: d.wrapping,
    };
  }

  /** A reply was heard: count it on its beat, and pick the lane after the second. */
  private advanceLane(text: string): void {
    const d = this.data;
    d.replies.push(text);
    d.beatTurns += 1;
    if (d.replies.length === 2 && !d.laneSwitched) {
      d.lane = pickLane(d.replies, d.learner.stage);
      d.laneSwitched = true;
    }
  }

  /** "Say it again" from the control: the last line, as asked, while the moment waits. */
  private sayAgain(ask: 'repeat' | 'slower'): void {
    const last = lastCharacterLine(this.data.transcript);
    if (last === null) return;
    this.learnerTurn?.closeWindow();
    const line = this.textLine(last.text, ask === 'slower', false);
    const active = this.newActive(line.streamId);
    void line.done.then((result) => {
      this.addUsage(line);
      active.durationMs = result.audioMs;
      this.ready(active, result.text === '');
    });
    line.start();
  }

  /** Minutes nearly gone while the learner was thinking: the resident closes the moment now. */
  private wrapUpNow(): void {
    const d = this.data;
    d.wrapStarted = true;
    const { direction, maxWords } = turnDirection(d.plan, d.learner, {
      beat: d.beat,
      beatTurns: d.beatTurns,
      lane: d.lane,
      laneSwitched: false,
      landNow: true,
      wrapUp: true,
    });
    const line = this.modelLine(this.modelSource(direction, null), maxWords, false);
    const active = this.newActive(line.streamId);
    active.endAfter = 'minutes_exhausted';
    void line.done.then((result) => {
      this.addUsage(line);
      if (result.text) this.pushCharacterLine(result.text);
      d.closed = true;
      if (result.control.gloss) {
        this.frames.send({
          type: 'gloss',
          streamId: line.streamId,
          text: result.control.gloss.slice(0, 2_000),
        });
      }
      active.durationMs = result.audioMs;
      this.ready(active, result.text === '');
    });
    line.start();
  }

  // ---- playing out ----

  private newActive(streamId: number): Active {
    const active: Active = {
      streamId,
      durationMs: 0,
      ready: false,
      played: false,
      timer: null,
      endAfter: null,
    };
    this.active = active;
    return active;
  }

  private ready(active: Active, silent = false): void {
    active.ready = true;
    if (silent || active.played) {
      this.complete(active);
      return;
    }
    active.timer = setTimeout(() => this.complete(active), active.durationMs + PLAYED_GRACE_MS);
  }

  private played(streamId: number, lagMs: number | null): void {
    if (lagMs !== null) addSample(this.data.samples, 'phoneLag', lagMs);
    const active = this.active;
    if (active?.streamId !== streamId) return;
    active.played = true;
    if (active.ready) this.complete(active);
  }

  private complete(active: Active): void {
    if (this.active !== active) return;
    if (active.timer) clearTimeout(active.timer);
    this.active = null;
    this.meter.addCharacter(active.durationMs);
    void this.meter.flush().then((r) => this.charged(r));
    if (active.endAfter !== null) {
      void this.end(active.endAfter);
      return;
    }
    this.persistState();
    this.listen();
  }

  // ---- safety and minutes ----

  private crisis(): void {
    if (this.data.crisis) return;
    this.data.crisis = true;
    this.learnerTurn?.closeWindow();
    this.frames.send({
      type: 'safety',
      kind: 'crisis',
      resourcesKey: crisisResourcesKey(this.data.meta.country),
    });
    console.warn('call safety flag', { callId: this.data.meta.callId, kind: 'crisis' });
    if (this.reply === null && this.active === null) void this.end('safety');
  }

  private keepHouse(): void {
    if (this.ended || !this.frames.attached) return;
    keepHouse(this.data, this.frames);
    this.persistState();
  }

  private charged(result: ChargeResult | null): void {
    if (result === null || this.ended) return;
    this.data.secondsLeft = result.secondsLeft;
    this.frames.send({
      type: 'minutes',
      secondsLeft: result.secondsLeft,
      wrappingUp: result.wrappingUp,
    });
    if (result.exhausted && !this.data.wrapStarted) {
      this.frames.send({ type: 'error', code: 'minutes_exhausted', fatal: true });
      void this.end('minutes_exhausted');
      return;
    }
    if (result.wrappingUp && !this.data.wrapping) {
      this.data.wrapping = true;
      if (this.accepting()) {
        this.learnerTurn?.closeWindow();
        this.wrapUpNow();
      }
    }
  }

  // ---- plumbing ----

  private thinking(on: boolean): void {
    if (this.thinkingOn === on) return;
    this.thinkingOn = on;
    this.frames.send({ type: 'thinking', state: on ? 'start' : 'stop' });
  }

  private learnerLine(text: string) {
    return {
      speaker: 'learner' as const,
      text,
      at: Date.now(),
      turn: this.data.turns + 1,
      words: [],
      beatId: `beat-${this.data.beat}`,
      outcome: null,
      phrasesUsed: [],
      canDo: null,
      targetId: null,
      correctionFixed: null,
    };
  }

  private pushCharacterLine(text: string): void {
    this.data.transcript.push({
      speaker: this.speaker,
      text,
      at: Date.now(),
      lineId: null,
      beatId: `beat-${this.data.beat}`,
    });
  }

  private addUsage(line: SpokenLine): void {
    const u = this.data.usage;
    u.input += line.usage.input * HEDGE;
    u.cacheRead += line.usage.cacheRead * HEDGE;
    u.cacheWrite += line.usage.cacheWrite;
    u.output += line.usage.output;
    this.data.ttsChars += line.ttsChars;
  }

  private syncData(): void {
    this.data.meter = this.meter.state();
    this.data.sttSeconds += this.learnerTurn?.stt.audioSeconds ?? 0;
    if (this.learnerTurn) this.learnerTurn.stt.audioSeconds = 0;
  }

  private persistState(): void {
    this.syncData();
    this.persist();
  }
}

/** The learner's lines and the resident's, for the judge. */
export const judgedLines = (transcript: readonly TranscriptLine[]) =>
  transcript
    .filter((l) => l.text.trim() !== '')
    .map((l) => ({
      who: isLearnerLine(l) ? ('learner' as const) : ('character' as const),
      text: l.text,
    }));
