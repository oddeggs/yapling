import { AudioManager, type PermissionStatus } from 'react-native-audio-api';

import { VoiceSession, type VoiceSessionStatus } from '../../modules/voice-session';
import { claimAudio, ownsAudio, releaseAudio, type AudioClaim } from './audio-owner';

/*
 * The audio session for a live call: play and record, out of the speaker unless a headset or
 * Bluetooth device is connected, with Apple's voice processing (echo cancellation) on the mic so
 * the character's voice is never heard as the learner. Interruptions (a phone call, Siri, an
 * alarm) and route changes (AirPods in or out) are passed to the engine, which pauses and resumes.
 */

export type MicPermission = 'undetermined' | 'denied' | 'granted';

const toPermission = (s: PermissionStatus): MicPermission =>
  s === 'Granted' ? 'granted' : s === 'Denied' ? 'denied' : 'undetermined';

/** The mic permission now, without asking. */
export async function micPermissionStatus(): Promise<MicPermission> {
  return toPermission(await AudioManager.checkRecordingPermissions());
}

/**
 * Asks for the mic (iOS shows its prompt once; the call screen's pre-prompt comes first). After a
 * denial this only reports `denied`: the learner changes it in Settings.
 */
export async function requestMicPermission(): Promise<MicPermission> {
  return toPermission(await AudioManager.requestRecordingPermissions());
}

export type SessionEvent =
  | {
      readonly type: 'interruption';
      readonly phase: 'began' | 'ended';
      readonly shouldResume: boolean;
    }
  | { readonly type: 'route'; readonly reason: string };

/** The preferred hardware buffer: 10 ms keeps mic and playout latency low. */
const IO_BUFFER_SECONDS = 0.01;

export class CallAudioSession {
  private subs: { remove(): void }[] = [];
  private active = false;
  private claim: AudioClaim | null = null;

  constructor(
    private readonly onEvent: (event: SessionEvent) => void,
    /** Voice chat mode goes with echo cancellation; without it the session plays as media. */
    private readonly voiceChat = true,
  ) {}

  get isActive(): boolean {
    return this.active;
  }

  /**
   * Configures and activates the session for the call (play and record, speaker, Bluetooth) and
   * takes it over from whichever player had it. Voice processing comes later, once the call's
   * graph runs (`enableVoiceProcessing`).
   */
  async start(): Promise<void> {
    this.claim = claimAudio('call');
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: this.voiceChat ? 'voiceChat' : 'default',
      // HFP carries a headset's mic; when a device supports both, iOS prefers HFP for a call.
      iosOptions: ['defaultToSpeaker', 'allowBluetoothHFP', 'allowBluetoothA2DP'],
      iosAllowHaptics: true,
    });
    AudioManager.observeAudioInterruptions(true);
    this.subscribe();
    await AudioManager.setAudioSessionActivity(true);
    VoiceSession?.setPreferredIOBufferDuration(IO_BUFFER_SECONDS);
    this.active = true;
  }

  /**
   * Turns Apple's voice processing (echo cancellation) on or off for the call's graph. Call it
   * once the playback graph runs: the audio engine is then rebuilt with voice processing for this
   * session. Turning it on before that would put it on an engine left over from an earlier player,
   * built for another session category, which then refuses every node connected to it.
   */
  enableVoiceProcessing(on: boolean): VoiceSessionStatus | null {
    return VoiceSession?.setVoiceProcessing(on) ?? null;
  }

  /** Re-activates after an interruption ends. */
  async resume(): Promise<VoiceSessionStatus | null> {
    await AudioManager.setAudioSessionActivity(true);
    this.active = true;
    return this.status();
  }

  status(): VoiceSessionStatus | null {
    return VoiceSession?.status() ?? null;
  }

  /** Seconds from a sample leaving the graph to it being heard (output latency + one buffer). */
  outputLatencySeconds(): number {
    const s = this.status();
    return s ? s.outputLatency + s.ioBufferDuration : 0.02;
  }

  /** Whether the call still holds the session (no player set it up since). */
  get owned(): boolean {
    return ownsAudio(this.claim);
  }

  /**
   * Ends the call's session and gives other apps their audio back, unless another player has set
   * the session up since (the next call, a story): then it is theirs and stays as it is.
   */
  async stop(): Promise<void> {
    for (const sub of this.subs) sub.remove();
    this.subs = [];
    this.active = false;
    const claim = this.claim;
    this.claim = null;
    if (!releaseAudio(claim)) return;
    AudioManager.observeAudioInterruptions(false);
    VoiceSession?.setVoiceProcessing(false);
    try {
      await AudioManager.setAudioSessionActivity(false);
    } catch {
      // Deactivating while another player still runs fails harmlessly.
    }
  }

  private subscribe(): void {
    if (this.subs.length > 0) return;
    const interruption = AudioManager.addSystemEventListener('interruption', (e) => {
      this.onEvent({ type: 'interruption', phase: e.type, shouldResume: e.shouldResume });
    });
    const route = AudioManager.addSystemEventListener('routeChange', (e) => {
      this.onEvent({ type: 'route', reason: e.reason });
    });
    for (const sub of [interruption, route]) if (sub) this.subs.push(sub);
  }
}
