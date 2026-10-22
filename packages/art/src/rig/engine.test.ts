import { describe, expect, it } from 'vitest';

import { ACTS, ACT_NAMES } from './acts';
import {
  bell,
  flow,
  hop,
  keepVolume,
  loop,
  seeded,
  seg,
  track,
  wave,
  type FlowKeys,
} from './engine';
import { FOLLOW, IDLE_FACE, IDLE_PERIOD, IDLE_WAVES, poseAt, SETTLE_MS } from './pose';

const samples = (from: number, to: number, n = 400) =>
  Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);

describe('the motion engine', () => {
  it('flow passes through every key and never overshoots between two', () => {
    let s = 7;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let run = 0; run < 200; run++) {
      const keys: [number, number][] = [];
      let t = 0;
      for (let i = 0; i < 6; i++) {
        keys.push([t, Math.round((rand() - 0.5) * 40)]);
        t += 50 + rand() * 900;
      }
      for (const [kt, kv] of keys) expect(flow(kt, keys)).toBeCloseTo(kv, 9);
      for (let i = 0; i < keys.length - 1; i++) {
        const [t0, v0] = keys[i] as [number, number];
        const [t1, v1] = keys[i + 1] as [number, number];
        const lo = Math.min(v0, v1) - 1e-9;
        const hi = Math.max(v0, v1) + 1e-9;
        for (const x of samples(t0, t1, 50)) {
          const v = flow(x, keys);
          expect(v).toBeGreaterThanOrEqual(lo);
          expect(v).toBeLessThanOrEqual(hi);
        }
      }
    }
  });

  it('flow keeps moving through a chain of poses (no stop at a key between rising segments)', () => {
    const keys: FlowKeys = [
      [0, 0],
      [500, 10],
      [1000, 30],
    ];
    const speed = (flow(501, keys) - flow(499, keys)) / 2;
    expect(speed).toBeGreaterThan(0.02);
    // track, by contrast, stops at the key.
    const stop = (track(501, keys) - track(499, keys)) / 2;
    expect(Math.abs(stop)).toBeLessThan(0.001);
  });

  it('track eases between keys, holds outside them, and arrives with the out curve when asked', () => {
    const keys = [
      [0, 0],
      [100, 1],
      [300, 0, 'out'],
    ] as const;
    expect(track(-5, keys)).toBe(0);
    expect(track(50, keys)).toBeGreaterThan(0.4);
    expect(track(50, keys)).toBeLessThan(0.7);
    expect(track(400, keys)).toBe(0);
    // Arriving (ease-out) covers most of the way early.
    expect(track(140, keys)).toBeLessThan(0.5);
  });

  it('wave, loop, bell, seg, seeded and hop stay in range and are stable', () => {
    for (const t of samples(-3000, 30000)) {
      expect(Math.abs(wave(t, 1700, 0.3))).toBeLessThanOrEqual(1);
      const p = loop(t, 1700, 0.3);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
    expect(bell(0)).toBeCloseTo(0);
    expect(bell(0.5)).toBeCloseTo(1);
    expect(bell(1)).toBeCloseTo(0);
    expect(seg(0, 100, 200)).toBe(0);
    expect(seg(300, 100, 200)).toBe(1);
    expect(seeded(3)).toBe(seeded(3));
    expect(seeded(3)).not.toBe(seeded(4));
    expect(hop(400, 400, 940, 44)).toBe(0);
    expect(hop(670, 400, 940, 44)).toBeCloseTo(44);
    expect(hop(940, 400, 940, 44)).toBe(0);
  });

  it('keeps the volume when squashing (width = 1 / height^0.6)', () => {
    expect(keepVolume(1)).toBe(1);
    expect(keepVolume(0.82)).toBeCloseTo(1 / Math.pow(0.82, 0.6));
    expect(keepVolume(0.82)).toBeGreaterThan(1);
    expect(keepVolume(1.08)).toBeLessThan(1);
  });
});

describe('the loops close', () => {
  it('every idle wave divides the idle loop, so it wraps without a seam', () => {
    for (const period of Object.values(IDLE_WAVES)) {
      expect(IDLE_PERIOD % period).toBe(0);
      expect(wave(IDLE_PERIOD, period, 0.37)).toBeCloseTo(wave(0, period, 0.37), 9);
    }
    for (const keys of Object.values(IDLE_FACE)) {
      expect(keys[0]?.[1]).toBe(keys[keys.length - 1]?.[1]);
      expect(keys[keys.length - 1]?.[0]).toBe(IDLE_PERIOD);
    }
  });

  it('the idle pose is the same at both ends of the loop', () => {
    const a = poseAt(0, 0, ACTS.idle, 1, 0.4);
    const b = poseAt(IDLE_PERIOD, 0, ACTS.idle, 1, 0.4);
    for (const k of Object.keys(a) as (keyof typeof a)[]) expect(b[k]).toBeCloseTo(a[k], 6);
  });

  it.each(ACT_NAMES)('%s starts and ends at rest on every row, within its duration', (name) => {
    const act = ACTS[name];
    const rows = [...Object.entries(act.keys), ...Object.entries(act.face ?? {})];
    for (const [channel, keys] of rows) {
      const first = keys[0];
      const last = keys[keys.length - 1];
      expect(first?.[1], `${name}.${channel}`).toBe(last?.[1]);
      // At rest before the end by more than the longest follow-through delay: the clock holds at
      // the end, and a part reading its parent earlier must read rest too.
      expect(last?.[0], `${name}.${channel}`).toBeLessThanOrEqual(act.duration - SETTLE_MS);
      for (let i = 1; i < keys.length; i++)
        expect((keys[i]?.[0] ?? 0) >= (keys[i - 1]?.[0] ?? 0), `${name}.${channel} sorted`).toBe(
          true,
        );
    }
    // Same pose before the act and after it (only the idle layers differ, and they are equal here).
    const before = poseAt(1234, -1000, act, 1, 0.2);
    const after = poseAt(1234, act.duration, act, 1, 0.2);
    for (const k of Object.keys(before) as (keyof typeof before)[])
      expect(after[k], `${name}.${k}`).toBeCloseTo(before[k], 6);
  });
});

describe('follow-through by delay', () => {
  // An act that only leans: a step from 0 to 6 degrees over 300 ms, then holds.
  const lean = {
    name: 'listen' as const,
    duration: 3000,
    keys: {
      lean: [
        [0, 0],
        [1000, 0],
        [1300, 6],
        [3000, 6],
      ] as FlowKeys,
    },
  };
  const at = (a: number) => poseAt(0, a, lean, 1, 0);

  it('the ears and tail trail the lean by their delay, at their strength, and settle without overshoot', () => {
    const [ed, es] = FOLLOW.ears;
    const [td, ts] = FOLLOW.tail;
    // Before the lean starts nothing trails; once it has held for longer than the delay, nothing does.
    const rest = at(900);
    const held = at(1300 + 300);
    for (const t of [1100, 1200, 1250]) {
      const p = at(t);
      const own = flow(t, lean.keys.lean);
      const early = flow(t - ed, lean.keys.lean);
      // Ears hang from lean + head tilt, which itself rights itself a beat later.
      expect(p.earL - rest.earL).toBeLessThan(0);
      const tailLag = ts * (flow(t - td, lean.keys.lean) - own);
      expect(p.tail - rest.tail).toBeCloseTo(tailLag, 6);
      expect(Math.abs(es * (early - own))).toBeGreaterThan(0);
    }
    expect(held.tail).toBeCloseTo(rest.tail, 6);
    expect(held.earL).toBeCloseTo(rest.earL, 6);
    // The tail's lag never swings past rest the other way.
    for (const t of samples(900, 3000, 200))
      expect(at(t).tail - rest.tail).toBeLessThanOrEqual(1e-9);
  });

  it('the head rights itself a beat after the body leans (counter-motion, delayed)', () => {
    const [hd, hs] = FOLLOW.head;
    const t = 1300 + hd / 2;
    const p = at(t);
    const rest = at(900);
    expect(p.tilt - rest.tilt).toBeCloseTo(-hs * flow(t - hd, lean.keys.lean), 6);
    // The head's counter-tilt arrives later than the lean: at the lean's end it is not yet full.
    expect(Math.abs(at(1300).tilt - rest.tilt)).toBeLessThan(hs * 6);
    expect(at(1300 + hd + 50).tilt - rest.tilt).toBeCloseTo(-hs * 6, 6);
  });

  it('a paw lags the forearm (the wrist trails the elbow by the arms’ delay)', () => {
    const [ad] = FOLLOW.arms;
    const p = poseAt(0, 300, ACTS.wave, 1, 0);
    expect(p.wristR).not.toBe(0);
    // Once the wave holds still at its top (no accent yet), the wrist has caught up.
    const settled = poseAt(0, 520 + ad + 20, { ...ACTS.wave, accents: [] }, 1, 0);
    expect(Math.abs(settled.wristR)).toBeLessThan(Math.abs(p.wristR));
  });
});
