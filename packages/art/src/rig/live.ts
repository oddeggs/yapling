import { ACT_NAMES, ACTS, type Act, type ActName } from './acts';
import { REST_POSE } from './draw';
import { seg } from './engine';
import { poseAt, type Pose, type PoseOptions } from './pose';

/**
 * A critter on screen over time: which act it plays, toward which side, since when, and how what
 * was on screen before fades into it. Asking for another act never jumps: the difference between
 * the pose on screen and the new act's first pose is added to the new act and fades out over
 * `FADE_MS` (the new act moves from the first frame, the old pose melts into it), so acts can be
 * switched at any moment, mid-hop or mid-wave, and in any order. All worklets; the component keeps
 * the state in a shared value and asks on the UI thread.
 */

/** How long what was on screen takes to melt into a new act (ms, ease in and out). */
export const FADE_MS = 520;

/** The acts by index (a request carries an index, so the UI thread needs no lookups by name). */
export const ACT_LIST: readonly Act[] = ACT_NAMES.map((n) => ACTS[n]);

export const actIndex = (name: ActName): number => ACT_NAMES.indexOf(name);

/** What the component asks for; a new `turn` starts the act again (the same act included). */
export interface ActRequest {
  readonly act: number;
  /** Toward the speaker: 1 the viewer's right, −1 the left. */
  readonly side: number;
  readonly turn: number;
}

export interface LiveState {
  /** The request this state serves. */
  readonly turn: number;
  readonly act: number;
  readonly side: number;
  /** When the act started, on the live clock (ms). */
  readonly start: number;
  /** What was on screen minus the act's first pose, fading out from `start`. */
  readonly offset: Pose | null;
}

/**
 * The act's own time `elapsed` ms after it started: a held act loops its hold window for as long as
 * it is asked for; any other plays once and then stays at its end (at rest, the idle going on).
 */
export function actTime(act: Act, elapsed: number): number {
  'worklet';
  const h = act.hold;
  if (!h || elapsed <= h[1]) return elapsed;
  const span = h[1] - h[0];
  return h[0] + ((elapsed - h[0]) % span);
}

const KEYS = Object.keys(REST_POSE) as (keyof Pose)[];

/** `p + w × d`, channel by channel. */
export function addPose(p: Pose, d: Pose, w: number): Pose {
  'worklet';
  const out = { ...p };
  for (let i = 0; i < KEYS.length; i++) {
    const k = KEYS[i] as keyof Pose;
    out[k] = p[k] + w * d[k];
  }
  return out;
}

/** `a − b`, channel by channel. */
export function subPose(a: Pose, b: Pose): Pose {
  'worklet';
  const out = { ...a };
  for (let i = 0; i < KEYS.length; i++) {
    const k = KEYS[i] as keyof Pose;
    out[k] = a[k] - b[k];
  }
  return out;
}

/** The pose on screen at `now` (the live clock, ms, which is also the idle loop's time). */
export function livePose(state: LiveState, now: number, seed: number, o: PoseOptions): Pose {
  'worklet';
  const act = ACT_LIST[state.act] ?? ACTS.idle;
  const pose = poseAt(now, actTime(act, now - state.start), act, state.side, seed, o);
  if (!state.offset) return pose;
  const w = 1 - seg(now - state.start, 0, FADE_MS, 'travel');
  return w > 0 ? addPose(pose, state.offset, w) : pose;
}

/**
 * The state once `request` starts at `now`, from `state` (null: the critter has just appeared, at
 * rest, exactly as the generator draws it, and its idle fades in).
 */
export function startAct(
  state: LiveState | null,
  request: ActRequest,
  now: number,
  seed: number,
  o: PoseOptions,
): LiveState {
  'worklet';
  const shown = state ? livePose(state, now, seed, o) : REST_POSE;
  const act = ACT_LIST[request.act] ?? ACTS.idle;
  const first = poseAt(now, 0, act, request.side, seed, o);
  return {
    turn: request.turn,
    act: request.act,
    side: request.side,
    start: now,
    offset: subPose(shown, first),
  };
}
