import { AlignmentMapper } from './phrase-breaks';
import type { TtsHandlers, TtsVoice } from './tts';
import { fromBase64, TTS_SAMPLE_RATE, upstream } from './upstream';
import { voiceFor } from './voices';

/*
 * A live line in the cast's own voice model (ElevenLabs v4), one sentence at a time. Flash's
 * word-by-word stream restarts its intonation at every chunk seam, which is heard as glitches; a
 * whole sentence never has a seam inside it. Each sentence is requested as soon as it is written
 * (the next one generates while the one before plays), with the text before it as context, and its
 * audio is passed on in order. The first sentence may break at a clause so the voice starts early.
 */

export const LIVE_TTS_MODEL = 'eleven_v4';
const BYTES_PER_MS = (TTS_SAMPLE_RATE * 2) / 1_000;
/** A first clause at least this long is said on its own, so the voice starts sooner. */
const FIRST_CLAUSE_WORDS = 5;

/** The model's speed range; v4 stays clean when slowed, so beginners hear it slower. */
const SPEED = { min: 0.7, max: 1.2 } as const;

interface StreamChunk {
  readonly audio_base64?: string | null;
  readonly alignment?: {
    readonly characters?: string[];
    readonly character_start_times_seconds?: number[];
    readonly character_end_times_seconds?: number[];
  } | null;
}

/** What a live line needs from its voice, whichever way it is made. */
export interface LiveTts {
  readonly chars: number;
  readonly audioMs: number;
  push(words: string): void;
  end(): void;
  abort(): void;
}

export class SentenceTts implements LiveTts {
  private readonly mapper = new AlignmentMapper();
  private readonly ctrl = new AbortController();
  private pending = '';
  private said = '';
  private first = true;
  private ended = false;
  private finished = false;
  /** Each sentence's response, requested at once and played in order. */
  private chain: Promise<void> = Promise.resolve();
  chars = 0;
  audioMs = 0;

  constructor(
    private readonly key: string,
    private readonly voice: TtsVoice,
    private readonly handlers: TtsHandlers,
  ) {}

  push(words: string): void {
    if (words === '' || this.finished || this.ended) return;
    this.pending += words;
    const text = this.pending.trim();
    const n = text.split(/\s+/).length;
    const sentenceEnd = /[.!?…]["'”’)]*$/.test(text);
    const clauseEnd = this.first && n >= FIRST_CLAUSE_WORDS && /[,;:—]$/.test(text);
    if (sentenceEnd || clauseEnd) this.take();
  }

  end(): void {
    if (this.ended || this.finished) return;
    this.ended = true;
    if (this.pending.trim()) this.take();
    void this.chain.then(() => {
      if (this.finished) return;
      this.finished = true;
      this.handlers.done();
    });
  }

  abort(): void {
    this.finished = true;
    this.ctrl.abort();
  }

  /** The pending words become a sentence: requested now, played after the one before. */
  private take(): void {
    const text = this.pending.trim();
    this.pending = '';
    this.first = false;
    if (!text) return;
    const before = this.said;
    this.said = `${this.said} ${text}`.trim();
    this.chars += text.length;
    const response = this.request(text, before);
    this.chain = this.chain.then(async () => {
      if (this.finished) return;
      this.mapper.addText(`${before ? ' ' : ''}${text}`);
      await this.play(await response);
    });
    this.chain.catch((error: unknown) => {
      if (this.finished) return;
      this.finished = true;
      this.handlers.failed(String(error).slice(0, 200));
    });
  }

  private request(text: string, before: string): Promise<Response> {
    const speed = Math.min(
      SPEED.max,
      Math.max(SPEED.min, this.voice.naturalSpeed ?? this.voice.speed),
    );
    return upstream
      .fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceFor(this.voice.character)}/stream/with-timestamps?output_format=pcm_${TTS_SAMPLE_RATE}`,
        {
          method: 'POST',
          headers: { 'xi-api-key': this.key, 'content-type': 'application/json' },
          body: JSON.stringify({
            text,
            model_id: LIVE_TTS_MODEL,
            voice_settings: { speed },
            ...(before ? { previous_text: before.slice(-300) } : {}),
            ...(this.voice.language ? { language_code: this.voice.language } : {}),
          }),
          signal: this.ctrl.signal,
        },
      )
      .then((r) => {
        if (!r.ok || !r.body) throw new Error(`tts ${r.status}`);
        return r;
      });
  }

  /** Streams one sentence's audio out, its alignment on the line's own clock. */
  private async play(response: Response): Promise<void> {
    if (!response.body) throw new Error('tts: no body');
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    const offset = this.audioMs;
    let carry: Uint8Array | null = null;
    let buffer = '';
    const line = (text: string) => {
      if (!text.trim()) return;
      const chunk = JSON.parse(text) as StreamChunk;
      if (!chunk.audio_base64) return;
      let pcm = fromBase64(chunk.audio_base64);
      if (carry) {
        const joined = new Uint8Array(carry.byteLength + pcm.byteLength);
        joined.set(carry);
        joined.set(pcm, carry.byteLength);
        pcm = joined;
        carry = null;
      }
      if (pcm.byteLength % 2 === 1) {
        carry = pcm.slice(-1);
        pcm = pcm.subarray(0, -1);
      }
      const a = chunk.alignment;
      // Times are the sentence's own; the space before it is matched up by the mapper.
      const alignment =
        a?.characters && a.character_start_times_seconds && a.character_end_times_seconds
          ? this.mapper.map(
              {
                chars: a.characters,
                charStartTimesMs: a.character_start_times_seconds.map((t) => t * 1_000),
                charDurationsMs: a.character_start_times_seconds.map((t, i) =>
                  Math.max(0, ((a.character_end_times_seconds?.[i] ?? t) - t) * 1_000),
                ),
              },
              offset,
            )
          : null;
      this.audioMs += pcm.byteLength / BYTES_PER_MS;
      this.handlers.audio(pcm, alignment);
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (this.finished) {
        void reader.cancel();
        return;
      }
      if (value) buffer += value;
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        line(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
      if (done) {
        line(buffer);
        return;
      }
    }
  }
}
