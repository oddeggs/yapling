import type { FlowKeys, Keys } from './engine';

/**
 * What a rigged critter does, as data: one row of key poses per channel, so "hold the wave
 * longer" is one row to edit. Acting rows are read with `flow` (poses that pass into each other),
 * face rows with `track` (one move each: a blink, a glance). Every row starts and ends at rest, so
 * an act can follow any other without a jump, and the idle layers keep moving under all of them.
 *
 * Units: degrees for angles, rig units (the generator's 200-wide box) for distances, 0–1 for the
 * lid and the cheek. `lean`, `tilt`, `yaw` and `lookX` turn toward `side` (the speaker): positive is
 * the critter's left on screen, the viewer's right.
 */
export interface Act {
  readonly name: ActName;
  /** How long it plays (ms); it holds its last frame after. Rows reach rest `SETTLE_MS` before. */
  readonly duration: number;
  readonly keys: Readonly<Partial<Record<Channel, FlowKeys>>>;
  readonly face?: Readonly<Partial<Record<FaceChannel, Keys>>>;
  /** A hop: take-off and landing (ms) and height (rig units). */
  readonly hop?: readonly [takeoff: number, land: number, height: number];
  /** Accents: a wave of `amp` every `period` ms on a channel, inside a window of the act. */
  readonly accents?: readonly {
    readonly channel: Channel;
    readonly from: number;
    readonly to: number;
    readonly period: number;
    readonly amp: number;
    readonly phase?: number;
  }[];
}

/**
 * Acting channels. `squash` is the body's height minus 1 (the width keeps the volume); `ears` is
 * how far both ears droop outward (negative perks them); arms are the shoulder's outward angle `a`
 * (0 hangs down) and the elbow's bend `e`.
 */
export type Channel =
  | 'lean'
  | 'tilt'
  | 'yaw'
  | 'squash'
  | 'lift'
  | 'tail'
  | 'ears'
  | 'armLa'
  | 'armLe'
  | 'armRa'
  | 'armRe'
  | 'browL'
  | 'browR';

export type FaceChannel = 'lid' | 'lookX' | 'lookY' | 'cheek';

export const ACT_NAMES = ['breathe', 'listen', 'think', 'hop', 'wave'] as const;
export type ActName = (typeof ACT_NAMES)[number];

/** The arms at rest: a little out from the body, the elbow a little bent. */
export const ARM_REST = { a: 15, e: 10 } as const;

const blink = (at: number, close = 110, hold = 40, open = 190): Key4 => [
  [at, 0],
  [at + close, 1],
  [at + close + hold, 1],
  [at + close + hold + open, 0, 'out'],
];
type Key4 = readonly [Keys[number], Keys[number], Keys[number], Keys[number]];

export const ACTS: Readonly<Record<ActName, Act>> = {
  /** Only the idle layers: breathing, weight, tail and ears, blinks and glances. */
  breathe: { name: 'breathe', duration: 6000, keys: {} },

  /** Leans in toward the speaker, ears up, brows up, two small nods; blinks on the turn. */
  listen: {
    name: 'listen',
    duration: 6650,
    keys: {
      lean: [
        [0, 0],
        [700, 4],
        [2600, 4.5],
        [3000, 3.5],
        [3400, 4.5],
        [5600, 4],
        [6400, 0],
      ],
      yaw: [
        [0, 0],
        [600, 0.35],
        [5700, 0.35],
        [6400, 0],
      ],
      tilt: [
        [0, 0],
        [800, 5],
        [2300, 5],
        [2600, 8],
        [2950, 4.5],
        [4200, 5],
        [4500, 8],
        [4850, 5],
        [5700, 4],
        [6400, 0],
      ],
      squash: [
        [0, 0],
        [700, 0.02],
        [5600, 0.02],
        [6400, 0],
      ],
      ears: [
        [0, 0],
        [500, -9],
        [5800, -9],
        [6400, 0],
      ],
      browL: [
        [0, 0],
        [500, 2.5],
        [5800, 2.5],
        [6400, 0],
      ],
      browR: [
        [0, 0],
        [500, 2.5],
        [5800, 2.5],
        [6400, 0],
      ],
    },
    face: {
      lookX: [
        [0, 0],
        [450, 3, 'out'],
        [5800, 3],
        [6300, 0],
      ],
      lookY: [
        [0, 0],
        [450, -1, 'out'],
        [5800, -1],
        [6300, 0],
      ],
      lid: [[0, 0], ...blink(250), [6400, 0]],
    },
  },

  /** Glances up and aside and holds, a slow blink, then a softer look; the head tilts away. */
  think: {
    name: 'think',
    duration: 6650,
    keys: {
      yaw: [
        [0, 0],
        [700, -0.3],
        [3200, -0.3],
        [3800, -0.15],
        [5600, -0.15],
        [6400, 0],
      ],
      tilt: [
        [0, 0],
        [800, -5],
        [3000, -6],
        [3600, -3],
        [5600, -3],
        [6400, 0],
      ],
      lean: [
        [0, 0],
        [800, -1.5],
        [5600, -1.5],
        [6400, 0],
      ],
      browL: [
        [0, 0],
        [700, 3.5],
        [3000, 3.5],
        [3600, 1],
        [5600, 1],
        [6400, 0],
      ],
      browR: [
        [0, 0],
        [700, -1],
        [5600, -1],
        [6400, 0],
      ],
    },
    face: {
      lookX: [
        [0, 0],
        [300, 0],
        [800, -4.5],
        [3000, -4.5],
        [3600, -2],
        [5600, -2],
        [6300, 0],
      ],
      lookY: [
        [0, 0],
        [300, 0],
        [800, -5.5],
        [3000, -5.5],
        [3600, -1],
        [5600, -1],
        [6300, 0],
      ],
      // A blink on the glance, the lids resting a little lower while it thinks, a slow blink.
      lid: [
        [0, 0],
        [200, 0],
        [310, 1],
        [350, 1],
        [540, 0, 'out'],
        [900, 0.12],
        [3050, 0.12],
        [3330, 1],
        [3450, 1],
        [3830, 0.12, 'out'],
        [5600, 0.12],
        [6300, 0],
        [6400, 0],
      ],
    },
  },

  /** Crouch, stretch, a hop with arms flung up before landing, a squash that keeps the volume. */
  hop: {
    name: 'hop',
    duration: 2050,
    hop: [400, 940, 44],
    keys: {
      squash: [
        [0, 0],
        [260, -0.08],
        [380, -0.1],
        [460, 0.09],
        [640, 0.02],
        [860, 0.06],
        [940, 0.03],
        [1000, -0.18],
        [1080, -0.16],
        [1200, 0.035],
        [1340, -0.01],
        [1500, 0],
        [1800, 0],
      ],
      armLa: [
        [0, 15],
        [320, 4],
        [470, 50],
        [700, 36],
        [870, 70],
        [1000, 58],
        [1120, 32],
        [1450, 17],
        [1800, 15],
      ],
      armLe: [
        [0, 10],
        [470, 24],
        [870, 8],
        [1000, 34],
        [1450, 12],
        [1800, 10],
      ],
      armRa: [
        [0, 15],
        [300, 6],
        [450, 46],
        [720, 32],
        [900, 74],
        [1010, 56],
        [1100, 30],
        [1400, 16],
        [1800, 15],
      ],
      armRe: [
        [0, 10],
        [450, 18],
        [900, 12],
        [1010, 30],
        [1400, 11],
        [1800, 10],
      ],
      tilt: [
        [0, 0],
        [380, -2],
        [700, 3],
        [1000, -2],
        [1300, 0.5],
        [1800, 0],
      ],
    },
    face: {
      cheek: [
        [0, 0],
        [380, 0],
        [560, 1, 'out'],
        [1300, 1],
        [1650, 0],
        [1800, 0],
      ],
      lookY: [
        [0, 0],
        [400, 0],
        [620, -2],
        [940, -2],
        [1150, 0],
        [1800, 0],
      ],
    },
  },

  /** Raises the right arm with the elbow bent, waves, lowers; leans away and smiles. */
  wave: {
    name: 'wave',
    duration: 3650,
    keys: {
      armRa: [
        [0, 15],
        [520, 105],
        [2600, 108],
        [3100, 32],
        [3400, 15],
      ],
      armRe: [
        [0, 10],
        [520, 62],
        [2600, 60],
        [3100, 22],
        [3400, 10],
      ],
      armLa: [
        [0, 15],
        [600, 22],
        [2600, 22],
        [3300, 15],
        [3400, 15],
      ],
      lean: [
        [0, 0],
        [520, -2.2],
        [2600, -2],
        [3200, 0],
        [3400, 0],
      ],
      tilt: [
        [0, 0],
        [520, 4],
        [2600, 4],
        [3200, 0],
        [3400, 0],
      ],
      yaw: [
        [0, 0],
        [600, 0.1],
        [2600, 0.1],
        [3400, 0],
      ],
      browL: [
        [0, 0],
        [500, 2],
        [2600, 2],
        [3200, 0],
        [3400, 0],
      ],
      browR: [
        [0, 0],
        [500, 2],
        [2600, 2],
        [3200, 0],
        [3400, 0],
      ],
    },
    accents: [
      { channel: 'armRe', from: 560, to: 2560, period: 760, amp: 15 },
      { channel: 'armRa', from: 560, to: 2560, period: 760, amp: 3, phase: 0.2 },
    ],
    face: {
      cheek: [
        [0, 0],
        [380, 0],
        [700, 1, 'out'],
        [2500, 1],
        [2900, 0],
        [3400, 0],
      ],
      lid: [[0, 0], ...blink(160), [3400, 0]],
    },
  },
};
