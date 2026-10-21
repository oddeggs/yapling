import { describe, expect, it } from '@jest/globals';
import { AUDIO_HEADER_BYTES, decodeAudioFrame } from '@yapling/contracts';

import {
  MIC_FRAME_SAMPLES,
  MicChunker,
  MicFramer,
  SeqCounter,
  micFrame,
} from '../../src/voice/framing';
import { floatToPcm16, pcm16BytesToFloat, pcm16ToBytes } from '../../src/voice/pcm';

describe('mic framing', () => {
  it('cuts buffers of any length into exact 20 ms frames, keeping the remainder', () => {
    const framer = new MicFramer();
    const ramp = Float32Array.from({ length: 1000 }, (_, i) => (i % 100) / 100);
    const frames = [
      ...framer.push(ramp.subarray(0, 123)),
      ...framer.push(ramp.subarray(123, 700)),
      ...framer.push(ramp.subarray(700)),
    ];
    expect(MIC_FRAME_SAMPLES).toBe(320);
    expect(frames).toHaveLength(3);
    expect(frames.every((f) => f.length === 320)).toBe(true);
    // Samples come out in order across the buffer seams.
    const joined = frames.flatMap((f) => Array.from(f));
    expect(joined).toEqual(Array.from(floatToPcm16(ramp.subarray(0, 960))));
  });

  it('joins frames into chunks and flushes a partial chunk at the end of a turn', () => {
    const chunker = new MicChunker(100);
    const frame = new Int16Array(320).fill(7);
    const out = [1, 2, 3, 4, 5, 6, 7].map(() => chunker.push(frame));
    expect(out.slice(0, 4).every((c) => c === null)).toBe(true);
    expect(out[4]?.byteLength).toBe(3200);
    expect(chunker.flush()?.byteLength).toBe(1280);
    expect(chunker.flush()).toBeNull();
  });

  it('sends mic chunks with the contract header on stream 0', () => {
    const pcm = pcm16ToBytes(Int16Array.from([1, -2, 32767, -32768]));
    const bytes = micFrame(42, pcm);
    expect(bytes.byteLength).toBe(AUDIO_HEADER_BYTES + 8);
    const decoded = decodeAudioFrame(bytes);
    expect(decoded.ok && decoded.frame).toMatchObject({ kind: 'mic_pcm16', seq: 42, streamId: 0 });
    if (decoded.ok) expect(Array.from(decoded.frame.payload)).toEqual(Array.from(pcm));
  });

  it('numbers frames from 1 and starts over on a new socket', () => {
    const seq = new SeqCounter();
    expect([seq.next(), seq.next(), seq.next()]).toEqual([1, 2, 3]);
    seq.reset();
    expect(seq.next()).toBe(1);
  });
});

describe('PCM16', () => {
  it('clamps and rounds floats, little-endian on the wire', () => {
    expect(Array.from(floatToPcm16(Float32Array.from([0, 1, -1, 2, -2, 0.5])))).toEqual([
      0, 32767, -32768, 32767, -32768, 16384,
    ]);
    const bytes = pcm16ToBytes(Int16Array.from([0x0102]));
    expect(Array.from(bytes)).toEqual([0x02, 0x01]);
  });

  it('reads wire bytes back to floats, from an offset view', () => {
    const backing = new Uint8Array(6);
    backing.set(pcm16ToBytes(Int16Array.from([16384, -32768])), 2);
    const floats = pcm16BytesToFloat(backing.subarray(2));
    expect(Array.from(floats)).toEqual([0.5, -1]);
  });
});
