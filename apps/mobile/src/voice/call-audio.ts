import { AudioContext } from 'react-native-audio-api';

import type { VoiceSessionStatus } from '../../modules/voice-session';
import { CallAudioSession, type SessionEvent } from './audio-session';
import { MicCapture, type MicFrameSink } from './mic';

/*
 * The call's audio graph and its lifecycle on the shared audio engine: the session, the playback
 * graph, echo cancellation and the mic, brought up in an order that survives whatever played
 * before (a story, the last call), and started again when the engine stops underneath (a failed
 * mic start, an interruption, a route change).
 */

export interface CallAudioOptions {
  /** Echo cancellation on the mic (off only to diagnose audio problems). */
  readonly voiceProcessing: boolean;
  readonly onMicFrame: MicFrameSink;
  readonly onSessionEvent: (event: SessionEvent) => void;
  readonly log: (message: string) => void;
}

/** The sample rate of the playback graph: the TTS rate, so live audio needs no resampling. */
export const PLAYBACK_RATE_HZ = 24_000;

export class CallAudio {
  private readonly session: CallAudioSession;
  private graph: AudioContext | null = null;
  private mic: MicCapture | null = null;
  private latencyS = 0.02;

  constructor(private readonly options: CallAudioOptions) {
    this.session = new CallAudioSession(options.onSessionEvent);
  }

  /** The playback graph while the audio is up. */
  get context(): AudioContext | null {
    return this.graph;
  }

  get micRunning(): boolean {
    return this.mic?.isRunning ?? false;
  }

  /** The rate the mic delivers (0 before its first buffer). */
  get micRateHz(): number {
    return this.mic?.deliveredRateHz ?? 0;
  }

  /** Seconds from a sample leaving the graph to it being heard. */
  get outputLatency(): number {
    return this.latencyS;
  }

  /**
   * Brings the audio up: the session (taken over from whoever had it), the playback graph, then
   * echo cancellation. Voice processing goes on only once the graph runs, so the engine is rebuilt
   * for this session with it, never put on an engine an earlier player built for another session
   * category (which then refuses every node connected to it).
   */
  async start(): Promise<{ context: AudioContext; status: VoiceSessionStatus | null }> {
    await this.session.start();
    const context = new AudioContext({ sampleRate: PLAYBACK_RATE_HZ });
    this.graph = context;
    await context.resume();
    const status = this.session.enableVoiceProcessing(this.options.voiceProcessing);
    this.refreshLatency();
    return { context, status };
  }

  /** Starts mic capture (at the start, or after the learner grants the permission mid-call). */
  async startMic(): Promise<boolean> {
    this.mic ??= new MicCapture(this.options.onMicFrame, (m) => this.options.log(`mic: ${m}`));
    const ok = await this.mic.start();
    this.options.log(`mic ${ok ? 'on' : 'failed'} at ${this.mic.deliveredRateHz || '?'} Hz`);
    // A failed mic start stops the engine; character audio must still play.
    if (!ok) await this.restartIfStopped();
    return ok;
  }

  /** Lets go of the graph, the mic and (when the call still holds it) the session. */
  async stop(): Promise<void> {
    const ctx = this.graph;
    this.graph = null;
    if (ctx) await ctx.close().catch(() => undefined);
    await this.mic?.stop().catch(() => undefined);
    this.mic = null;
    await this.session.stop();
  }

  /**
   * The engine can stop while the graph still counts as running: suspending and resuming the
   * graph starts it again. `force` restarts without asking the engine (after an interruption,
   * when the engine stopped but may still report its old state).
   */
  async restartIfStopped(force = false): Promise<void> {
    const ctx = this.graph;
    if (!ctx) return;
    const status = this.session.status();
    if (!force && (status === null || status.engineRunning)) return;
    this.options.log('audio engine stopped: restarting the graph');
    await ctx.suspend().catch(() => undefined);
    await ctx.resume().catch(() => undefined);
  }

  /** A phone call or Siri gave the audio back: the session, the engine and the mic again. */
  async resumeAfterInterruption(): Promise<void> {
    if (!this.graph) return;
    await this.session.resume();
    await this.restartIfStopped(true);
    if (this.mic) await this.mic.ensureRunning();
    this.refreshLatency();
  }

  /**
   * After the route changed (AirPods in or out) or the app came back to the foreground: the
   * latency again, and the engine and the mic started if they stopped.
   */
  async recheck(): Promise<void> {
    if (!this.graph) return;
    this.refreshLatency();
    await this.restartIfStopped();
    await this.mic?.ensureRunning();
  }

  status(): VoiceSessionStatus | null {
    return this.session.status();
  }

  /** Dev only: the audio clock and the session. */
  debug(): string {
    const c = this.graph;
    return `ctx ${c ? `${c.currentTime.toFixed(2)} ${c.state}` : 'none'} · ${JSON.stringify(this.session.status() ?? {})}`;
  }

  private refreshLatency(): void {
    this.latencyS = this.session.outputLatencySeconds();
  }
}
