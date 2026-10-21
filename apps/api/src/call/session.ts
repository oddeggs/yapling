import type {
  CallClientFrame,
  CallEndReason,
  CharacterId,
  MeaningSubject,
} from '@yapling/contracts';
import { speechSettings, WRAP_UP_SECONDS } from '@yapling/domain';
import {
  findLine,
  glossFor,
  plainCaption,
  STAGE_SPEECH,
  type Scene,
  type SceneEffect,
} from '@yapling/story';

import type { Bindings } from '../env';
import { userObject, type ChargeResult } from '../user';
import { Director, lineDirection, wrapUpDirection, type GenEffect } from './director';
import { finalizeCall, type CallData } from './finalize';
import { FrameSender } from './frames';
import { LearnerTurn } from './learner-turn';
import { SpokenLine, type LineHost, type LineSource } from './line';
import { anthropicClient, HEDGE, messagesFor, prewarm, systemFor, turnParams } from './llm';
import { meaningFor } from './meaning';
import { Meter } from './meter';
import { Replies, type Active } from './reply';
import { AI_DISCLOSURE_EVERY_MS, BREAK_REMINDER_AFTER_MS, crisisResourcesKey } from './safety';
import type { TtsVoice } from './tts';
import type { CharacterLine } from './transcript';
import { stageVoice, VoicePool } from './voice-pool';

/*
 * One live call while a phone is attached: the director's effects carried out in order (recorded
 * lines, generated lines, hints, beats), the learner's turns answered, minutes metered, safety
 * kept. Plain data lives in `CallData` so a dropped call resumes where it was.
 */

/** A line waits for the phone's `played` at most this long after its audio is all sent. */
const PLAYED_GRACE_MS = 3_000;
const THINKING_AFTER_MS = 600;
const HOUSEKEEPING_MS = 15_000;

type QueueItem =
  SceneEffect | { readonly type: 'say'; readonly speaker: CharacterId; readonly text: string };

export class CallSession {
  private frames = new FrameSender(null);
  private learner: LearnerTurn | null = null;
  private readonly director: Director;
  private readonly meter: Meter;
  private readonly llm;
  private queue: QueueItem[] = [];
  private active: Active | null = null;
  private readonly replies: Replies;
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
    this.meter = new Meter((seconds, kind) =>
      userObject(env, data.meta.userId).charge(seconds, kind),
    );
    this.meter.restore(data.meter);
    this.llm = anthropicClient(env.ANTHROPIC_API_KEY ?? '');
    this.voices = new VoicePool(env.ELEVENLABS_API_KEY ?? '');
    this.replies = new Replies({
      data,
      director: this.director,
      scene,
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
      answer: (text, speechEndAt, gated) => this.replies.answer(text, speechEndAt, gated),
      silence: () => this.run(this.director.dispatch({ type: 'silent' })),
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
    if (how.newCall) this.discloseAi();
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
        this.learner?.endTurn();
        return;
      case 'hold':
        this.learner?.hold(frame.seconds);
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
      case 'hello':
      case 'unknown':
        return;
    }
  }

  // ---- effects ----

  private run(effects: readonly SceneEffect[], subject: MeaningSubject | null = null): void {
    const later: QueueItem[] = [];
    for (const effect of effects) {
      if (effect.type === 'hint') {
        const gloss = STAGE_SPEECH[this.data.learner.stage].glossHints
          ? glossFor(effect.hint.glosses, this.data.learner.firstLanguage)
          : null;
        this.frames.send({ type: 'hint', phrase: effect.hint.en, gloss });
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
    if (this.ended || this.active !== null || this.replies.busy || this.data.crisis) return;
    if (this.data.wrapping && !this.data.wrapStarted && this.linesPlayed > 0) {
      this.queue = [];
      this.data.wrapStarted = true;
      const speaker = this.director.listening()?.answer.listener ?? this.scene.cast[0] ?? 'pip';
      this.learner?.closeWindow();
      this.startLine(
        speaker,
        this.modelSource(speaker, wrapUpDirection(speaker, this.data.learner.stage)),
        null,
        'minutes_exhausted',
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
          this.playRec(item);
          return;
        case 'gen':
          this.learner?.closeWindow();
          this.startLine(
            item.speaker,
            this.modelSource(item.speaker, lineDirection(item, this.data.learner.stage)),
            'gen_done',
          );
          return;
        case 'say':
          this.learner?.closeWindow();
          this.startLine(item.speaker, { kind: 'text', text: item.text }, null);
          return;
        case 'show_ui':
        case 'hint':
        case 'correction':
          continue;
      }
    }
    if (this.director.listening() !== null) {
      this.learner?.openWindow(STAGE_SPEECH[this.data.learner.stage].silenceMs);
    }
  }

  private accepting(): boolean {
    return (
      !this.ended &&
      !this.data.crisis &&
      this.active === null &&
      this.queue.length === 0 &&
      !(this.data.wrapping && this.linesPlayed > 0) &&
      this.director.listening() !== null
    );
  }

  private playRec(effect: Extract<SceneEffect, { type: 'play_rec' }>): void {
    const line = findLine(effect.lineId);
    if (!effect.recorded || !line?.audio) {
      // Not recorded yet: the character's live voice reads the written line.
      this.startLine(
        effect.character,
        { kind: 'text', text: plainCaption(effect.text) },
        'rec_played',
        null,
        effect.beatId,
      );
      return;
    }
    const streamId = this.nextStreamId();
    this.frames.send({
      type: 'play_rec',
      streamId,
      lineId: effect.lineId,
      character: effect.character,
    });
    this.pushCharacterLine(effect.character, effect.caption, effect.lineId, effect.beatId);
    const active = this.newActive(streamId, 'rec_played');
    active.durationMs = line.audio.durationMs;
    this.ready(active);
  }

  private modelSource(speaker: CharacterId, direction: string): LineSource {
    const system = systemFor(speaker, this.scene, this.data.learner);
    return {
      kind: 'model',
      params: turnParams(system, messagesFor(speaker, this.data.transcript, direction)),
      hedge: HEDGE,
    };
  }

  private voice(character: CharacterId): TtsVoice {
    return stageVoice(character, this.data.learner.stage);
  }

  private lineHost(): LineHost {
    return {
      frames: this.frames,
      llm: this.llm,
      nextStreamId: () => this.nextStreamId(),
      takeTts: (voice) => this.voices.take(voice),
    };
  }

  /** A line from the model or written text, not waiting on the learner. */
  private startLine(
    speaker: CharacterId,
    source: LineSource,
    after: Active['after'],
    endAfter: CallEndReason | null = null,
    beatId: string | null = null,
  ): void {
    const line = new SpokenLine(this.lineHost(), {
      speaker,
      voice: this.voice(speaker),
      source,
      gated: false,
      maxWords: speechSettings(this.data.learner.stage).maxWordsPerTurn,
      afterReaction: false,
      onFirstAudio: () => this.thinking(false),
    });
    const active = this.newActive(line.streamId, after);
    active.endAfter = endAfter;
    const thinkingTimer = setTimeout(() => {
      if (!line.committed && this.active === active) this.thinking(true);
    }, THINKING_AFTER_MS);
    line.start();
    void line.done.then((result) => {
      clearTimeout(thinkingTimer);
      this.thinking(false);
      this.addUsage(line);
      if (this.active !== active) return;
      if (result.failed !== null && result.text === '') {
        this.frames.send({
          type: 'error',
          code: result.failed === 'llm' ? 'llm_failed' : 'tts_failed',
          fatal: false,
        });
      }
      if (result.text)
        this.pushCharacterLine(speaker, result.text, null, beatId ?? this.director.state.beatId);
      active.durationMs = result.audioMs;
      this.ready(active, result.text === '');
    });
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
    if (lagMs !== null && this.data.awaitingLag) {
      this.data.samples.phoneLag.push(lagMs);
      this.data.awaitingLag = false;
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
    this.queue.unshift({ type: 'say', speaker: effect.speaker, text: answer.simple });
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

  private discloseAi(): void {
    this.frames.send({ type: 'safety', kind: 'ai_disclosure', resourcesKey: null });
    this.data.disclosedAtMs =
      this.data.priorCallSeconds * 1_000 + (Date.now() - this.data.meta.startedAt);
  }

  private keepHouse(): void {
    if (this.ended || !this.frames.attached) return;
    const now = Date.now();
    const cumulative = this.data.priorCallSeconds * 1_000 + (now - this.data.meta.startedAt);
    if (cumulative - this.data.disclosedAtMs >= AI_DISCLOSURE_EVERY_MS) this.discloseAi();
    if (!this.data.breakSent && now - this.data.continuousSince >= BREAK_REMINDER_AFTER_MS) {
      this.data.breakSent = true;
      this.frames.send({ type: 'safety', kind: 'break_reminder', resourcesKey: null });
    }
    this.persistState();
  }

  private charged(result: ChargeResult | null): void {
    if (result === null || this.ended) return;
    this.data.secondsLeft = result.secondsLeft;
    const wrappingUp = result.secondsLeft <= WRAP_UP_SECONDS;
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
    const speakers = new Set<CharacterId>();
    for (const beat of this.scene.beats) {
      if (beat.kind === 'gen') speakers.add(beat.speaker);
      if ((beat.kind === 'gen' || beat.kind === 'learner') && beat.answer)
        speakers.add(beat.answer.listener);
    }
    for (const speaker of speakers) {
      void prewarm(
        this.llm,
        systemFor(speaker, this.scene, this.data.learner),
        this.data.usage,
      ).catch((error: unknown) => {
        console.warn('prewarm failed', { error: String(error).slice(0, 200) });
      });
    }
    const first = [...speakers][0];
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
