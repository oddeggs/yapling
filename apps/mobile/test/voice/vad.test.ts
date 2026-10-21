import { describe, expect, it } from '@jest/globals';

import { Vad, type VadEvent } from '../../src/voice/vad';

/** A 20 ms frame of noise at about `db` dBFS (RMS). */
let seed = 1;
const noiseFrame = (db: number) => {
  const amp = 10 ** (db / 20) * Math.sqrt(3);
  return Float32Array.from({ length: 320 }, () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return ((seed / 0x7fffffff) * 2 - 1) * amp;
  });
};

/** Runs frames given as dB levels; returns the events with their times. */
const run = (vad: Vad, levels: number[], startMs = 0) => {
  const events: VadEvent[] = [];
  levels.forEach((db, i) => {
    const r = vad.push(noiseFrame(db), startMs + i * 20);
    if (r.event) events.push(r.event);
  });
  return events;
};

const repeat = (db: number, frames: number) => Array.from({ length: frames }, () => db);

describe('the voice activity detector', () => {
  it('stays quiet in room noise', () => {
    const vad = new Vad();
    expect(run(vad, repeat(-62, 200))).toEqual([]);
    expect(vad.speaking).toBe(false);
  });

  it('starts speech at the first voiced frame after three in a row, and ends it at the last', () => {
    const vad = new Vad();
    const levels = [...repeat(-62, 50), ...repeat(-25, 40), ...repeat(-62, 30)];
    const events = run(vad, levels);
    expect(events).toEqual([
      { type: 'speech_start', atMs: 50 * 20 },
      { type: 'speech_end', atMs: 90 * 20 },
    ]);
  });

  it('ignores a single click', () => {
    const vad = new Vad();
    expect(run(vad, [...repeat(-62, 50), -20, -20, ...repeat(-62, 50)])).toEqual([]);
  });

  it('keeps speaking through a pause shorter than the hangover', () => {
    const vad = new Vad();
    const levels = [
      ...repeat(-62, 50),
      ...repeat(-25, 20),
      ...repeat(-62, 8), // 160 ms
      ...repeat(-25, 20),
      ...repeat(-62, 30),
    ];
    const events = run(vad, levels);
    expect(events.map((e) => e.type)).toEqual(['speech_start', 'speech_end']);
    expect(events[1]?.atMs).toBe((50 + 20 + 8 + 20) * 20);
  });

  it('holds speech through a softer stretch (hysteresis)', () => {
    const vad = new Vad();
    const levels = [...repeat(-62, 50), ...repeat(-30, 10), ...repeat(-48, 20), ...repeat(-62, 30)];
    const events = run(vad, levels);
    expect(events.map((e) => e.type)).toEqual(['speech_start', 'speech_end']);
    expect(events[1]?.atMs).toBe((50 + 10 + 20) * 20);
  });

  it('learns a steady noisy room and still hears speech above it', () => {
    const vad = new Vad();
    // A café at -40 dBFS for 10 s: the floor rises to it, so the noise is not speech.
    const cafe = run(vad, repeat(-40, 500));
    expect(cafe.filter((e) => e.type === 'speech_start').length).toBeLessThanOrEqual(1);
    expect(vad.speaking).toBe(false);
    expect(vad.noiseFloorDb).toBeGreaterThan(-45);
    const speech = run(vad, [...repeat(-20, 30), ...repeat(-40, 30)], 500 * 20);
    expect(speech.map((e) => e.type)).toEqual(['speech_start', 'speech_end']);
  });

  it('falls quickly to a quieter room', () => {
    const vad = new Vad();
    run(vad, repeat(-40, 500));
    run(vad, repeat(-65, 30), 10_000);
    expect(vad.noiseFloorDb).toBeLessThan(-60);
  });

  it('needs more energy while a character is speaking, so echo left over is not the learner', () => {
    const vad = new Vad();
    run(vad, repeat(-62, 50));
    vad.setEchoGuard(true);
    expect(run(vad, repeat(-46, 30), 1000)).toEqual([]);
    expect(run(vad, repeat(-25, 10), 1600).map((e) => e.type)).toEqual(['speech_start']);
  });

  it('can be ended at once when the mic button comes up', () => {
    const vad = new Vad();
    run(vad, [...repeat(-62, 50), ...repeat(-25, 10)]);
    expect(vad.forceEnd()).toEqual({ type: 'speech_end', atMs: 60 * 20 });
    expect(vad.forceEnd()).toBeNull();
  });
});
