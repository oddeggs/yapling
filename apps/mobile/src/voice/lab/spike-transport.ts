import {
  AUDIO,
  decodeAudioFrame,
  encodeAudioFrame,
  PING,
  PONG,
  type CallServerFrame,
} from '@yapling/contracts';

import type { SocketLike } from '../call-socket';

/*
 * Dev lab only: lets the production call client talk to the voice spike Worker
 * (`spikes/voice`), whose frames are simpler. It looks like a WebSocket to the client and
 * translates both ways:
 *
 *   up:   `hello` stays here (the spike takes its token in the URL); mic frames lose the 12-byte
 *         header (the spike takes raw PCM16); `end_turn` and `hangup` pass; pings are answered here.
 *   down: `ready` → `ready`; `partial` → `partial`; `final` → `heard`; base64 `tts_audio` with
 *         chunk-relative alignment → `say_start`, binary `tts_pcm16` frames and stream-relative
 *         `alignment`; `turn_done` / `turn_aborted` → `say_end`.
 *
 * Never used by the production client.
 */

interface SpikeAlignment {
  readonly chars?: string[];
  readonly charStartTimesMs?: number[];
  readonly charDurationsMs?: number[];
}

/** The spike's frames, loosely: only the fields this adapter reads. */
interface SpikeFrame {
  readonly type: string;
  readonly text?: string;
  readonly turn?: number;
  readonly audio?: string;
  readonly alignment?: SpikeAlignment | null;
  readonly id?: string;
  readonly pip?: string;
  readonly where?: string;
  readonly detail?: string;
}

/** Spike TTS is ElevenLabs `pcm_24000`. */
const SPIKE_TTS_RATE = 24_000;
const BYTES_PER_MS = (SPIKE_TTS_RATE * AUDIO.bytesPerSample) / 1000;

interface SpikeStream {
  readonly streamId: number;
  offsetMs: number;
  text: string;
}

export class SpikeTransport implements SocketLike {
  binaryType = 'arraybuffer';
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code?: number; reason?: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  private readonly ws: WebSocket;
  private seq = 0;
  private helloSeen = false;
  private spikeReady = false;
  private readonly streams = new Map<number, SpikeStream>();

  constructor(
    url: string,
    private readonly log: (message: string) => void = () => undefined,
  ) {
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => this.onopen?.({});
    this.ws.onclose = (e) => this.onclose?.({ code: e.code, reason: e.reason });
    this.ws.onerror = (e) => this.onerror?.(e);
    this.ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      try {
        this.fromSpike(e.data);
      } catch (err) {
        this.log(`spike frame failed: ${String(err)}`);
      }
    };
  }

  get readyState(): number {
    return this.ws.readyState;
  }

  send(data: string | ArrayBuffer | ArrayBufferView): void {
    if (typeof data === 'string') {
      this.fromClient(data);
      return;
    }
    const bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const frame = decodeAudioFrame(bytes);
    if (frame.ok && frame.frame.kind === 'mic_pcm16') {
      this.ws.send(frame.frame.payload.slice().buffer);
    }
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }

  private fromClient(text: string): void {
    if (text === PING) {
      setTimeout(() => this.onmessage?.({ data: PONG }), 0);
      return;
    }
    const frame = JSON.parse(text) as { type: string };
    switch (frame.type) {
      case 'hello':
        this.helloSeen = true;
        if (this.spikeReady) this.emitReady();
        break;
      case 'end_turn':
      case 'hangup':
        this.ws.send(JSON.stringify({ type: frame.type }));
        break;
      default:
        // played, hold, hints and meanings have no spike equivalent.
        break;
    }
  }

  private fromSpike(text: string): void {
    const f = JSON.parse(text) as SpikeFrame;
    switch (f.type) {
      case 'ready':
        this.spikeReady = true;
        if (this.helloSeen) this.emitReady();
        break;
      case 'partial':
        this.emit({ type: 'partial', seq: this.nextSeq(), text: f.text ?? '' });
        break;
      case 'final':
        this.emit({
          type: 'heard',
          seq: this.nextSeq(),
          turn: (f.turn ?? 0) + 1,
          text: f.text ?? '',
          words: [],
        });
        break;
      case 'tts_audio':
        if (f.turn !== undefined && f.audio) this.ttsAudio(f.turn, f.audio, f.alignment ?? null);
        break;
      case 'turn_done':
      case 'turn_aborted':
        this.log(`spike ${f.type} ${f.turn ?? '?'}`);
        if (f.turn !== undefined) this.endStream(f.turn, f.pip ?? '');
        break;
      case 'play_rec':
        this.log(`spike reaction "${f.id ?? '?'}" (no bundled clip)`);
        break;
      case 'error': {
        const where = f.where ?? '';
        this.log(`spike error ${where}: ${f.detail ?? ''}`);
        const code = where.startsWith('stt')
          ? 'stt_failed'
          : where.startsWith('tts')
            ? 'tts_failed'
            : 'llm_failed';
        this.emit({ type: 'error', seq: this.nextSeq(), code, fatal: false });
        break;
      }
      default:
        break;
    }
  }

  private ttsAudio(turn: number, audio: string, a: SpikeAlignment | null): void {
    let stream = this.streams.get(turn);
    if (!stream) {
      stream = { streamId: turn + 1, offsetMs: 0, text: '' };
      this.streams.set(turn, stream);
      this.log(`spike reply audio for turn ${turn}`);
      this.emit({
        type: 'say_start',
        seq: this.nextSeq(),
        streamId: stream.streamId,
        character: 'pip',
        codec: 'pcm16',
        sampleRateHz: SPIKE_TTS_RATE,
      });
    }
    const offset = stream.offsetMs;
    const pcm = base64ToBytes(audio);
    const even = pcm.subarray(0, pcm.byteLength - (pcm.byteLength % 2));
    for (let at = 0; at < even.byteLength; at += AUDIO.ttsPayloadMaxBytes) {
      const payload = even.subarray(at, Math.min(even.byteLength, at + AUDIO.ttsPayloadMaxBytes));
      const bytes = encodeAudioFrame({
        kind: 'tts_pcm16',
        seq: this.nextSeq(),
        streamId: stream.streamId,
        payload,
      });
      this.onmessage?.({ data: bytes.buffer });
    }
    const starts = a?.charStartTimesMs;
    const durations = a?.charDurationsMs;
    if (a?.chars && a.chars.length > 0 && starts && durations) {
      stream.text += a.chars.join('');
      this.emit({
        type: 'alignment',
        seq: this.nextSeq(),
        streamId: stream.streamId,
        chars: a.chars,
        startMs: starts.map((t) => Math.round(offset + t)),
        endMs: starts.map((t, i) => Math.round(offset + t + (durations[i] ?? 0))),
      });
    }
    stream.offsetMs += even.byteLength / BYTES_PER_MS;
  }

  private endStream(turn: number, pip: string): void {
    const stream = this.streams.get(turn);
    if (!stream) return;
    this.streams.delete(turn);
    this.emit({
      type: 'say_end',
      seq: this.nextSeq(),
      streamId: stream.streamId,
      character: 'pip',
      text: pip.trim() || stream.text.trim() || '…',
    });
  }

  private emitReady(): void {
    this.emit({
      type: 'ready',
      seq: this.nextSeq(),
      sessionId: 'spike',
      secondsLeft: 600,
      recordedLineBaseUrl: null,
      resumeToken: 'spike-has-no-resume-token',
      resumed: false,
    });
  }

  private emit(frame: Exclude<CallServerFrame, { type: 'unknown' }>): void {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }

  private nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_INDEX = new Map(Array.from(B64, (c, i) => [c, i]));

/** Decodes standard base64 (padding optional). */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      ((B64_INDEX.get(clean[i] ?? 'A') ?? 0) << 18) |
      ((B64_INDEX.get(clean[i + 1] ?? 'A') ?? 0) << 12) |
      ((B64_INDEX.get(clean[i + 2] ?? 'A') ?? 0) << 6) |
      (B64_INDEX.get(clean[i + 3] ?? 'A') ?? 0);
    if (o < out.length) out[o++] = (n >> 16) & 0xff;
    if (o < out.length) out[o++] = (n >> 8) & 0xff;
    if (o < out.length) out[o++] = n & 0xff;
  }
  return out;
}
