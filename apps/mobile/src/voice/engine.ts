import type {
  AudioFrame,
  CallServerFrame,
  CharacterId,
  MeaningSubject,
  ReadyFrame,
  TurnMode,
} from '@yapling/contracts';
import type { RecordedLineId } from '@yapling/story';
import { RECORDED_LINE_ASSETS } from '@yapling/story/assets';
import { AudioContext } from 'react-native-audio-api';

import type { VoiceSessionStatus } from '../../modules/voice-session';
import { CallAudioSession, micPermissionStatus, type SessionEvent } from './audio-session';
import {
  CallSocket,
  type HelloFields,
  type OutgoingFrame,
  type SocketFactory,
  type SocketLike,
  type SocketStatus,
} from './call-socket';
import { initialCallState, update, withLatency, type CallState } from './call-state';
import { MIC_FRAME_MS } from './framing';
import { createLipsync, type Lipsync } from './lipsync';
import { MicCapture } from './mic';
import { CallPlayer, type LineInfo, type RecordedLineSource } from './player';
import { Store } from './store';
import { LatencyMeter, TurnTaker } from './turns';
import { Vad } from './vad';
import type { VisemeTrackFn } from './visemes';

/*
 * The phone side of a live call: audio session, mic, VAD, turn-taking, the call socket, playback
 * and the lipsync clock, behind one object the call screen drives and reads.
 *
 *   const engine = new VoiceEngine({ url, hello });
 *   engine.connect();          // while the call screen rings
 *   await engine.prepare();    // audio session, playback, mic (after the mic permission)
 *   useStore(engine.state); useLipsyncClock(engine.lipsync);
 */

export interface VoiceEngineOptions {
  /** The call socket, `wss://<api>/api/calls/socket`. */
  readonly url: string;
  readonly hello: HelloFields;
  readonly createSocket?: SocketFactory;
  readonly micChunkMs?: number;
  /** Recorded lines to decode while the call connects. */
  readonly preloadLines?: readonly string[];
  readonly visemeTrack?: VisemeTrackFn;
  /** Where recorded lines come from; the story's bundled lines by default. */
  readonly recorded?: RecordedLineSource;
  /** Echo cancellation on the mic (default on; off only to diagnose audio problems). */
  readonly voiceProcessing?: boolean;
  /** Diagnostics for the dev lab. */
  readonly onLog?: (message: string) => void;
}

/** Streams the phone plays on its own are numbered above any the call uses. */
const LOCAL_STREAM_BASE = 0xffff_0000;

/** How long the engine takes to settle on a new route before the graph is checked. */
const ROUTE_SETTLE_MS = 300;

/** The sample rate of the playback graph: the TTS rate, so live audio needs no resampling. */
const PLAYBACK_RATE_HZ = 24_000;

const isRecordedLineId = (id: string): id is RecordedLineId => id in RECORDED_LINE_ASSETS;

/** The story's recorded lines, bundled with the app. */
export const storyRecordedLines: RecordedLineSource = (lineId) => {
  if (!isRecordedLineId(lineId)) return null;
  const asset = RECORDED_LINE_ASSETS[lineId];
  return { audio: asset.audio(), timing: asset.timing() };
};

export class VoiceEngine {
  readonly state: Store<CallState>;
  readonly lipsync: Lipsync;
  private readonly socket: CallSocket;
  private readonly session: CallAudioSession;
  private readonly vad = new Vad();
  private readonly turns: TurnTaker;
  private readonly meter = new LatencyMeter();
  private context: AudioContext | null = null;
  private player: CallPlayer | null = null;
  private mic: MicCapture | null = null;
  private outputLatencyS = 0.02;
  private simulated: { timer: ReturnType<typeof setInterval>; done: Promise<void> } | null = null;
  private useDeviceMic = true;
  private disposed = false;
  private hangupTimer: ReturnType<typeof setTimeout> | null = null;
  /** Live and recorded lines waiting for audio while playback isn't ready yet. */
  private early: CallServerFrame[] = [];
  private earlyAudio: AudioFrame[] = [];
  /** Caption text per stream, kept until the line ends. */
  private readonly captions = new Map<number, string>();
  private localStream = LOCAL_STREAM_BASE;
  /** Mic audio sent on the current socket, in ms (the clock `speech` frames are timed on). */
  private micSentMs = 0;

  constructor(private readonly options: VoiceEngineOptions) {
    this.state = new Store(initialCallState(options.hello.turnMode));
    this.lipsync = createLipsync();
    this.session = new CallAudioSession((e) => void this.onSessionEvent(e));
    this.turns = new TurnTaker(
      options.hello.turnMode,
      {
        sendMic: (pcm) => {
          // The call's mic clock: milliseconds of 16 kHz mic audio sent on this socket.
          if (this.socket.sendMic(pcm)) this.micSentMs += pcm.byteLength / 2 / 16;
        },
        endTurn: () => {
          this.socket.send({ type: 'end_turn' });
          this.patch({ awaitingReply: true });
        },
      },
      options.micChunkMs === undefined ? {} : { chunkMs: options.micChunkMs },
    );
    this.socket = new CallSocket({
      url: options.url,
      hello: options.hello,
      // React Native's WebSocket has the shape `SocketLike` describes; DOM typings make it look stricter.
      createSocket: options.createSocket ?? ((url) => new WebSocket(url) as unknown as SocketLike),
      events: {
        status: (s) => this.onSocketStatus(s),
        ready: (f) => this.onReady(f),
        frame: (f) => this.onFrame(f),
        audio: (f) => this.onAudio(f),
        invalid: (r) => this.log(`invalid frame: ${r}`),
      },
    });
  }

  /** The device mic is capturing. */
  get micRunning(): boolean {
    return this.mic?.isRunning ?? false;
  }

  get turnMode(): TurnMode {
    return this.turns.mode;
  }

  /** Opens the call socket. Call it as early as possible: it takes a second or more. */
  connect(): void {
    this.patch({ phase: 'connecting' });
    this.socket.open();
  }

  /**
   * Starts the call's audio: the session, the playback graph, echo cancellation, and the mic when
   * permission is granted. Returns the session status (route, voice processing) for diagnostics.
   * If the audio can't start, the session is set up once more from scratch; if that fails too, the
   * call ends with `no_connection` (the try-again sheet) rather than going on in silence.
   */
  async prepare(): Promise<VoiceSessionStatus | null> {
    try {
      return await this.startAudio();
    } catch (e) {
      this.log(`audio failed: ${String(e)}; setting the session up again`);
    }
    await this.stopAudio();
    if (this.disposed) return null;
    try {
      return await this.startAudio();
    } catch (e) {
      this.log(`audio failed again: ${String(e)}`);
      this.patch({ error: 'no_connection' });
      void this.teardown();
      return null;
    }
  }

  private async startAudio(): Promise<VoiceSessionStatus | null> {
    await this.session.start();
    const context = new AudioContext({ sampleRate: PLAYBACK_RATE_HZ });
    this.context = context;
    await context.resume();
    // Echo cancellation goes on once the graph runs: the engine is rebuilt for this session with
    // it, never put on an engine an earlier player (a story, the last call) left behind.
    const status = this.session.enableVoiceProcessing(this.options.voiceProcessing ?? true);
    this.refreshLatency();
    this.player ??= new CallPlayer({
      context,
      lipsync: this.lipsync,
      recorded: this.options.recorded ?? storyRecordedLines,
      outputLatency: () => this.outputLatencyS,
      ...(this.options.visemeTrack ? { visemeTrack: this.options.visemeTrack } : {}),
      events: {
        scheduled: (line, audibleMs) => this.onLineScheduled(line, audibleMs),
        audible: (line) => this.onLineAudible(line),
        caption: (line, text) => this.onCaption(line, text),
        ended: (line, interrupted) => this.onLineEnded(line, interrupted),
        idle: () => {
          this.vad.setEchoGuard(false);
          this.patch({ playing: false });
        },
        failed: (line, reason) => this.log(`line ${line.streamId} failed: ${reason}`),
      },
    });
    if (this.options.preloadLines) this.player.preload(this.options.preloadLines);
    // Frames that arrived before playback existed.
    for (const f of this.early.splice(0)) this.onFrame(f);
    for (const a of this.earlyAudio.splice(0)) this.onAudio(a);
    if ((await micPermissionStatus()) === 'granted') await this.startMic();
    else this.log('mic permission not granted: listening only');
    // A failed mic start stops the engine; character audio must still play.
    await this.restartGraphIfStopped();
    this.log(`audio up: ${this.debugAudio()}`);
    return status;
  }

  /** Lets go of the call's audio: the graph, the mic and (when the call still holds it) the session. */
  private async stopAudio(): Promise<void> {
    this.player?.dispose();
    this.player = null;
    const ctx = this.context;
    this.context = null;
    if (ctx) await ctx.close().catch(() => undefined);
    await this.mic?.stop().catch(() => undefined);
    this.mic = null;
    await this.session.stop();
  }

  /**
   * The audio engine can stop while the graph still counts as running (a failed mic start, an
   * interruption, a route change): suspending and resuming the graph starts the engine again.
   */
  private async restartGraphIfStopped(force = false): Promise<void> {
    const ctx = this.context;
    if (!ctx) return;
    const status = this.session.status();
    if (!force && (status === null || status.engineRunning)) return;
    this.log('audio engine stopped: restarting the graph');
    await ctx.suspend().catch(() => undefined);
    await ctx.resume().catch(() => undefined);
  }

  /** Starts mic capture (after the learner grants the permission mid-call). */
  async startMic(): Promise<boolean> {
    this.mic ??= new MicCapture(
      (frame, endMs) => this.onMicFrame(frame, endMs, 'device'),
      (m) => this.log(`mic: ${m}`),
    );
    const ok = await this.mic.start();
    this.log(`mic ${ok ? 'on' : 'failed'} at ${this.mic.deliveredRateHz || '?'} Hz`);
    return ok;
  }

  /** Hold-to-talk: the mic button went down. */
  pressTalk(): void {
    if (this.turns.mode !== 'hold_to_talk') return;
    this.turns.press();
    this.patch({ talkHeld: true, awaitingReply: false, onHold: false });
  }

  /** Hold-to-talk: the mic button came up; `end_turn` follows once the learner stops. */
  releaseTalk(): void {
    if (!this.turns.isHeld) return;
    const speaking = this.vad.speaking;
    this.turns.release(speaking);
    if (!speaking) this.meter.speechEnded(this.vad.lastVoicedMs ?? performance.now());
    this.patch({ talkHeld: false });
  }

  /** "Chờ chút": pause the call's turn detection (speaking again also ends it). */
  holdOn(seconds = 10): void {
    if (this.socket.send({ type: 'hold', seconds })) this.patch({ onHold: seconds > 0 });
  }

  requestHint(): boolean {
    return this.socket.send({ type: 'hint_request' });
  }

  requestMeaning(subject: MeaningSubject): boolean {
    return this.socket.send({ type: 'meaning_request', subject });
  }

  /** Ends the call: `hangup`, then closes after `ended` (or a short wait). */
  hangup(): void {
    this.player?.stopAll();
    if (!this.socket.send({ type: 'hangup' })) {
      void this.teardown();
      this.patch({ endReason: 'hangup' });
      return;
    }
    this.hangupTimer = setTimeout(() => {
      this.patch({ endReason: 'hangup' });
      void this.teardown();
    }, 3_000);
  }

  /** Releases everything (the call screen unmounted). */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.teardown();
  }

  /** The session's current route and voice-processing state. */
  sessionStatus(): VoiceSessionStatus | null {
    return this.session.status();
  }

  /**
   * Dev only: plays 16 kHz mono samples into the mic path at real time (VAD, turn-taking, the
   * socket) in place of the device mic, then quiet room noise until `stopSimulatedMic`.
   */
  simulateMic(samples: Float32Array, holdToTalk = false): Promise<void> {
    this.stopSimulatedMic();
    this.useDeviceMic = false;
    const frame = (16_000 * MIC_FRAME_MS) / 1000;
    let at = 0;
    let next = performance.now();
    let resolve: () => void = () => undefined;
    const done = new Promise<void>((r) => (resolve = r));
    if (holdToTalk) this.pressTalk();
    const tick = () => {
      while (performance.now() >= next) {
        const chunk = new Int16Array(frame);
        for (let i = 0; i < frame; i++) {
          const s = at < samples.length ? (samples[at] ?? 0) : 0;
          // About -60 dBFS of room noise under everything, as a real mic hears.
          const noise = (Math.random() * 2 - 1) * 0.001;
          chunk[i] = Math.round(Math.max(-1, Math.min(1, s + noise)) * 0x7fff);
          at++;
        }
        next += MIC_FRAME_MS;
        this.onMicFrame(chunk, performance.now(), 'simulated');
        if (at >= samples.length && at - frame < samples.length) {
          if (holdToTalk) this.releaseTalk();
          resolve();
        }
      }
    };
    this.simulated = { timer: setInterval(tick, 10), done };
    return done;
  }

  stopSimulatedMic(): void {
    if (this.simulated) clearInterval(this.simulated.timer);
    this.simulated = null;
    this.useDeviceMic = true;
  }

  /**
   * Plays a recorded line on the phone alone, through the same path as `play_rec` (captions and
   * lipsync included), without telling the call. For previews and the dev lab.
   */
  playRecordedLocally(lineId: string, character: CharacterId): boolean {
    if (!this.player) return false;
    this.localStream += 1;
    this.log(`local line ${lineId} as stream ${this.localStream}`);
    this.player.playRecorded(this.localStream, lineId, character);
    return true;
  }

  /** Dev only: the audio clock and the lines waiting, for the lab. */
  debugAudio(): string {
    const c = this.context;
    return `ctx ${c ? `${c.currentTime.toFixed(2)} ${c.state}` : 'none'} · ${this.player?.debug() || 'no lines'} · ${JSON.stringify(this.session.status() ?? {})}`;
  }

  /** Dev only: runs the interruption path as if iOS had sent it. */
  simulateInterruption(phase: 'began' | 'ended'): Promise<void> {
    return this.onSessionEvent({ type: 'interruption', phase, shouldResume: true });
  }

  private onMicFrame(frame: Int16Array, endMs: number, source: 'device' | 'simulated'): void {
    if (source === 'device' && !this.useDeviceMic) return;
    const s = this.state.get();
    if (s.interrupted || s.endReason) return;
    const r = this.vad.push(frame, endMs - MIC_FRAME_MS);
    if (r.event?.type === 'speech_start') {
      this.meter.speechStarted();
      this.patch({ learnerSpeaking: true, awaitingReply: false, onHold: false });
    } else if (r.event?.type === 'speech_end') {
      this.meter.speechEnded(r.event.atMs);
      this.patch({ learnerSpeaking: false });
    }
    if (!this.socket.ready) return;
    const sentBefore = this.micSentMs;
    this.turns.frame(frame, r.speaking, r.event);
    // Hands-free: tell the call when the learner starts and stops, on its mic clock, so it times
    // the turn by the phone's echo-cancelled VAD. Hold-to-talk turns end on release instead, so a
    // pause while the button is held never ends the turn.
    if (r.event && this.turns.mode === 'hands_free' && this.micSentMs > sentBefore) {
      const atMs = Math.max(0, Math.round(this.micSentMs - (endMs - r.event.atMs)));
      this.socket.send({
        type: 'speech',
        state: r.event.type === 'speech_start' ? 'start' : 'end',
        atMs,
      });
    }
  }

  private onSocketStatus(status: SocketStatus): void {
    this.log(`socket ${status}`);
    switch (status) {
      case 'connecting':
        break;
      case 'open':
        // A new socket starts a new mic clock.
        this.micSentMs = 0;
        break;
      case 'ready':
        this.patch({ connected: true, reconnecting: false });
        break;
      case 'reconnecting':
        this.turns.reset();
        this.patch({ connected: false, reconnecting: true });
        break;
      case 'lost':
        this.turns.reset();
        this.patch({ connected: false, reconnecting: false, error: 'no_connection' });
        void this.teardown();
        break;
      case 'closed':
        this.patch({ connected: false, reconnecting: false });
        break;
    }
  }

  private onReady(frame: ReadyFrame): void {
    this.log(`ready ${frame.sessionId}${frame.resumed ? ' (resumed)' : ''}`);
    this.player?.setRecordedLineBaseUrl(frame.recordedLineBaseUrl);
    this.patch({
      sessionId: frame.sessionId,
      secondsLeft: frame.secondsLeft,
      connected: true,
      reconnecting: false,
    });
  }

  private onFrame(frame: CallServerFrame): void {
    const player = this.player;
    const needsPlayer =
      frame.type === 'say_start' ||
      frame.type === 'alignment' ||
      frame.type === 'say_end' ||
      frame.type === 'play_rec';
    if (needsPlayer && !player) {
      this.early.push(frame);
      return;
    }
    switch (frame.type) {
      case 'say_start':
        player?.startLive(frame.streamId, frame.character, frame.codec, frame.sampleRateHz);
        break;
      case 'alignment':
        player?.pushAlignment(frame.streamId, frame.chars, frame.startMs, frame.endMs);
        break;
      case 'say_end':
        player?.endLive(frame.streamId);
        break;
      case 'play_rec':
        player?.playRecorded(frame.streamId, frame.lineId, frame.character);
        break;
      case 'partial':
        this.patch({ learnerText: frame.text, learnerFinal: false });
        break;
      case 'heard':
        this.patch({ learnerText: frame.text, learnerFinal: true, awaitingReply: true });
        break;
      case 'beat':
        this.patch({ beat: frame });
        break;
      case 'hint':
        this.patch({ hint: frame });
        break;
      case 'correction':
        this.patch({ correction: frame });
        break;
      case 'correction_resolved':
        this.patch({ correction: null });
        break;
      case 'meaning':
        this.patch({ meaning: frame });
        break;
      case 'minutes':
        this.patch({ secondsLeft: frame.secondsLeft, wrappingUp: frame.wrappingUp });
        break;
      case 'safety':
        this.patch({ safety: frame.kind, safetyResourcesKey: frame.resourcesKey });
        break;
      case 'thinking':
        this.patch({ serverThinking: frame.state === 'start' });
        break;
      case 'error':
        this.log(`error ${frame.code}${frame.fatal ? ' (fatal)' : ''}`);
        this.patch(frame.fatal ? { error: frame.code } : { warning: frame.code });
        if (frame.fatal && this.socket.status === 'closed') void this.teardown();
        break;
      case 'ended':
        if (this.hangupTimer) clearTimeout(this.hangupTimer);
        this.patch({
          endReason: frame.reason,
          summaryPending: frame.summaryPending,
          callRecordId: frame.callRecordId,
        });
        void this.teardown();
        break;
      case 'ready':
      case 'unknown':
        break;
    }
  }

  private onAudio(frame: AudioFrame): void {
    if (!this.player) {
      this.earlyAudio.push({ ...frame, payload: frame.payload.slice() });
      return;
    }
    this.player.pushAudio(frame.streamId, frame.seq, frame.payload);
  }

  private onLineScheduled(line: LineInfo, audibleMs: number): void {
    this.log(
      `${line.kind} line ${line.streamId} heard in ${Math.round(audibleMs - performance.now())} ms`,
    );
    const lag = this.meter.lineScheduled(line.streamId, line.kind, audibleMs);
    if (lag !== null) {
      this.log(`${line.kind} line ${line.streamId}: ${lag} ms after speech end`);
      this.state.set(
        withLatency(this.state.get(), { streamId: line.streamId, kind: line.kind, lagMs: lag }),
      );
    }
  }

  private onLineAudible(line: LineInfo): void {
    this.vad.setEchoGuard(true);
    const prev = this.state.get().caption;
    this.patch({
      playing: true,
      awaitingReply: false,
      serverThinking: false,
      caption: {
        streamId: line.streamId,
        character: line.character,
        source: line.kind,
        text:
          prev?.streamId === line.streamId ? prev.text : (this.captions.get(line.streamId) ?? ''),
      },
    });
  }

  private onCaption(line: LineInfo, text: string): void {
    this.captions.set(line.streamId, text);
    const cap = this.state.get().caption;
    if (cap?.streamId === line.streamId) this.patch({ caption: { ...cap, text } });
  }

  private onLineEnded(line: LineInfo, interrupted: boolean): void {
    this.log(`line ${line.streamId} ${interrupted ? 'interrupted' : 'ended'}`);
    this.captions.delete(line.streamId);
    if (line.streamId > LOCAL_STREAM_BASE) return;
    const played: OutgoingFrame = {
      type: 'played',
      streamId: line.streamId,
      interrupted,
      lagMs: this.meter.takeLag(line.streamId),
    };
    this.socket.send(played);
  }

  private async onSessionEvent(e: SessionEvent): Promise<void> {
    if (e.type === 'route') {
      this.log(`route change: ${e.reason}`);
      // The audio engine rebuilds itself on a new route (AirPods in or out); give it a moment,
      // then make sure the graph and the mic run on the new one.
      setTimeout(() => {
        if (this.disposed || !this.context) return;
        this.refreshLatency();
        void this.restartGraphIfStopped().then(() => this.mic?.ensureRunning());
      }, ROUTE_SETTLE_MS);
      return;
    }
    this.log(`interruption ${e.phase}`);
    if (e.phase === 'began') {
      this.turns.reset();
      this.player?.stopAll();
      this.patch({ interrupted: true, talkHeld: false, learnerSpeaking: false });
      return;
    }
    if (this.disposed || !this.context) return;
    try {
      await this.session.resume();
      // The engine stopped for the interruption while the graph still counts as running: start
      // it again by suspending and resuming the graph.
      await this.restartGraphIfStopped(true);
      if (this.mic) await this.mic.ensureRunning();
      this.refreshLatency();
    } catch (err) {
      this.log(`resume failed: ${String(err)}`);
    }
    this.patch({ interrupted: false });
  }

  private refreshLatency(): void {
    this.outputLatencyS = this.session.outputLatencySeconds();
  }

  private async teardown(): Promise<void> {
    this.stopSimulatedMic();
    if (this.hangupTimer) clearTimeout(this.hangupTimer);
    this.hangupTimer = null;
    this.socket.close();
    await this.stopAudio();
  }

  private patch(p: Partial<CallState>): void {
    this.state.set(update(this.state.get(), p));
  }

  private log(message: string): void {
    this.options.onLog?.(message);
  }
}
