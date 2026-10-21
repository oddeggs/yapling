import { describe, expect, it } from '@jest/globals';

import { StreamPlayout } from '../../src/voice/playout';

const cfg = { prebufferMs: 120, leadMs: 30, maxWaitMs: 150 };
const chunk = (seq: number, durationMs = 100) => ({ seq, durationMs, data: `c${seq}` });

describe('the TTS jitter buffer', () => {
  it('holds audio until the prebuffer is full, then schedules chunks back to back', () => {
    const p = new StreamPlayout<string>(cfg);
    expect(p.push(chunk(3, 60), 10)).toEqual([]);
    const placed = p.push(chunk(5, 80), 10.01);
    expect(placed.map((c) => c.data)).toEqual(['c3', 'c5']);
    expect(placed[0]?.ctxStart).toBeCloseTo(10.04);
    expect(placed[1]?.ctxStart).toBeCloseTo(10.1);
    expect(placed.map((c) => c.streamMs)).toEqual([0, 60]);
    expect(p.endCtx).toBeCloseTo(10.18);
  });

  it('plays chunks in seq order even when they arrive out of order', () => {
    const p = new StreamPlayout<string>(cfg);
    p.push(chunk(9, 50), 0);
    const placed = p.push(chunk(4, 80), 0);
    expect(placed.map((c) => c.seq)).toEqual([4, 9]);
    expect(placed.map((c) => c.streamMs)).toEqual([0, 80]);
  });

  it('drops a chunk that arrives after a later one has been scheduled', () => {
    const p = new StreamPlayout<string>(cfg);
    p.push(chunk(10, 200), 0);
    expect(p.push(chunk(8), 0.05)).toEqual([]);
    expect(p.lateDrops).toBe(1);
  });

  it('starts anyway after the longest wait, or at once when the stream is complete', () => {
    const waiting = new StreamPlayout<string>(cfg);
    expect(waiting.push(chunk(1, 40), 1)).toEqual([]);
    expect(waiting.tick(1.1)).toEqual([]);
    expect(waiting.tick(1.16).map((c) => c.seq)).toEqual([1]);

    const short = new StreamPlayout<string>(cfg);
    expect(short.push(chunk(1, 40), 1)).toEqual([]);
    expect(short.finish(1.01).map((c) => c.seq)).toEqual([1]);
  });

  it('keeps a gap in the timeline when audio runs dry, and counts the underrun', () => {
    const p = new StreamPlayout<string>(cfg);
    p.push(chunk(1, 100), 0);
    p.push(chunk(2, 100), 0); // scheduled 0.03–0.23
    const late = p.push(chunk(3, 100), 0.5); // after its slot
    expect(late[0]?.ctxStart).toBeCloseTo(0.53);
    expect(late[0]?.streamMs).toBe(200);
    expect(p.underruns).toBe(1);
    expect(p.segments.map((s) => [s.seq, Math.round(s.ctxStart * 1000), s.streamMs])).toEqual([
      [1, 30, 0],
      [2, 130, 100],
      [3, 530, 200],
    ]);
  });

  it('waits for the line before it to finish', () => {
    const p = new StreamPlayout<string>(cfg);
    p.delayUntil(2);
    const placed = p.push(chunk(1, 200), 1);
    expect(placed[0]?.ctxStart).toBe(2);
  });
});
