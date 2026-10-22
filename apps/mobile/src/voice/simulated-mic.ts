import { MIC_FRAME_MS } from './framing';

/*
 * Dev only: recorded learner audio played into the call's mic path at real time, in 20 ms PCM16
 * frames with quiet room noise under it, for a simulator on a Mac with no microphone.
 */

export interface SimulatedMicHost {
  /** One 20 ms frame, as the device mic would deliver it. */
  frame(frame: Int16Array, endPerfMs: number): void;
  press(): void;
  release(): void;
}

export class SimulatedMic {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly host: SimulatedMicHost) {}

  get running(): boolean {
    return this.timer !== null;
  }

  /** Plays 16 kHz mono samples, then room noise until `stop`; resolves when the samples end. */
  play(samples: Float32Array, holdToTalk: boolean): Promise<void> {
    this.stop();
    const frame = (16_000 * MIC_FRAME_MS) / 1000;
    let at = 0;
    let next = performance.now();
    let resolve: () => void = () => undefined;
    const done = new Promise<void>((r) => (resolve = r));
    if (holdToTalk) this.host.press();
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
        this.host.frame(chunk, performance.now());
        if (at >= samples.length && at - frame < samples.length) {
          if (holdToTalk) this.host.release();
          resolve();
        }
      }
    };
    this.timer = setInterval(tick, 10);
    return done;
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
