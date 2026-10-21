import { requireOptionalNativeModule } from 'expo';

/** One audio port on the current route (`Speaker`, `BluetoothHFP`, `MicrophoneBuiltIn`…). */
export interface AudioPort {
  readonly type: string;
  readonly name: string;
}

/** The audio session and the call graph's engine as they are now. */
export interface VoiceSessionStatus {
  /** Voice processing was asked for. */
  readonly wanted: boolean;
  /** The engine factory hook is installed, so rebuilt engines keep voice processing. */
  readonly hooked: boolean;
  /** Echo cancellation is on for the engine that runs now. */
  readonly voiceProcessing: boolean;
  readonly category: string;
  readonly mode: string;
  readonly sampleRate: number;
  readonly ioBufferDuration: number;
  /** Seconds. */
  readonly inputLatency: number;
  /** Seconds. */
  readonly outputLatency: number;
  readonly inputs: readonly AudioPort[];
  readonly outputs: readonly AudioPort[];
  readonly engineExists: boolean;
  readonly engineRunning: boolean;
  readonly error?: string;
}

interface VoiceSessionNative {
  setVoiceProcessing(enabled: boolean): VoiceSessionStatus;
  status(): VoiceSessionStatus;
  setPreferredIOBufferDuration(seconds: number): number;
}

/** Null in Jest and on builds without the module. */
export const VoiceSession = requireOptionalNativeModule<VoiceSessionNative>('VoiceSession');
