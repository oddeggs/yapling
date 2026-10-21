import { AUDIO } from '@yapling/contracts';
import { AudioRecorder } from 'react-native-audio-api';

import { MIC_FRAME_SAMPLES, MicFramer } from './framing';
import { StreamResampler } from './pcm';

/*
 * Mic capture: the recorder's callback on the shared audio engine, asked for 16 kHz mono in 20 ms
 * buffers. The native side converts from the hardware rate; if a device still hands us another
 * rate, the stream is resampled here. Every buffer becomes exact 20 ms PCM16 frames.
 */

export interface MicFrameSink {
  /** One 20 ms frame; `endPerfMs` is `performance.now()` when its last sample was captured. */
  (frame: Int16Array, endPerfMs: number): void;
}

export class MicCapture {
  private recorder: AudioRecorder | null = null;
  private readonly framer = new MicFramer();
  private resampler: StreamResampler | null = null;
  private running = false;
  /** The rate the device actually delivers. */
  deliveredRateHz = 0;

  constructor(
    private readonly sink: MicFrameSink,
    private readonly onError: (message: string) => void,
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<boolean> {
    if (this.running) return true;
    const recorder = this.recorder ?? new AudioRecorder();
    this.recorder = recorder;
    recorder.onError((e) => this.onError(e.message));
    const set = recorder.onAudioReady(
      {
        sampleRate: AUDIO.micSampleRateHz,
        bufferLength: MIC_FRAME_SAMPLES,
        channelCount: AUDIO.micChannels,
      },
      (event) => {
        const now = performance.now();
        const buffer = event.buffer;
        const rate = buffer.sampleRate;
        this.deliveredRateHz = rate;
        let samples = buffer.getChannelData(0);
        if (rate !== AUDIO.micSampleRateHz) {
          if (this.resampler?.fromHz !== rate) {
            this.resampler = new StreamResampler(rate, AUDIO.micSampleRateHz);
          }
          samples = this.resampler.process(samples) as Float32Array<ArrayBuffer>;
        }
        const frames = this.framer.push(samples);
        // The newest frame ends now; earlier ones in the same buffer ended 20 ms apart.
        frames.forEach((frame, i) => this.sink(frame, now - (frames.length - 1 - i) * 20));
      },
    );
    if (set.status === 'error') {
      this.onError(set.message);
      return false;
    }
    const started = await recorder.start();
    if (started.status === 'error') {
      this.onError(started.message);
      return false;
    }
    this.running = true;
    return true;
  }

  /** Restarts capture after an interruption or a route change rebuilt the engine. */
  async ensureRunning(): Promise<boolean> {
    if (this.recorder?.isRecording() && !this.recorder.isPaused()) return true;
    if (this.recorder?.isPaused()) {
      this.recorder.resume();
      return true;
    }
    this.running = false;
    return this.start();
  }

  async stop(): Promise<void> {
    const r = this.recorder;
    this.running = false;
    this.framer.reset();
    if (!r) return;
    r.clearOnAudioReady();
    r.clearOnError();
    if (r.isRecording()) await r.stop();
  }
}
