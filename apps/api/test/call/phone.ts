import {
  CallServerFrame,
  decodeAudioFrame,
  encodeAudioFrame,
  PROTOCOL_VERSION,
  type HelloFrame,
} from '@yapling/contracts';
import { exports } from 'cloudflare:workers';
import { expect } from 'vitest';

/*
 * A phone on the call socket, as the app drives it: `hello` first, mic audio in 100 ms binary
 * chunks, and `played` back for every line once its audio has arrived. Every frame the call sends
 * is checked against the contracts.
 */

type Frame = Exclude<CallServerFrame, { type: 'unknown' }>;
type FrameOf<T extends Frame['type']> = Extract<Frame, { type: T }>;

/** PCM16 at 16 kHz: a tone (voiced) or near silence. */
export function pcm(ms: number, voiced: boolean): Uint8Array {
  const samples = Math.round(ms * 16);
  const out = new Uint8Array(samples * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples; i++) {
    view.setInt16(i * 2, voiced ? Math.round(3_000 * Math.sin(i / 5)) : (i % 7) - 3, true);
  }
  return out;
}

export class Phone {
  readonly frames: Frame[] = [];
  readonly audioBytes = new Map<number, number>();
  /** Answer `played` automatically when a line's audio is in. */
  autoPlay = true;
  /** Hold `played` back for these streams. */
  readonly withhold = new Set<number>();
  closed = false;
  private seq = 0;
  private waiters: (() => void)[] = [];

  private constructor(readonly ws: WebSocket) {
    ws.addEventListener('message', (event) => this.onMessage(event.data as string | ArrayBuffer));
    ws.addEventListener('close', () => {
      this.closed = true;
      this.poke();
    });
  }

  static async open(): Promise<Phone> {
    const response = await exports.default.fetch('https://api.yapling.test/api/calls/socket', {
      headers: { Upgrade: 'websocket' },
    });
    expect(response.status).toBe(101);
    const ws = response.webSocket;
    if (!ws) throw new Error('no socket');
    ws.accept();
    ws.binaryType = 'arraybuffer';
    return new Phone(ws);
  }

  static async call(token: string, hello: Partial<HelloFrame> = {}): Promise<Phone> {
    const phone = await Phone.open();
    phone.send({
      type: 'hello',
      protocol: PROTOCOL_VERSION,
      token,
      kind: 'episode',
      sceneId: 's1-e1',
      stage: 'newcomer',
      firstLanguage: 'vi',
      clientVersion: '1.0.0',
      turnMode: 'hands_free',
      resumeToken: null,
      ...hello,
    });
    return phone;
  }

  send(frame: Record<string, unknown>): void {
    this.seq += 1;
    this.ws.send(JSON.stringify({ ...frame, seq: this.seq }));
  }

  /** Mic audio in 100 ms chunks. */
  mic(audio: Uint8Array): void {
    for (let i = 0; i < audio.byteLength; i += 3_200) {
      this.seq += 1;
      const payload = audio.subarray(i, Math.min(audio.byteLength, i + 3_200));
      this.ws.send(encodeAudioFrame({ kind: 'mic_pcm16', seq: this.seq, streamId: 0, payload }));
    }
  }

  silence(ms: number): void {
    this.mic(pcm(ms, false));
  }

  /** Says a turn: voiced audio for its length, then enough silence for the call to answer. */
  speak(ms = 1_200, after = 900): void {
    this.mic(pcm(ms, true));
    this.silence(after);
  }

  of<T extends Frame['type']>(type: T): FrameOf<T>[] {
    return this.frames.filter((f): f is FrameOf<T> => f.type === type);
  }

  /** Waits for a frame, from the `from`-th frame on. */
  async next<T extends Frame['type']>(
    type: T,
    match: (f: FrameOf<T>) => boolean = () => true,
    { from = 0, timeoutMs = 8_000 }: { from?: number; timeoutMs?: number } = {},
  ): Promise<FrameOf<T>> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const found = this.frames
        .slice(from)
        .find((f): f is FrameOf<T> => f.type === type && match(f as FrameOf<T>));
      if (found) return found;
      if (this.closed) throw new Error(`closed before ${type}: ${this.summary()}`);
      const left = deadline - Date.now();
      if (left <= 0) throw new Error(`no ${type} within ${timeoutMs} ms: ${this.summary()}`);
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, Math.min(left, 200));
        this.waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  /** The frame types received, in order, for failure messages. */
  summary(): string {
    return this.frames.map((f) => (f.type === 'beat' ? `beat:${f.beatId}` : f.type)).join(' ');
  }

  played(streamId: number, lagMs: number | null = null): void {
    this.send({ type: 'played', streamId, interrupted: false, lagMs });
  }

  close(): void {
    this.ws.close(1000, 'bye');
  }

  private onMessage(data: string | ArrayBuffer): void {
    if (typeof data !== 'string') {
      const decoded = decodeAudioFrame(data);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        const { streamId, payload } = decoded.frame;
        this.audioBytes.set(streamId, (this.audioBytes.get(streamId) ?? 0) + payload.byteLength);
      }
      return;
    }
    if (data === 'pong') return;
    const parsed = CallServerFrame.safeParse(JSON.parse(data));
    expect(parsed.success, `bad frame ${data.slice(0, 300)}`).toBe(true);
    if (!parsed.success || parsed.data.type === 'unknown') return;
    const frame = parsed.data;
    this.frames.push(frame);
    if (this.autoPlay && (frame.type === 'say_end' || frame.type === 'play_rec')) {
      if (!this.withhold.has(frame.streamId)) this.played(frame.streamId, 900);
    }
    this.poke();
  }

  private poke(): void {
    for (const wake of this.waiters.splice(0)) wake();
  }
}
