import { describe, expect, it } from 'vitest';

import { ACT_NAMES, ACTS, ARM_REST, type ActName } from './acts';
import { REST_POSE } from './draw';
import { actIndex, actTime, FADE_MS, livePose, startAct, type LiveState } from './live';
import { NO_TUNE, poseAt, SETTLE_MS, type Pose, type PoseOptions } from './pose';
import { raisedPaws, RIG_MOODS, usesRig } from './support';
import { tuneOf } from './tuning';

const SEED = 0.37;
const O: PoseOptions = {};
const CHANNELS = Object.keys(REST_POSE) as (keyof Pose)[];

function expectClose(a: Pose, b: Pose, tolerance: number, what: string) {
  for (const k of CHANNELS) {
    expect(Math.abs(a[k] - b[k]), `${what}: ${k} ${a[k]} vs ${b[k]}`).toBeLessThanOrEqual(
      tolerance,
    );
  }
}

const request = (act: ActName, side = 1, turn = 1) => ({ act: actIndex(act), side, turn });

describe('the acts', () => {
  it('are idle, listen, think, hop and wave; listen and think hold, hop and wave play once', () => {
    expect([...ACT_NAMES]).toEqual(['idle', 'listen', 'think', 'hop', 'wave']);
    expect(ACTS.listen.hold).toBeDefined();
    expect(ACTS.think.hold).toBeDefined();
    expect(ACTS.hop.hold).toBeUndefined();
    expect(ACTS.wave.hold).toBeUndefined();
  });

  it('a one-shot act plays once and then stays at its end, at rest under the idle', () => {
    const hop = ACTS.hop;
    expect(actTime(hop, 500)).toBe(500);
    expect(actTime(hop, 60_000)).toBe(60_000);
    const later = poseAt(1000, actTime(hop, 60_000), hop, 1, SEED);
    const idle = poseAt(1000, 0, ACTS.idle, 1, SEED);
    expectClose(later, idle, 1e-9, 'hop long after');
  });

  it.each(['listen', 'think'] as const)(
    '%s loops its hold window for as long as it is asked for, without a seam',
    (name) => {
      const act = ACTS[name];
      const [from, to] = act.hold ?? [0, 0];
      expect(to).toBeLessThanOrEqual(act.duration - SETTLE_MS);
      // Inside the window time runs on; past it, it wraps round to the window's start.
      expect(actTime(act, from + 10)).toBe(from + 10);
      expect(actTime(act, to + 25)).toBeCloseTo(from + 25, 9);
      expect(actTime(act, to + 3 * (to - from) + 25)).toBeCloseTo(from + 25, 9);
      for (let k = 0; k < 6; k++) expect(actTime(act, 12_345 * k)).toBeLessThanOrEqual(to);
      // The pose just before the wrap and just after it: one frame apart, so nearly the same.
      for (const side of [1, -1]) {
        const t = 7777;
        const before = poseAt(t, to - 1, act, side, SEED);
        const after = poseAt(t, from + 1, act, side, SEED);
        const still = poseAt(t, to, act, side, SEED);
        expectClose(before, still, 0.01, `${name} before the wrap`);
        expectClose(after, still, 0.01, `${name} after the wrap`);
      }
    },
  );
});

describe('switching acts', () => {
  it('a critter that has just appeared is at rest, exactly the generator’s drawing', () => {
    const s = startAct(null, request('idle'), 0, SEED, O);
    expectClose(livePose(s, 0, SEED, O), REST_POSE, 1e-9, 'first frame');
    // Its idle fades in, and is all there once the fade is over.
    const t = FADE_MS + 40;
    expectClose(livePose(s, t, SEED, O), poseAt(t, t, ACTS.idle, 1, SEED), 1e-9, 'faded in');
  });

  it('never jumps: from any act at any moment to any other, toward either side', () => {
    const at = [0, 130, 470, 990, 1700, 2600, 5100, 9000];
    for (const from of ACT_NAMES) {
      for (const to of ACT_NAMES) {
        for (const t0 of at) {
          let s: LiveState = startAct(null, request(from, 1, 1), 0, SEED, O);
          const now = 2000 + t0;
          const shown = livePose(s, now, SEED, O);
          s = startAct(s, request(to, -1, 2), now, SEED, O);
          // The same pose on the frame it switches, and only a frame's worth of motion next.
          expectClose(livePose(s, now, SEED, O), shown, 1e-9, `${from}→${to} at ${t0}`);
          const next = livePose(s, now + 16.7, SEED, O);
          const angles: (keyof Pose)[] = ['lean', 'tilt', 'tail', 'earL', 'earR', 'armRa'];
          for (const k of angles)
            expect(Math.abs(next[k] - shown[k]), `${from}→${to} at ${t0}: ${k}`).toBeLessThan(4);
          // Once the fade is over only the new act is left.
          const end = now + FADE_MS + 1;
          const own = poseAt(end, end - now, ACTS[to], -1, SEED);
          expectClose(livePose(s, end, SEED, O), own, 1e-9, `${from}→${to} settled`);
        }
      }
    }
  });

  it('asking for the same act again plays it again (another hop)', () => {
    let s = startAct(null, request('hop', 1, 1), 0, SEED, O);
    s = startAct(s, request('hop', 1, 2), 5000, SEED, O);
    expect(s.start).toBe(5000);
    const top = 5000 + 670;
    expect(livePose(s, top, SEED, O).lift).toBeGreaterThan(40);
  });
});

describe('the pose options', () => {
  it('a raised paw stays where the mood drew it while the other arm acts', () => {
    const o: PoseOptions = { raised: [false, true] };
    for (const a of [470, 870, 1000]) {
      const p = poseAt(0, a, ACTS.hop, 1, 0, o);
      const idle = poseAt(0, a, ACTS.idle, 1, 0, o);
      // Only the hop's follow-through moves it (a few degrees), not the arm's keys (tens).
      expect(Math.abs(p.armRa - idle.armRa)).toBeLessThan(8);
      expect(Math.abs(p.armLa - ARM_REST.a)).toBeGreaterThan(10);
    }
    // A raised paw still takes the wave's accent (it waves from where it is).
    const waving = poseAt(0, 1200, ACTS.wave, 1, 0, o);
    const resting = poseAt(0, 1200, ACTS.idle, 1, 0, o);
    expect(waving.armRe).not.toBeCloseTo(resting.armRe, 1);
  });

  it('tuning scales a species’ motion, and the talking bob only moves while it talks', () => {
    const half: PoseOptions = { tune: { ...NO_TUNE, hop: 0.5 } };
    expect(poseAt(0, 670, ACTS.hop, 1, 0, half).lift).toBeCloseTo(22, 6);
    expect(tuneOf('redpanda')).toEqual(NO_TUNE);
    const quiet = poseAt(1000, 0, ACTS.idle, 1, 0, { talk: 0 });
    const talking = poseAt(1000, 0, ACTS.idle, 1, 0, { talk: 1 });
    expect(talking.tilt).not.toBeCloseTo(quiet.tilt, 3);
    expect(talking.lean).toBe(quiet.lean);
  });
});

describe('which critters the rig moves', () => {
  it('every mood but arcs of joy and paws held to the face', () => {
    expect([...RIG_MOODS].sort()).toEqual(
      [
        'happy',
        'excited',
        'surprised',
        'confused',
        'listen',
        'proud',
        'worried',
        'sleepy',
        'patient',
        'wave',
      ].sort(),
    );
    for (const mood of ['laugh', 'warm', 'shy', 'think'] as const)
      expect(usesRig(mood)).toBe(false);
    expect(usesRig('happy')).toBe(true);
  });

  it('knows a raised paw from where the generator put it', () => {
    // A box half the generator's: the floor at 113, a paw at rest 21 above it, one waving 59.
    const ground = { x: 50, y: 113 };
    const paws = [
      { x: 23, y: 92 },
      { x: 77, y: 54 },
    ] as const;
    expect(raisedPaws(ground, paws, 0.5)).toEqual([false, true]);
  });
});
