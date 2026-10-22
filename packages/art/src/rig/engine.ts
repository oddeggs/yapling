/*
 * The motion engine for living art: keyframe tracks and shaping helpers, all worklets, so a
 * critter's pose is computed on the UI thread from one clock's time.
 *
 * Ported from rossark-motion-skill (`templates/react-native/motion.ts`), with the theme's curves in
 * place of its own (`liveCurves`). The original is under the MIT licence:
 *
 *   Copyright (c) 2026 rossark0
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 *   and associated documentation files (the "Software"), to deal in the Software without
 *   restriction, including without limitation the rights to use, copy, modify, merge, publish,
 *   distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 *   Software is furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all copies or
 *   substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 *   BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 *   DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { bezierAt, liveCurves } from '@yapling/theme';

/**
 * A keyframe for `track`: time (ms), value, and the curve of the segment arriving here (`'out'`
 * for things that open or arrive, travel by default).
 */
export type Key = readonly [ms: number, value: number, curve?: 'out'];
export type Keys = readonly Key[];

/** A key pose for `flow`: time (ms) and value, sorted by time. */
export type FlowKey = readonly [ms: number, value: number];
export type FlowKeys = readonly FlowKey[];

/**
 * The value of a track at `t`. Each segment eases in and out (or out, marked `'out'`), so the
 * motion stops at every key: right for one move (a blink, a lid). The last key should equal the
 * first, so a loop never jumps.
 */
export function track(t: number, keys: Keys): number {
  'worklet';
  const first = keys[0];
  if (!first) return 0;
  if (t <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    const k0 = keys[i - 1];
    if (!k1 || !k0) break;
    if (t <= k1[0]) {
      const span = k1[0] - k0[0];
      const p = span > 0 ? (t - k0[0]) / span : 1;
      const e = bezierAt(k1[2] === 'out' ? liveCurves.arrive : liveCurves.travel, p);
      return k0[1] + (k1[1] - k0[1]) * e;
    }
  }
  const last = keys[keys.length - 1];
  return last ? last[1] : 0;
}

/**
 * A smooth track through key poses, for acting (a lean, an arm, a head turn). It passes through
 * every key with a continuous speed and never overshoots one (a monotone cubic, Fritsch–Butland
 * tangents), so a chain of poses reads as one motion, not stop-and-go. Repeat a value to hold, and
 * layer idle life on top of the hold.
 */
export function flow(t: number, k: FlowKeys): number {
  'worklet';
  const n = k.length;
  const first = k[0];
  const last = k[n - 1];
  if (!first || !last) return 0;
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  let i = 0;
  while (i < n - 2 && (k[i + 1] as FlowKey)[0] < t) i++;
  const at = (j: number) => k[j] as FlowKey;
  const slope = (j: number) => (at(j + 1)[1] - at(j)[1]) / (at(j + 1)[0] - at(j)[0]);
  const tangent = (j: number) => {
    if (j === 0 || j === n - 1) return 0;
    const a = slope(j - 1);
    const b = slope(j);
    if (a * b <= 0) return 0;
    const h0 = at(j)[0] - at(j - 1)[0];
    const h1 = at(j + 1)[0] - at(j)[0];
    const w0 = 2 * h1 + h0;
    const w1 = h1 + 2 * h0;
    return (w0 + w1) / (w0 / a + w1 / b);
  };
  const k0 = at(i);
  const k1 = at(i + 1);
  const h = k1[0] - k0[0];
  if (h <= 0) return k1[1];
  const s = (t - k0[0]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * k0[1] +
    (s3 - 2 * s2 + s) * h * tangent(i) +
    (-2 * s3 + 3 * s2) * k1[1] +
    (s3 - s2) * h * tangent(i + 1)
  );
}

/** 0 → 1 inside the window [a, b] of a clock (eased), 0 before it, 1 after: one beat of a scene. */
export function seg(t: number, a: number, b: number, curve: 'out' | 'travel' = 'out'): number {
  'worklet';
  if (t <= a) return 0;
  if (t >= b) return 1;
  return bezierAt(curve === 'out' ? liveCurves.arrive : liveCurves.travel, (t - a) / (b - a));
}

/** A smooth back-and-forth from −1 to 1; `phase` (0 to 1) offsets one part from the next. */
export function wave(t: number, period: number, phase = 0): number {
  'worklet';
  return Math.sin((t / period + phase) * Math.PI * 2);
}

/** Progress through a loop, 0 to 1, with a phase (drifting or falling things). */
export function loop(t: number, period: number, phase = 0): number {
  'worklet';
  const p = (t / period + phase) % 1;
  return p < 0 ? p + 1 : p;
}

/** 0 at both ends and 1 in the middle: fade in and out over `p` from 0 to 1. */
export function bell(p: number): number {
  'worklet';
  return Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
}

/** A stable pseudo-random number in [0, 1) for item `i`: variety that is the same every frame. */
export function seeded(i: number, salt = 0): number {
  'worklet';
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Height of a hop at `t`: 0 before take-off and after landing, a parabola between (gravity: it
 * leaves and lands at its fastest, and hangs at the top).
 */
export function hop(t: number, takeoff: number, land: number, height: number): number {
  'worklet';
  if (t <= takeoff || t >= land) return 0;
  const k = (2 * (t - takeoff)) / (land - takeoff) - 1;
  return height * (1 - k * k);
}

/** The width that keeps a body's volume when its height scales by `sy` (`1 / sy^0.6`). */
export function keepVolume(sy: number): number {
  'worklet';
  return 1 / Math.pow(Math.max(0.05, sy), 0.6);
}
