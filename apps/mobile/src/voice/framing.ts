import { AUDIO, encodeAudioFrame } from '@yapling/contracts';

import { floatToPcm16, pcm16ToBytes } from './pcm';

/** The mic frame the VAD and the sender work in: 20 ms of 16 kHz mono. */
export const MIC_FRAME_MS = 20;
export const MIC_FRAME_SAMPLES = (AUDIO.micSampleRateHz * MIC_FRAME_MS) / 1000;

/**
 * Mic audio goes up in 20 ms chunks, the size the call's endpointing was measured with (the
 * contract's 100 ms recommendation would add about 40 ms to every turn on average).
 */
export const DEFAULT_MIC_CHUNK_MS = 20;

/** Cuts float samples at 16 kHz, in buffers of any length, into exact 20 ms PCM16 frames. */
export class MicFramer {
  private buf = new Float32Array(MIC_FRAME_SAMPLES);
  private fill = 0;

  push(samples: Float32Array): Int16Array[] {
    const frames: Int16Array[] = [];
    let i = 0;
    while (i < samples.length) {
      const take = Math.min(MIC_FRAME_SAMPLES - this.fill, samples.length - i);
      this.buf.set(samples.subarray(i, i + take), this.fill);
      this.fill += take;
      i += take;
      if (this.fill === MIC_FRAME_SAMPLES) {
        frames.push(floatToPcm16(this.buf));
        this.fill = 0;
      }
    }
    return frames;
  }

  reset(): void {
    this.fill = 0;
  }
}

/** Joins 20 ms frames into the chunk size the socket sends. */
export class MicChunker {
  private readonly framesPerChunk: number;
  private frames: Int16Array[] = [];

  constructor(chunkMs: number = DEFAULT_MIC_CHUNK_MS) {
    this.framesPerChunk = Math.max(1, Math.round(chunkMs / MIC_FRAME_MS));
  }

  /** Adds a frame; returns a full chunk's PCM16 bytes when one is ready. */
  push(frame: Int16Array): Uint8Array | null {
    this.frames.push(frame);
    return this.frames.length >= this.framesPerChunk ? this.flush() : null;
  }

  /** The frames held so far as one chunk (for the end of a held turn), or null when empty. */
  flush(): Uint8Array | null {
    if (this.frames.length === 0) return null;
    const total = this.frames.reduce((n, f) => n + f.length, 0);
    const joined = new Int16Array(total);
    let at = 0;
    for (const f of this.frames) {
      joined.set(f, at);
      at += f.length;
    }
    this.frames = [];
    return pcm16ToBytes(joined);
  }

  clear(): void {
    this.frames = [];
  }
}

/**
 * The sender's frame counter: JSON and binary frames share it, from 1 on each socket. Wraps
 * nothing: a call never sends 4 billion frames.
 */
export class SeqCounter {
  private last = 0;

  next(): number {
    this.last += 1;
    return this.last;
  }

  reset(): void {
    this.last = 0;
  }
}

/** A mic chunk as a binary call frame: the 12-byte header, then PCM16. */
export function micFrame(seq: number, pcm: Uint8Array): Uint8Array {
  return encodeAudioFrame({ kind: 'mic_pcm16', seq, streamId: 0, payload: pcm });
}
