import type {
  CallClientFrame,
  CallEndReason,
  CharacterId,
  MeaningSubject,
  Pace,
} from '@yapling/contracts';
import { LONG_QUIET_MS } from '@yapling/domain';
import {
  callKindOf,
  SAFE_WRAP_UP,
  safeLineFor,
  type LineLanguage,
  type Scene,
  type SceneEffect,
} from '@yapling/story';

import type { Bindings } from '../env';
import { userObject, type ChargeResult } from '../user';
import { CallLines, type PlayRec } from './call-lines';
import { CardTurns } from './card-turn';
import { Director, lineDirection, promptStage, wrapUpDirection, type GenEffect } from './director';
import { finalizeCall, type CallData } from './finalize';
import { FrameSender } from './frames';
import { LearnerTurn } from './learner-turn';
import type { LineHost, LineSource, SpokenLine } from './line';
import { anthropicClient, HEDGE, messagesFor, prewarmScene, systemFor, turnParams } from './llm';
import { meaningFor } from './meaning';
import { Meter } from './meter';
import { notePass, placementDone } from './placement';
import { Replies, type Active } from './reply';
import { crisisResourcesKey, discloseAi, keepHouse } from './safety';
import { hintFrame } from './scene-lines';
import { lastAskedBy, type CharacterLine } from './transcript';
import type { TtsVoice } from './tts';
import { stageVoice, VoicePool } from './voice-pool';

/*
 * One live call while a phone is attached: the director's effects carried out in order (recorded
 * lines, generated lines, hints, beats), the learner's turns answered, minutes metered, safety
 * kept. Plain data lives in `CallData` so a dropped call resumes where it was.
 */

/** A line waits for the phone's `played` at most this long after its audio is all sent. */
const PLAYED_GRACE_MS = 3_000;
const HOUSEKEEPING_MS = 15_000;

/**
 * The long quiet before the hint is offered, once and silently; tests shorten it. Thinking time is
 * otherwise unlimited: silence never ends or counts as a turn, and no line is spoken for it.
 */
export const quietTiming = { offerMs: LONG_QUIET_MS };

type QueueItem =
  | SceneEffect
  /** A meaning's simple English, said by the character who explained it. */
  | { readonly type: 'speak'; readonly speaker: CharacterId; readonly text: string }
  /** A recorded line whose name splice ("Lan!") was just said: the recording now. */
  | { readonly type: 'rec_now'; readonly effect: PlayRec };

export class CallSession {
  private frames = new FrameSender(null);
  private learner: LearnerTurn | null = null;
  private readonly director: Director;
  private readonly meter: Meter;
  private readonly llm;
  private queue: QueueItem[] = [];
  private active: Active | null = null;
  private readonly replies: Replies;
  private readonly cards: CardTurns;
  private readonly lines: CallLines;
  private readonly voices: VoicePool;
  private thinkingOn = false;
  private linesPlayed = 0;
  private housekeeping: ReturnType<typeof setInterval> | null = null;
  private ended = false;

  constructor(
    private readonly env: Bindings,
    readonly data: CallData,
    private readonly scene: Scene,
    private readonly persist: () => void,
    private readonly onEnded: () => void,
  ) {
    this.director = new Director(scene, data.runner, data.learner.stage);
    // The scene's kind (Pip's minute: `daily`), not the phone's word for it, decides its minutes.
    const callKind = data.meta.pipsMinute ? 'daily' : (callKindOf(scene.kind) ?? data.meta.kind);
    this.meter = new Meter((seconds, kind) =>
      userObject(env, data.meta.userId).charge(seconds, kind, callKind),
    );
    this.meter.restore(data.meter);
    this.llm = anthropicClient(env.ANTHROPIC_API_KEY ?? '');
    this.voices = new VoicePool(env.ELEVENLABS_API_KEY ?? '');
    this.replies = new Replies({
      data,
      director: this.director,
      scene,
      judgeKey: env.TYPESAFE_API_KEY,
      frames: () => this.frames,
      learner: () => this.learner,
      active: () => this.active,
      accepting: () => this.accepting(),
      lineHost: () => this.lineHost(),
      voice: (character) => this.voice(character),
      thinking: (on) => this.thinking(on),
      newActive: (streamId, after) => this.newActive(streamId, after),
      ready: (active, silent) => this.ready(active, silent),
      run: (effects) => this.run(effects),
      enqueue: (effects) => this.queue.push(...effects),
      pump: () => this.pump(),
      crisis: () => this.crisis(),
      end: (reason) => void this.end(reason),
      addUsage: (line) => this.addUsage(line),
      pushCharacterLine: (speaker, text, beatId) =>
        this.pushCharacterLine(speaker, text, null, beatId),
      nextStreamId: () => this.nextStreamId(),
    });
    this.cards = new CardTurns({
      data,
      director: this.director,
      judgeKey: env.TYPESAFE_API_KEY,
      frames: () => this.frames,
      learner: () => this.learner,
      accepting: () => this.accepting(),
      lineHost: () => this.lineHost(),
      voice: (character) => this.voice(character),
      run: (effects) => this.run(effects),
      askedAgain: (ask) => this.lines.askedAgain(ask),
      pump: () => this.pump(),
    });
    this.lines = new CallLines({
      data,
      director: this.director,
      frames: () => this.frames,
      learner: () => this.learner,
      voice: (character, language) => this.voice(character, language),
      scene,
      lineHost: () => this.lineHost(),
      thinking: (on) => this.thinking(on),
      addUsage: (line) => this.addUsage(line),
      active: () => this.active,
      newActive: (streamId, after) => this.newActive(streamId, after),
      ready: (active, silent) => this.ready(active, silent),
      pushCharacterLine: (speaker, text, lineId, beatId) =>
        this.pushCharacterLine(speaker, text, lineId, beatId),
      nextStreamId: () => this.nextStreamId(),
      queueFirst: (item) => this.queue.unshift(item),
      run: (effects) => this.run(effects),
      pump: () => this.pump(),
    });
  }

  // ---- lifecycle ----

  /** A phone socket took the call: `ready`, then the scene from the start or its beat. */
  async attach(
    socket: WebSocket,
    how: { readonly newCall: boolean; readonly freshScene: boolean },
    resumeToken: string,
  ): Promise<void> {
    this.detachPhone();
    this.frames = new FrameSender(socket);
    this.data.detachedAt = null;
    const learner = new LearnerTurn(this.env.ELEVENLABS_API_KEY ?? '', this.data.meta.turnMode, {
      accepting: () => this.accepting(),
      partial: (text) => this.frames.send({ type: 'partial', text: text.slice(0, 2_000) }),
      // A card turn (all of Pip's minute) is decided by its words; others by the listener's line.
      answer: (text, speechEndAt, gated) =>
        this.cards.handles() || this.data.meta.pipsMinute
          ? this.cards.answer(text, speechEndAt, gated)
          : this.replies.answer(text, speechEndAt, gated),
      silence: () => this.run(this.director.dispatch({ type: 'silent' })),
      notHeard: () => this.frames.send({ type: 'not_heard' }),
      released: (line) => this.replies.released(line),
      talked: (ms) => {
        this.meter.addLearner(ms);
        void this.meter.flush().then((r) => this.charged(r));
      },
      sttFailed: (detail) => {
        console.error('stt failed', { detail });
        this.frames.send({ type: 'error', code: 'stt_failed', fatal: false });
      },
    });
    this.learner = learner;
    const sttOpen = learner.stt.open().catch((error: unknown) => {
      console.error('stt connect failed', { error: String(error) });
      this.frames.send({ type: 'error', code: 'stt_failed', fatal: false });
    });
    if (how.newCall) this.warmUp();
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
    this.queue = [];
    this.run(this.director.begin(how.freshScene));
    this.persistState();
  }

  /** The phone dropped: stop listening and speaking; the beat replays on resume. */
  detach(): void {
    this.detachPhone();
    this.frames = new FrameSender(null);
    this.data.detachedAt = Date.now();
    void this.meter.flush(true);
    this.persistState();
  }

  /** Another socket took the call over. */
  replace(): void {
    this.frames.send({
      type: 'ended',
      reason: 'replaced',
      summaryPending: false,
      callRecordId: this.data.meta.callId,
    });
  }

  private detachPhone(): void {
    this.replies.drop();
    this.cards.drop();
    if (this.active?.timer) clearTimeout(this.active.timer);
    this.active = null;
    this.learner?.close();
    this.learner = null;
    this.thinkingOn = false;
  }

  async end(reason: CallEndReason): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.data.endReason = reason;
    if (this.housekeeping) clearInterval(this.housekeeping);
    await this.meter.flush(true);
    this.syncData();
    this.detachPhoneKeepFrames();
    this.voices.close();
    await placementDone(this.env, this.data, this.scene, reason);
    let summaryPending = false;
    try {
      summaryPending = await finalizeCall(this.env, this.data, this.scene, this.director.state);
    } catch (error) {
      console.error('call record failed', { error: String(error) });
    }
    this.frames.send({
      type: 'ended',
      reason,
      summaryPending,
      callRecordId: this.data.meta.callId,
    });
    this.onEnded();
  }

  private detachPhoneKeepFrames(): void {
    const frames = this.frames;
    this.detachPhone();
    this.frames = frames;
  }

  // ---- phone frames ----

  mic(chunk: Uint8Array): void {
    if (!this.ended) this.learner?.mic(chunk);
  }

  frame(frame: CallClientFrame): void {
    if (this.ended) return;
    switch (frame.type) {
      case 'end_turn':
      case 'hold':
      case 'speech':
        this.learner?.frame(frame);
        return;
      case 'hint_request':
        this.run(this.director.dispatch({ type: 'hint_request' }));
        return;
      case 'meaning_request':
        this.run(this.director.dispatch({ type: 'meaning_request' }), frame.subject);
        return;
      case 'played':
        this.played(frame.streamId, frame.lagMs);
        return;
      case 'hangup':
        void this.end('hangup');
        return;
      case 'replay':
        // "Nói lại" / "Chậm thôi": the same replay as saying it, while the scene waits.
        if (this.accepting()) this.lines.tapped(frame.slower ? 'slower' : 'repeat');
        return;
      case 'pace':
        this.setPace(frame.pace);
        return;
      case 'hello':
      case 'unknown':
        return;
    }
  }

  // ---- effects ----

  private run(effects: readonly SceneEffect[], subject: MeaningSubject | null = null): void {
    notePass(this.data, this.director.state);
    const later: QueueItem[] = [];
    for (const effect of effects) {
      if (effect.type === 'hint') {
        this.frames.send(hintFrame(effect, this.data.learner));
        this.learner?.restartQuiet();
      } else if (effect.type === 'gen' && effect.purpose === 'meaning') {
        void this.meaning(effect, subject);
      } else {
        later.push(effect);
      }
    }
    this.queue.push(...later);
    this.pump();
  }

  private pump(): void {
    if (this.ended || this.active !== null || this.replies.busy || this.cards.busy) return;
    if (this.data.crisis) return;
    // No phone, no lines: nothing is generated or spoken until a phone resumes the call.
    if (!this.frames.attached) return;
    if (this.data.wrapping && !this.data.wrapStarted && this.linesPlayed > 0) {
      this.queue = [];
      this.data.wrapStarted = true;
      const speaker = this.director.listening()?.answer.listener ?? this.scene.cast[0] ?? 'pip';
      this.learner?.closeWindow();
      this.lines.startLine(
        speaker,
        this.modelSource(
          speaker,
          wrapUpDirection(speaker, promptStage(this.scene, this.data.learner.stage)),
        ),
        null,
        { endAfter: 'minutes_exhausted', safeLine: SAFE_WRAP_UP },
      );
      return;
    }
    for (let item = this.queue.shift(); item !== undefined; item = this.queue.shift()) {
      switch (item.type) {
        case 'beat_changed':
          this.frames.send({ type: 'beat', beatId: item.beatId, progress: item.progress });
          continue;
        case 'scene_end':
          void this.end('scene_complete');
          return;
        case 'play_rec':
          this.learner?.closeWindow();
          this.lines.playRec(item);
          return;
        case 'rec_now':
          this.learner?.closeWindow();
          this.lines.playRecorded(item.effect);
          return;
        case 'gen':
          this.learner?.closeWindow();
          this.lines.startLine(
            item.speaker,
            this.modelSource(
              item.speaker,
              lineDirection(item, promptStage(this.scene, this.data.learner.stage)),
            ),
            'gen_done',
            { safeLine: safeLineFor(item, lastAskedBy(this.data.transcript, item.speaker)) },
          );
          return;
        case 'say':
          this.learner?.closeWindow();
          this.lines.say(item);
          return;
        case 'speak':
          this.learner?.closeWindow();
          this.lines.startLine(item.speaker, { kind: 'text', text: item.text }, null);
          return;
        case 'show_ui':
        case 'hint':
        case 'correction':
          continue;
      }
    }
    // The learner thinks for as long as they like: the quiet is only watched for the hint offer.
    if (this.director.offersOnQuiet()) this.learner?.openWindow(quietTiming.offerMs);
    else this.learner?.closeWindow();
  }

  private accepting(): boolean {
    return (
      !this.ended &&
      !this.data.crisis &&
      this.active === null &&
      !this.cards.busy &&
      this.queue.length === 0 &&
      !(this.data.wrapping && this.linesPlayed > 0) &&
      this.director.listening() !== null
    );
  }

  /** "Khó quá" → slower (or back to the stage's own): the voice and the prompt from the next line. */
  private setPace(pace: Pace | null): void {
    this.data.learner = { ...this.data.learner, pace };
    this.persistState();
  }

  private modelSource(speaker: CharacterId, direction: string): LineSource {
    const system = systemFor(speaker, this.scene, this.data.learner);
    return {
      kind: 'model',
      params: turnParams(system, messagesFor(speaker, this.data.transcript, direction)),
      hedge: HEDGE,
    };
  }

  private voice(character: CharacterId, language: LineLanguage = 'en'): TtsVoice {
    const voice = stageVoice(character, this.data.learner.stage, this.data.learner.pace ?? null);
    return language === 'en' ? voice : { ...voice, language };
  }

  private lineHost(): LineHost {
    return {
      frames: this.frames,
      llm: this.llm,
      nextStreamId: () => this.nextStreamId(),
      takeTts: (voice) => this.voices.take(voice),
    };
  }

  private newActive(streamId: number, after: Active['after']): Active {
    const active: Active = {
      streamId,
      after,
      durationMs: 0,
      ready: false,
      played: false,
      timer: null,
      endAfter: null,
    };
    this.active = active;
    return active;
  }

  /** All audio is out: wait for `played` (or a grace period), or finish now when silent. */
  private ready(active: Active, silent = false): void {
    active.ready = true;
    if (silent || active.played) {
      this.complete(active);
      return;
    }
    active.timer = setTimeout(() => this.complete(active), active.durationMs + PLAYED_GRACE_MS);
  }

  private played(streamId: number, lagMs: number | null): void {
    const active = this.active;
    if (lagMs !== null) {
      this.replies.lag(streamId, lagMs);
      this.cards.lag(lagMs);
    }
    if (active?.streamId !== streamId) return;
    active.played = true;
    if (active.ready) this.complete(active);
  }

  private complete(active: Active): void {
    if (this.active !== active) return;
    if (active.timer) clearTimeout(active.timer);
    this.active = null;
    this.linesPlayed += 1;
    this.meter.addCharacter(active.durationMs);
    void this.meter.flush().then((r) => this.charged(r));
    if (active.endAfter !== null) {
      void this.end(active.endAfter);
      return;
    }
    this.persistState();
    this.run(active.after === null ? [] : this.director.dispatch({ type: active.after }));
  }

  // ---- meaning, safety, minutes ----

  private async meaning(effect: GenEffect, subject: MeaningSubject | null): Promise<void> {
    let answer;
    try {
      answer = await meaningFor(effect, subject, {
        transcript: this.data.transcript,
        firstLanguage: this.data.learner.firstLanguage,
        stage: this.data.learner.stage,
        llm: this.llm,
        usage: this.data.usage,
      });
    } catch (error) {
      console.error('meaning failed', { error: String(error) });
      this.frames.send({ type: 'error', code: 'llm_failed', fatal: false });
      return;
    }
    if (answer === null || this.ended) return;
    this.frames.send({
      type: 'meaning',
      about: answer.about.slice(0, 2_000),
      simple: answer.simple.slice(0, 2_000),
      gloss: answer.gloss?.slice(0, 2_000) ?? null,
    });
    // A Visitor reads the meaning in their own language first: no English explanation is said.
    if (promptStage(this.scene, this.data.learner.stage) === 'visitor' && answer.gloss) return;
    this.queue.unshift({ type: 'speak', speaker: effect.speaker, text: answer.simple });
    this.pump();
  }

  private crisis(): void {
    if (this.data.crisis) return;
    this.data.crisis = true;
    this.queue = [];
    this.learner?.closeWindow();
    this.frames.send({
      type: 'safety',
      kind: 'crisis',
      resourcesKey: crisisResourcesKey(this.data.meta.country),
    });
    console.warn('call safety flag', { callId: this.data.meta.callId, kind: 'crisis' });
  }

  private keepHouse(): void {
    if (this.ended || !this.frames.attached) return;
    keepHouse(this.data, this.frames);
    this.persistState();
  }

  private charged(result: ChargeResult | null): void {
    if (result === null || this.ended) return;
    this.data.secondsLeft = result.secondsLeft;
    // The ledger says when to wrap up: never in a call it doesn't meter (Settling in).
    const wrappingUp = result.wrappingUp;
    this.frames.send({ type: 'minutes', secondsLeft: result.secondsLeft, wrappingUp });
    if (result.exhausted && !this.data.wrapStarted) {
      this.frames.send({ type: 'error', code: 'minutes_exhausted', fatal: true });
      void this.end('minutes_exhausted');
      return;
    }
    if (wrappingUp && !this.data.wrapping) {
      this.data.wrapping = true;
      this.learner?.closeWindow();
      this.pump();
    }
  }

  // ---- plumbing ----

  private thinking(on: boolean): void {
    if (this.thinkingOn === on) return;
    this.thinkingOn = on;
    this.frames.send({ type: 'thinking', state: on ? 'start' : 'stop' });
  }

  private nextStreamId(): number {
    this.data.streamSeq += 1;
    return this.data.streamSeq;
  }

  private pushCharacterLine(
    speaker: CharacterId,
    text: string,
    lineId: string | null,
    beatId: string | null,
  ): void {
    const line: CharacterLine = { speaker, text, at: Date.now(), lineId, beatId };
    this.data.transcript.push(line);
  }

  private addUsage(line: SpokenLine): void {
    const u = this.data.usage;
    u.input += line.usage.input * HEDGE;
    u.cacheRead += line.usage.cacheRead * HEDGE;
    u.cacheWrite += line.usage.cacheWrite;
    u.output += line.usage.output;
    this.data.ttsChars += line.ttsChars;
  }

  private warmUp(): void {
    const speakers = prewarmScene(this.llm, this.scene, this.data.learner, this.data.usage);
    const first = speakers[0];
    if (first) this.voices.warm(this.voice(first));
  }

  private syncData(): void {
    this.data.runner = this.director.state;
    this.data.meter = this.meter.state();
    this.data.sttSeconds += this.learner?.stt.audioSeconds ?? 0;
    if (this.learner) this.learner.stt.audioSeconds = 0;
  }

  private persistState(): void {
    this.syncData();
    this.persist();
  }
}
