/*
 * PCM helpers: float samples (-1…1) to signed 16-bit little-endian and back, and a streaming
 * resampler for when a device hands us another rate than the one we need.
 */

/** Float samples to PCM16, clamped and rounded. */
export function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0));
    out[i] = Math.round(s < 0 ? s * 0x8000 : s * 0x7fff);
  }
  return out;
}

/** PCM16 bytes (little-endian, as on the wire) to float samples. */
export function pcm16BytesToFloat(bytes: Uint8Array): Float32Array {
  const samples = bytes.byteLength >> 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, samples * 2);
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

/** PCM16 samples as wire bytes (little-endian, which is also every iPhone's native order). */
export function pcm16ToBytes(samples: Int16Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, samples[i] ?? 0, true);
  return out;
}

/** RMS level of float samples in dBFS (silence floors at -120). */
export function levelDb(samples: Float32Array | Int16Array): number {
  if (samples.length === 0) return -120;
  const scale = samples instanceof Int16Array ? 1 / 0x8000 : 1;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] ?? 0) * scale;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / samples.length);
  return rms > 1e-6 ? 20 * Math.log10(rms) : -120;
}

/**
 * Streaming linear resampler. Keeps its phase across calls, so chunks of any size join without
 * clicks. Downsampling first averages over the rate ratio, a cheap anti-alias filter that is plenty
 * for speech going to a recogniser.
 */
export class StreamResampler {
  readonly ratio: number;
  /** Position of the next output sample, in input samples, relative to the start of `pending`. */
  private pos = 0;
  /** The input samples still needed for interpolation (the tail of the last chunk). */
  private pending = new Float32Array(0);
  private readonly smooth: number;
  private smoothTail = new Float32Array(0);

  constructor(
    readonly fromHz: number,
    readonly toHz: number,
  ) {
    if (!(fromHz > 0 && toHz > 0)) throw new RangeError('Sample rates must be positive');
    this.ratio = fromHz / toHz;
    this.smooth = this.ratio > 1 ? Math.max(1, Math.round(this.ratio)) : 1;
  }

  /** Resamples the next chunk; may return a few samples fewer or more than `length / ratio`. */
  process(input: Float32Array): Float32Array {
    if (this.fromHz === this.toHz) return input;
    const filtered = this.smooth > 1 ? this.boxFilter(input) : input;
    const src = new Float32Array(this.pending.length + filtered.length);
    src.set(this.pending, 0);
    src.set(filtered, this.pending.length);

    const count = Math.max(0, Math.floor((src.length - 1 - this.pos) / this.ratio) + 1);
    const out = new Float32Array(src.length >= 2 ? count : 0);
    let pos = this.pos;
    for (let i = 0; i < out.length; i++) {
      const k = Math.floor(pos);
      const frac = pos - k;
      const a = src[k] ?? 0;
      const b = src[k + 1] ?? a;
      out[i] = a + (b - a) * frac;
      pos += this.ratio;
    }
    // Keep the sample the next output interpolates from.
    const keepFrom = Math.min(Math.floor(pos), src.length);
    const keep = Math.max(0, Math.min(keepFrom, src.length - 1));
    this.pending = src.slice(keep);
    this.pos = pos - keep;
    return out;
  }

  /** A moving average over `smooth` samples, continuing across chunks. */
  private boxFilter(input: Float32Array): Float32Array {
    const n = this.smooth;
    const joined = new Float32Array(this.smoothTail.length + input.length);
    joined.set(this.smoothTail, 0);
    joined.set(input, this.smoothTail.length);
    const out = new Float32Array(input.length);
    const offset = this.smoothTail.length;
    for (let i = 0; i < input.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i + offset - n + 1; j <= i + offset; j++) {
        if (j >= 0) {
          sum += joined[j] ?? 0;
          count++;
        }
      }
      out[i] = sum / count;
    }
    this.smoothTail = joined.slice(Math.max(0, joined.length - (n - 1)));
    return out;
  }
}

/** Resamples one whole clip (not streaming). */
export function resampleClip(input: Float32Array, fromHz: number, toHz: number): Float32Array {
  if (fromHz === toHz) return input;
  const r = new StreamResampler(fromHz, toHz);
  return r.process(input);
}
