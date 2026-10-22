import {
  LIMITS,
  type AudioFrame,
  type CallServerFrame,
  type CharacterId,
  type MeaningSubject,
  type ReadyFrame,
  type TurnMode,
} from '@yapling/contracts';

import type { VoiceSessionStatus } from '../../modules/voice-session';
import { micPermissionStatus, type SessionEvent } from './audio-session';
import { CallAudio } from './call-audio';
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
import { CallPlayer, type LineInfo, type RecordedLineSource } from './player';
import { storyRecordedLines } from './recorded-lines';
import { ReplyWatcher } from './reply-watch';
import { SimulatedMic } from './simulated-mic';
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
  /** The clock mic presses are timed on (`performance.now` by default). */
  readonly now?: () => number;
}

export { storyRecordedLines } from './recorded-lines';

/** Streams the phone plays on its own are numbered above any the call uses. */
const LOCAL_STREAM_BASE = 0xffff_0000;

/** How long the engine takes to settle on a new route before the graph is checked. */
const ROUTE_SETTLE_MS = 300;

export class VoiceEngine {
  readonly state: Store<CallState>;
  readonly lipsync: Lipsync;
  private readonly socket: CallSocket;
  private readonly audio: CallAudio;
  private readonly vad = new Vad();
  private readonly turns: TurnTaker;
  private readonly meter = new LatencyMeter();
  private player: CallPlayer | null = null;
  private readonly simulated = new SimulatedMic({
    frame: (frame, endMs) => this.onMicFrame(frame, endMs, 'simulated'),
    press: () => this.pressTalk(),
    release: () => this.releaseTalk(),
  });
  private disposed = false;
  private hangupTimer: ReturnType<typeof setTimeout> | null = null;
  private interruptionHold: ReturnType<typeof setInterval> | null = null;
  private readonly replies = new ReplyWatcher(() => {
    this.log('no answer to the turn: the learner tries again');
    this.giveTurnBack(true);
  });
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
    this.audio = new CallAudio({
      voiceProcessing: options.voiceProcessing ?? true,
      onMicFrame: (frame, endMs) => this.onMicFrame(frame, endMs, 'device'),
      onSessionEvent: (e) => void this.onSessionEvent(e),
      log: (m) => this.log(m),
    });
    this.turns = new TurnTaker(
      options.hello.turnMode,
      {
        sendMic: (pcm) => {
          // The call's mic clock: milliseconds of 16 kHz mic audio sent on this socket.
          if (this.socket.sendMic(pcm)) this.micSentMs += pcm.byteLength / 2 / 16;
        },
        endTurn: () => {
          this.socket.send({ type: 'end_turn' });
          this.replies.on({ type: 'turn_ended', atMs: Date.now() });
          this.patch({ awaitingReply: true });
        },
      },
      {
        ...(options.micChunkMs === undefined ? {} : { chunkMs: options.micChunkMs }),
        ...(options.now ? { now: options.now } : {}),
      },
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
    return this.audio.micRunning;
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
    const { context, status } = await this.audio.start();
    this.player ??= new CallPlayer({
      context,
      lipsync: this.lipsync,
      recorded: this.options.recorded ?? storyRecordedLines,
      outputLatency: () => this.audio.outputLatency,
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
    this.log(`audio up: ${this.debugAudio()}`);
    return status;
  }

  /** Lets go of the call's audio: the lines, the graph, the mic and (if still held) the session. */
  private async stopAudio(): Promise<void> {
    this.player?.dispose();
    this.player = null;
    await this.audio.stop();
  }

  /** Starts mic capture (after the learner grants the permission mid-call). */
  startMic(): Promise<boolean> {
    return this.audio.startMic();
  }

  /** Hold-to-talk: the mic button went down. */
  pressTalk(): void {
    if (this.turns.mode !== 'hold_to_talk') return;
    this.turns.press();
    this.replies.on({ type: 'settled' });
    this.patch({ talkHeld: true, awaitingReply: false, onHold: false, notice: null });
  }

  /**
   * Hold-to-talk: the mic button came up; `end_turn` follows once the learner stops. A tap too
   * short to be a turn sends nothing and shows the tip to hold while talking.
   */
  releaseTalk(): void {
    if (!this.turns.isHeld) return;
    const speaking = this.vad.speaking;
    if (this.turns.release(speaking) === 'tap') {
      this.log('a tap, not a turn: nothing sent');
      this.patch({ talkHeld: false, notice: 'hold_longer' });
      return;
    }
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

  /**
   * The app is back in the foreground (a live call keeps running in the background, but iOS may
   * have dropped the socket or stopped the engine meanwhile): reconnect a dead socket at once and
   * start the audio again if it stopped.
   */
  async foregrounded(): Promise<void> {
    if (this.disposed || this.state.get().endReason !== null) return;
    if (this.socket.checkAlive()) this.log('socket died in the background: reconnecting');
    await this.audio.recheck();
  }

  /** Releases everything (the call screen unmounted). */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.teardown();
  }

  /** The session's current route and voice-processing state. */
  sessionStatus(): VoiceSessionStatus | null {
    return this.audio.status();
  }

  /**
   * Dev only: plays 16 kHz mono samples into the mic path at real time (VAD, turn-taking, the
   * socket) in place of the device mic, then quiet room noise until `stopSimulatedMic`.
   */
  simulateMic(samples: Float32Array, holdToTalk = false): Promise<void> {
    return this.simulated.play(samples, holdToTalk);
  }

  stopSimulatedMic(): void {
    this.simulated.stop();
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
    return `${this.audio.debug()} · ${this.player?.debug() || 'no lines'}`;
  }

  /** Dev only: runs the interruption path as if iOS had sent it. */
  simulateInterruption(phase: 'began' | 'ended'): Promise<void> {
    return this.onSessionEvent({ type: 'interruption', phase, shouldResume: true });
  }

  private onMicFrame(frame: Int16Array, endMs: number, source: 'device' | 'simulated'): void {
    if (source === 'device' && this.simulated.running) return;
    const s = this.state.get();
    if (s.interrupted || s.endReason) return;
    const r = this.vad.push(frame, endMs - MIC_FRAME_MS);
    if (r.event?.type === 'speech_start') {
      this.meter.speechStarted();
      if (this.turns.mode === 'hands_free' || this.turns.isHeld) {
        this.replies.on({ type: 'settled' });
        this.patch({ learnerSpeaking: true, awaitingReply: false, onHold: false, notice: null });
      } else {
        // Hold-to-talk with the button up: nothing is sent, so nothing is answered or cleared.
        this.patch({ learnerSpeaking: true });
      }
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
        // The call replays its beat when the socket is back: what was playing or awaited on the
        // old socket will never finish, so nothing waits on it.
        this.turns.reset();
        this.player?.stopAll();
        this.replies.on({ type: 'settled' });
        this.patch({
          connected: false,
          reconnecting: true,
          awaitingReply: false,
          serverThinking: false,
          talkHeld: false,
          learnerSpeaking: false,
        });
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
      case 'not_heard':
        // No real words in the turn: nothing is coming, the turn is the learner's again.
        this.log('not heard: no words in the turn');
        this.replies.on({ type: 'settled' });
        this.patch({ awaitingReply: false, serverThinking: false, notice: 'not_heard' });
        break;
      case 'heard':
        this.replies.on({ type: 'answering', atMs: Date.now() });
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
        if (frame.state === 'start') this.replies.on({ type: 'answering', atMs: Date.now() });
        this.patch({ serverThinking: frame.state === 'start' });
        break;
      case 'error':
        this.log(`error ${frame.code}${frame.fatal ? ' (fatal)' : ''}`);
        if (frame.fatal) {
          this.patch({ error: frame.code });
          if (this.socket.status === 'closed') void this.teardown();
        } else {
          // A reply (or the listening) failed: the turn is the learner's again.
          this.patch({ warning: frame.code });
          this.giveTurnBack();
        }
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

  /** No answer is coming for the learner's turn: "didn't catch that", and their turn again. */
  private giveTurnBack(overdue = false): void {
    const s = this.state.get();
    const waited = overdue || this.replies.waiting || s.awaitingReply || s.serverThinking;
    this.replies.on({ type: 'settled' });
    if (!waited || s.endReason !== null) return;
    this.patch({ awaitingReply: false, serverThinking: false, notice: 'didnt_catch' });
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
    this.replies.on({ type: 'settled' });
    const prev = this.state.get().caption;
    this.patch({
      notice: null,
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
        if (!this.disposed) void this.audio.recheck();
      }, ROUTE_SETTLE_MS);
      return;
    }
    this.log(`interruption ${e.phase}`);
    if (e.phase === 'began') {
      this.turns.reset();
      this.player?.stopAll();
      // A phone call or Siri can take minutes: the call waits instead of hinting and nudging.
      this.socket.send({ type: 'hold', seconds: LIMITS.holdSecondsMax });
      this.patch({ interrupted: true, talkHeld: false, learnerSpeaking: false });
      this.interruptionHold = setInterval(
        () => this.socket.send({ type: 'hold', seconds: LIMITS.holdSecondsMax }),
        (LIMITS.holdSecondsMax - 5) * 1_000,
      );
      return;
    }
    if (this.interruptionHold) clearInterval(this.interruptionHold);
    this.interruptionHold = null;
    if (this.disposed) return;
    try {
      // The engine stopped for the interruption while the graph still counts as running.
      await this.audio.resumeAfterInterruption();
    } catch (err) {
      this.log(`resume failed: ${String(err)}`);
    }
    this.socket.send({ type: 'hold', seconds: 0 });
    this.patch({ interrupted: false, onHold: false });
  }

  private async teardown(): Promise<void> {
    this.stopSimulatedMic();
    if (this.interruptionHold) clearInterval(this.interruptionHold);
    this.interruptionHold = null;
    if (this.hangupTimer) clearTimeout(this.hangupTimer);
    this.hangupTimer = null;
    this.replies.on({ type: 'settled' });
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
