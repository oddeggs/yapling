import { ARM_REST, type Act, type Channel } from './acts';
import { flow, hop, keepVolume, loop, seeded, seg, track, wave, type Keys } from './engine';

/**
 * The idle loop: every idle period divides it, so it closes without a seam. Each character starts
 * at its own point of it (`seed`), so critters side by side never breathe or blink together.
 */
export const IDLE_PERIOD = 24_000;

/** The idle wave periods (ms); each divides `IDLE_PERIOD`. */
export const IDLE_WAVES = {
  breath: 3000,
  weight: 6000,
  tilt: 4800,
  yaw: 8000,
  tail: 4000,
  tail2: 2400,
  ear: 3000,
  ear2: 2000,
  arm: 3000,
  arm2: 2000,
  elbow: 2400,
} as const;

/** Blinks every 3–4 s (one double), each on a glance; the glances glide and hold. */
const blinkAt = (at: number): Keys => [
  [at, 0],
  [at + 110, 1],
  [at + 150, 1],
  [at + 340, 0, 'out'],
];
export const IDLE_FACE: { readonly lid: Keys; readonly lookX: Keys; readonly lookY: Keys } = {
  lid: [
    [0, 0],
    ...blinkAt(3250),
    ...blinkAt(7000),
    ...blinkAt(11150),
    ...blinkAt(14800),
    ...blinkAt(15250),
    ...blinkAt(18150),
    ...blinkAt(21600),
    [IDLE_PERIOD, 0],
  ],
  lookX: [
    [0, 0],
    [3200, 0],
    [3700, -2.5],
    [5400, -2.5],
    [5900, 0],
    [11100, 0],
    [11600, 2],
    [13300, 2],
    [13800, 0],
    [18100, 0],
    [18600, -1.2],
    [19900, -1.2],
    [20400, 0],
    [IDLE_PERIOD, 0],
  ],
  lookY: [
    [0, 0],
    [11100, 0],
    [11600, -1.5],
    [13300, -1.5],
    [13800, 0],
    [IDLE_PERIOD, 0],
  ],
};

/** Follow-through: a child reads its parent this much earlier (ms), at this strength. */
export const FOLLOW = {
  ears: [90, 0.45],
  tail: [120, 0.5],
  arms: [90, 0.45],
  head: [110, 0.45],
} as const;

/**
 * Every act is at rest this long before its end: longer than any chain of follow-through delays
 * (an ear reads the head, which reads the lean, 200 ms back).
 */
export const SETTLE_MS = 250;

/** A whole critter's pose at one moment: every channel the drawing reads. */
export interface Pose {
  /** Height above the floor and the body's scale about the feet (rig units). */
  lift: number;
  sx: number;
  sy: number;
  /** The bean leaning about the feet, and the head tilting about the eyes (degrees, clockwise). */
  lean: number;
  tilt: number;
  /** The head turn, −1 to 1: the face slides toward it, the ears and tail the other way. */
  yaw: number;
  /** Rotations about each part's joint (degrees, clockwise on screen). */
  tail: number;
  earL: number;
  earR: number;
  footL: number;
  footR: number;
  /** Arms: shoulder angle and elbow bend (degrees), and the paw's lag at the wrist. */
  armLa: number;
  armLe: number;
  armRa: number;
  armRe: number;
  wristL: number;
  wristR: number;
  browL: number;
  browR: number;
  /** The live face: pupil offset (rig units), lids 0 open to 1 shut, cheek 0 to 1. */
  lookX: number;
  lookY: number;
  lidL: number;
  lidR: number;
  cheek: number;
  /** The floor shadow's scale (it shrinks as the critter rises). */
  shadow: number;
}

const clamp01 = (v: number) => {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

/**
 * The pose at idle time `t` (the loop clock) and act time `a` (the act's one-shot clock), turned
 * toward `side` (1 or −1). Every channel is its act's key pose (`flow`), plus idle waves that never
 * stop while the critter is on screen, plus follow-through (the parent read earlier), plus accents.
 * `seed` (0–1) puts each character at its own point of the idle loop.
 */
export function poseAt(t: number, a: number, act: Act, side: number, seed: number): Pose {
  'worklet';
  const k = act.keys;
  const ph = seed;
  const it = t + seed * IDLE_PERIOD;
  const accent = (channel: Channel, at: number) => {
    let v = 0;
    const list = act.accents;
    if (!list) return 0;
    for (let i = 0; i < list.length; i++) {
      const x = list[i];
      if (!x || x.channel !== channel) continue;
      const env = seg(at, x.from, x.from + 220) * (1 - seg(at, x.to - 220, x.to));
      v += x.amp * env * wave(at - x.from, x.period, x.phase ?? 0);
    }
    return v;
  };
  const ch = (channel: Channel, at: number, rest = 0) => {
    const rows = k[channel];
    return (rows ? flow(at, rows) : rest) + accent(channel, at);
  };
  const W = IDLE_WAVES;
  const leanAt = (at: number, ti: number) => ch('lean', at) * side + 0.8 * wave(ti, W.weight, ph);
  const tiltOwn = (at: number, ti: number) =>
    ch('tilt', at) * side + 1.6 * wave(ti, W.tilt, ph + 0.3);
  const liftAt = (at: number) =>
    (act.hop ? hop(at, act.hop[0], act.hop[1], act.hop[2]) : 0) + ch('lift', at);
  // Counter-motion: the head rights itself a beat after the body leans.
  const [hd, hs] = FOLLOW.head;
  const tiltAt = (at: number, ti: number) => tiltOwn(at, ti) - hs * ch('lean', at - hd) * side;
  const lean = leanAt(a, t);
  const tilt = tiltAt(a, t);
  const lift = liftAt(a);
  const sy = 1 + ch('squash', a) + 0.012 * wave(t, W.breath, ph + 0.15);

  // Ears and tail trail the body: what they hang from, read earlier.
  const [ed, es] = FOLLOW.ears;
  const parent = (at: number, ti: number) => leanAt(at, ti) + tiltAt(at, ti);
  const earLag = es * (parent(a - ed, t - ed) - parent(a, t));
  const earDrop = 0.35 * (lift - liftAt(a - ed));
  const ears = ch('ears', a);
  const [td, ts] = FOLLOW.tail;
  const tail =
    ch('tail', a) +
    5 * wave(t, W.tail, ph + 0.5) +
    2 * wave(t, W.tail2, ph + 0.8) +
    ts * (leanAt(a - td, t - td) - lean) +
    0.3 * (lift - liftAt(a - td));

  // Arms: the shoulder, the elbow lagging the shoulder, the paw lagging the forearm.
  const [ad, as] = FOLLOW.arms;
  const shoulder = (name: 'armLa' | 'armRa', at: number, ti: number, p: number, s: number) =>
    ch(name, at, ARM_REST.a) +
    3 * wave(ti, W.arm, p) +
    1.5 * wave(ti, W.arm2, p + 0.3) +
    s * as * (leanAt(at - ad, ti - ad) - leanAt(at, ti)) +
    0.25 * (liftAt(at - ad) - liftAt(at));
  const elbow = (name: 'armLe' | 'armRe', at: number, ti: number, p: number) =>
    ch(name, at, ARM_REST.e) + 3 * wave(ti, W.elbow, p + 0.6);
  const arm = (sa: 'armLa' | 'armRa', se: 'armLe' | 'armRe', p: number, s: number) => {
    const sh = shoulder(sa, a, t, p, s);
    const shEarly = shoulder(sa, a - ad, t - ad, p, s);
    const el = elbow(se, a, t, p) + as * (shEarly - sh);
    const fore = sh + el;
    const foreEarly = shEarly + elbow(se, a - ad, t - ad, p);
    return { sh, el, wrist: as * (foreEarly - fore) };
  };
  const L = arm('armLa', 'armLe', ph + 0.1, -1);
  const R = arm('armRa', 'armRe', ph + 0.55, 1);

  // The live face: idle blinks and glances on the loop, the act's on top; pupils lead a turn.
  const face = act.face;
  const yawAt = (at: number, ti: number) => ch('yaw', at) * side + 0.04 * wave(ti, W.yaw, ph + 0.7);
  const ft = it % IDLE_PERIOD;
  const lid = clamp01(track(ft, IDLE_FACE.lid) + (face?.lid ? track(a, face.lid) : 0));
  const lookX =
    track(ft, IDLE_FACE.lookX) +
    (face?.lookX ? track(a, face.lookX) : 0) * side +
    4 * yawAt(a + 120, t + 120);
  const lookY = track(ft, IDLE_FACE.lookY) + (face?.lookY ? track(a, face.lookY) : 0);
  const inAir = Math.min(1, lift / 20);

  return {
    lift,
    sx: keepVolume(sy),
    sy,
    lean,
    tilt,
    yaw: yawAt(a, t),
    tail,
    earL: -(ears + earDrop + 2 * wave(t, W.ear, ph + 0.2)) + earLag,
    earR: ears + earDrop + 2 * wave(t, W.ear, ph + 0.57) + wave(t, W.ear2, ph) + earLag,
    footL: 18 * inAir + 3 * inAir * wave(a, 900, 0),
    footR: -18 * inAir + 3 * inAir * wave(a, 900, 0.5),
    armLa: L.sh,
    armLe: L.el,
    armRa: R.sh,
    armRe: R.el,
    wristL: L.wrist,
    wristR: R.wrist,
    browL: ch('browL', a),
    browR: ch('browR', a),
    lookX,
    lookY,
    lidL: lid,
    lidR: lid,
    cheek: face?.cheek ? clamp01(track(a, face.cheek)) : 0,
    shadow: Math.max(0.55, 1 - lift / 120),
  };
}

/** Where idle time loops back (the loop clock's period) and a seed per character. */
export function seedOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return seeded(h % 997);
}

/** Progress of the idle loop, 0 to 1 (for tests and contact sheets). */
export const idleProgress = (t: number) => loop(t, IDLE_PERIOD);
