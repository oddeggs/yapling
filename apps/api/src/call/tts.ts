import type { CharacterId } from '@yapling/contracts';

import { AlignmentMapper, BreakInserter, withoutTags, type MappedAlignment } from './phrase-breaks';
import { closeQuietly, fromBase64, openSocket, TTS_SAMPLE_RATE, ttsUrl } from './upstream';
import { voiceFor } from './voices';

/*
 * One generated line on ElevenLabs Flash v2.5 stream-input: text in at word boundaries, PCM16 at
 * 24 kHz and character alignment out. Phrase breaks are added for slow stages and mapped back out
 * of the alignment, whose times are made relative to the line's first sample.
 */

const BYTES_PER_MS = (TTS_SAMPLE_RATE * 2) / 1_000;

export interface TtsVoice {
  readonly character: CharacterId;
  readonly speed: number;
  /** Seconds between phrases, or null. */
  readonly breakSeconds: number | null;
  /** A line not in English (Linh's Vietnamese): the language Flash must speak it in. */
  readonly language?: 'vi';
}

export const voiceKey = (v: TtsVoice): string =>
  `${voiceFor(v.character)}|${v.speed}|${v.language ?? 'en'}`;

export interface TtsHandlers {
  audio(pcm: Uint8Array, alignment: MappedAlignment | null): void;
  done(): void;
  failed(detail: string): void;
}

interface FlashMessage {
  readonly audio?: string | null;
  readonly alignment?: {
    readonly chars?: string[];
    readonly charStartTimesMs?: number[];
    readonly charDurationsMs?: number[];
  } | null;
  readonly isFinal?: boolean | null;
  readonly error?: string;
  readonly message?: string;
}

/** An open Flash socket, before it is given its line. */
export async function openTts(key: string, voice: TtsVoice): Promise<WebSocket> {
  const ws = await openSocket(ttsUrl(voiceFor(voice.character), voice.language ?? null), key);
  ws.send(
    JSON.stringify({
      text: ' ',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: voice.speed },
      generation_config: { chunk_length_schedule: [50, 120, 160, 250] },
    }),
  );
  return ws;
}

export class TtsLine {
  private readonly breaks: BreakInserter;
  private readonly mapper = new AlignmentMapper();
  private carry: Uint8Array | null = null;
  private flushed = false;
  private finished = false;
  /** Audio received so far. */
  audioMs = 0;
  /** Characters sent (billed). */
  chars = 0;
  firstAudioAt: number | null = null;

  constructor(
    private readonly ws: WebSocket,
    voice: TtsVoice,
    private readonly handlers: TtsHandlers,
  ) {
    this.breaks = new BreakInserter(voice.breakSeconds);
    ws.addEventListener('message', (event) => this.onMessage(event.data));
    ws.addEventListener('close', (event) => {
      if (this.finished) return;
      this.finished = true;
      if (event.code !== 1000) handlers.failed(`closed ${event.code}`);
      else handlers.done();
    });
  }

  /**
   * Sends whole words. The first push is flushed once a clause ends or about four words are in,
   * so audio starts early.
   */
  push(words: string): void {
    if (words === '' || this.finished) return;
    const piece = this.breaks.push(words);
    this.mapper.addText(withoutTags(piece));
    this.chars += piece.length;
    const flush = !this.flushed && (/[.!?,;:]\s$/.test(words) || this.chars >= 20);
    if (flush) this.flushed = true;
    this.send(flush ? { text: piece, flush: true } : { text: piece });
  }

  /** No more text: Flash generates the rest and ends. */
  end(): void {
    this.send({ text: '' });
  }

  abort(): void {
    this.finished = true;
    closeQuietly(this.ws, 'aborted');
  }

  private send(frame: object): void {
    try {
      this.ws.send(JSON.stringify(frame));
    } catch (error) {
      if (!this.finished) {
        this.finished = true;
        this.handlers.failed(String(error));
      }
    }
  }

  private onMessage(data: unknown): void {
    if (this.finished || typeof data !== 'string') return;
    let msg: FlashMessage;
    try {
      msg = JSON.parse(data) as FlashMessage;
    } catch {
      return;
    }
    if (msg.audio) {
      this.firstAudioAt ??= Date.now();
      const offset = this.audioMs;
      let pcm = fromBase64(msg.audio);
      if (this.carry !== null) {
        const joined = new Uint8Array(this.carry.byteLength + pcm.byteLength);
        joined.set(this.carry);
        joined.set(pcm, this.carry.byteLength);
        pcm = joined;
        this.carry = null;
      }
      if (pcm.byteLength % 2 === 1) {
        this.carry = pcm.slice(-1);
        pcm = pcm.subarray(0, -1);
      }
      this.audioMs += pcm.byteLength / BYTES_PER_MS;
      const a = msg.alignment;
      const alignment =
        a?.chars && a.charStartTimesMs && a.charDurationsMs
          ? this.mapper.map(
              {
                chars: a.chars,
                charStartTimesMs: a.charStartTimesMs,
                charDurationsMs: a.charDurationsMs,
              },
              offset,
            )
          : null;
      this.handlers.audio(pcm, alignment);
    }
    if (msg.isFinal) {
      this.finished = true;
      this.handlers.done();
      closeQuietly(this.ws, 'done');
    } else if (!msg.audio && (msg.error || msg.message)) {
      this.finished = true;
      this.handlers.failed(String(msg.error ?? msg.message));
      closeQuietly(this.ws, 'failed');
    }
  }
}
