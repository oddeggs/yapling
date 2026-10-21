import { describe, expect, it } from '@jest/globals';

import { levelDb, resampleClip, StreamResampler } from '../../src/voice/pcm';

const sine = (hz: number, rate: number, samples: number, amp = 0.5) =>
  Float32Array.from({ length: samples }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));

/** Zero crossings per second, an estimate of a sine's frequency. */
const frequency = (x: Float32Array, rate: number) => {
  let crossings = 0;
  for (let i = 1; i < x.length; i++) if ((x[i - 1] ?? 0) < 0 && (x[i] ?? 0) >= 0) crossings++;
  return (crossings * rate) / x.length;
};

describe('resampling', () => {
  it('turns 48 kHz into 16 kHz with the right length and pitch', () => {
    const input = sine(440, 48_000, 48_000);
    const out = resampleClip(input, 48_000, 16_000);
    expect(Math.abs(out.length - 16_000)).toBeLessThanOrEqual(2);
    expect(frequency(out, 16_000)).toBeCloseTo(440, -1);
    expect(levelDb(out)).toBeCloseTo(levelDb(input), 0);
  });

  it('turns 16 kHz into 24 kHz', () => {
    const out = resampleClip(sine(300, 16_000, 16_000), 16_000, 24_000);
    expect(Math.abs(out.length - 24_000)).toBeLessThanOrEqual(2);
    expect(frequency(out, 24_000)).toBeCloseTo(300, -1);
  });

  it('gives the same samples streamed in odd chunks as in one go', () => {
    const input = sine(220, 44_100, 9_000);
    const whole = new StreamResampler(44_100, 16_000).process(input);
    const r = new StreamResampler(44_100, 16_000);
    const parts: number[] = [];
    let at = 0;
    for (const size of [1, 7, 441, 1000, 3, 2048, 5500]) {
      parts.push(...r.process(input.subarray(at, at + size)));
      at += size;
    }
    expect(at).toBeGreaterThanOrEqual(input.length);
    expect(parts.length).toBe(whole.length);
    parts.forEach((v, i) => expect(v).toBeCloseTo(whole[i] ?? NaN, 5));
  });

  it('passes the same rate through untouched', () => {
    const input = sine(100, 16_000, 100);
    expect(new StreamResampler(16_000, 16_000).process(input)).toBe(input);
  });

  it('removes most of a tone above the new Nyquist when downsampling', () => {
    const high = sine(11_000, 48_000, 48_000);
    const out = resampleClip(high, 48_000, 16_000);
    expect(levelDb(out)).toBeLessThan(levelDb(high) - 6);
  });
});
