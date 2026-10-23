import type { CharacterId } from '@yapling/contracts';
import { SETTLING_SCENES, type SettlingSceneId } from '@yapling/domain';
import type { Translate } from '@yapling/i18n';
import { getLine, type Scene } from '@yapling/story';

import { timedBeats } from './tracker';

/*
 * Where everything sits in a call, by the scene's place and kind, in the prototype's 390-point
 * frame (the screen scales it to the phone's width). One layout serves every call: the speaker
 * pill, the backdrop, the critters, a bubble anchor per speaker and the call bar's exit.
 */

/** The art scenes a call is drawn over (names from `@yapling/art`). */
export type CallSceneName =
  'cafe' | 'bus' | 'office' | 'burrow' | 'burrow-day1' | 'town' | 'square';

export type Backdrop =
  /**
   * Drawn sharp; `front` adds the layer over the main cast (the café counter, the bus dashboard);
   * `top` lifts the picture (the burrow's door in view during Settling in).
   */
  | {
      readonly kind: 'sharp';
      readonly name: CallSceneName;
      readonly front: boolean;
      readonly top?: number;
    }
  /** Softly blurred behind a roommate's call, as if seen from the phone. */
  | { readonly kind: 'blur'; readonly name: CallSceneName };

/** A critter on the stage: its width and the top-left of its box. */
export interface CastSpot {
  readonly character: CharacterId;
  readonly size: number;
  readonly left: number;
  readonly top: number;
  /**
   * Lifted clear of the cards over the call bar when they would cover its face (Pip in the burrow
   * for Pip's minute, Pip at the meeting): see `place-fit.ts`.
   */
  readonly clear?: true;
}

/** A bubble's top and its left and right insets. */
export interface BubbleSpot {
  readonly top: number;
  readonly left: number;
  readonly right: number;
}

export interface CallLayout {
  readonly backdrop: Backdrop;
  /** Behind the front layer (Mei behind the counter, Bea at the wheel). */
  readonly cast: readonly CastSpot[];
  /** Over the front layer (Pip small at the side). */
  readonly castFront: readonly CastSpot[];
  readonly bubbles: Readonly<Partial<Record<CharacterId, BubbleSpot>>>;
  readonly bubbleDefault: BubbleSpot;
  /** Whose face and name the speaker pill shows. */
  readonly pill: CharacterId;
  readonly place: PlaceCopy;
  readonly exit: ExitCopy;
  /** "S1 · E1" beside the pill on episode calls. */
  readonly episodeTag: string | null;
  /** Pass it on: the strip of listeners and their seconds. */
  readonly rounds: boolean;
  /** Where a letter handed over in the scene can sit clear of faces and bubbles; null for none. */
  readonly letter: LetterSpots | null;
}

/**
 * The two places a letter can lie open without covering a face or the bubble on screen, and the
 * corner it tucks into. Tops and edges are frame points (times the screen's scale, as the cast);
 * the peek's width is plain points, as the bubbles' side insets are.
 */
export interface LetterSpots {
  /** On the counter's front, left of the roommate: its home while the bubble is up top. */
  readonly low: { readonly top: number; readonly right: number };
  /** Under the speaker pill, down to the crown of the host's head: its home while the bubble is low. */
  readonly high: { readonly bottom: number };
  /** A bubble whose top is at or below this line is low (it shares the counter with the letter). */
  readonly lowBand: number;
  /** The tucked letter's width, in the low home's corner left of the low bubbles' inset. */
  readonly peekWidth: number;
}

/** The call bar's way out, by scene. */
export type ExitCopy =
  'call.done.wrapUp' | 'call.done.hopOff' | 'common.done' | 'onboarding.unpack.done' | 'call.leave';

export type PlaceCopy =
  | { readonly key: 'onboarding.unpack.place'; readonly day: number }
  /** "Làm quen · 1/6 · Hello". */
  | {
      readonly key: 'call.place.settling';
      readonly chapter: number;
      readonly total: number;
      readonly title: string;
    }
  | {
      readonly key:
        | 'call.place.cafe'
        | 'call.place.fromBurrow'
        | 'call.place.busStop'
        | 'call.place.onCall'
        | 'call.place.inn'
        | 'call.place.square'
        | 'call.place.interviewRoom'
        | 'call.place.pipsMinute';
    };

/** The prototype's frame width: every number here is in its points. */
export const FRAME_WIDTH = 390;

const at = (character: CharacterId, size: number, left: number, top: number): CastSpot => ({
  character,
  size,
  left,
  top,
});
const bubble = (top: number, left: number, right: number): BubbleSpot => ({ top, left, right });

/**
 * A letter at the café counter (and the office's): the host's head starts at 248 and her brows at
 * 274, the counter's top edge is at 409 and the roommate's drawing starts at 270 across. Up top the
 * letter may brush the crown of the host's head, never her brows or eyes. The letter rests tilted,
 * so each edge keeps a few points' clearance. The roommate's bubble starts 96 points in, so the
 * peek fits in the 16 to 80 corner.
 */
const COUNTER_LETTER: LetterSpots = {
  low: { top: 418, right: 254 },
  high: { bottom: 256 },
  lowBand: 300,
  peekWidth: 64,
};

/** "S1 · E1" from an episode scene id (`s1-e1`, `s1-e1-practice`). */
export function episodeTagOf(sceneId: string): string | null {
  const m = /^s(\d+)-e(\d+)/.exec(sceneId);
  return m ? `S${m[1]} · E${m[2]}` : null;
}

/** Characters heard but never drawn: the office on the phone, Mags at the town meeting. */
const VOICES: ReadonlySet<CharacterId> = new Set(['office', 'mags']);

/**
 * The neighbours a scene is with, drawn on the stage: its cast but the roommate and the voices,
 * the one who speaks and is answered most first (Hank at the café in Episode 3, not Mei), the
 * cast's order between equals.
 */
export function neighboursOf(scene: Scene): readonly CharacterId[] {
  const said = new Map<CharacterId, number>();
  const count = (c: CharacterId | null | undefined) => {
    if (c) said.set(c, (said.get(c) ?? 0) + 1);
  };
  for (const beat of scene.beats) {
    if (beat.kind === 'rec') count(getLine(beat.line).character);
    if (beat.kind === 'gen') count(beat.speaker);
    if (beat.kind === 'gen' || beat.kind === 'learner') count(beat.answer?.listener);
  }
  return scene.cast
    .filter((c) => c !== 'pip' && !VOICES.has(c))
    .map((c, i) => ({ c, i, n: said.get(c) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.c);
}

/** The neighbour a scene is with: the one it is most with. */
const neighbourOf = (scene: Scene): CharacterId | null => neighboursOf(scene)[0] ?? null;

/** The speaker pill's place line. */
export function placeText(place: PlaceCopy, t: Translate): string {
  switch (place.key) {
    case 'onboarding.unpack.place':
      return t(place.key, { day: place.day });
    case 'call.place.settling':
      return t(place.key, { chapter: place.chapter, total: place.total, title: place.title });
    case 'call.place.cafe':
    case 'call.place.fromBurrow':
    case 'call.place.busStop':
    case 'call.place.onCall':
    case 'call.place.inn':
    case 'call.place.square':
    case 'call.place.interviewRoom':
    case 'call.place.pipsMinute':
      return t(place.key);
  }
}

/**
 * A Settling-in chapter, as its board draws it: Linh at the burrow door with the roommate by the
 * boxes, Bea alone at the wheel of Bus 45, or Mei behind the café counter with the roommate peeking
 * by the coffee machine. Every line's bubble sits up top; the roommate's is lower, on the right.
 */
function settlingLayout(scene: Scene, chapter: number): CallLayout {
  const top = bubble(110, 16, 16);
  const pipLow = bubble(252, 196, 16);
  const base = {
    place: {
      key: 'call.place.settling',
      chapter,
      total: SETTLING_SCENES.length,
      title: scene.title,
    },
    exit: 'call.leave',
    episodeTag: null,
    rounds: false,
    letter: null,
    castFront: [],
  } as const;
  switch (scene.place) {
    case 'bus-45':
      return {
        ...base,
        backdrop: { kind: 'sharp', name: 'bus', front: true },
        cast: [at('bea', 180, 104, 246)],
        bubbles: { bea: top, linh: top },
        bubbleDefault: top,
        pill: 'bea',
      };
    case 'lantern-cafe':
      return {
        ...base,
        backdrop: { kind: 'sharp', name: 'cafe', front: true },
        cast: [at('mei', 200, 30, 236), at('pip', 104, 268, 336)],
        bubbles: { mei: top, pip: pipLow },
        bubbleDefault: top,
        pill: 'mei',
      };
    case 'burrow':
    case 'hollowbrook-office':
    case 'lantern-inn':
    case 'town-square': {
      const door = bubble(110, 16, 40);
      return {
        ...base,
        backdrop: { kind: 'sharp', name: 'burrow-day1', front: false, top: -150 },
        cast: [at('linh', 160, 16, 262), at('pip', 120, 252, 322)],
        bubbles: { linh: door, pip: pipLow },
        bubbleDefault: door,
        pill: 'linh',
      };
    }
  }
}

/** "S1 · E4" on an episode call, none on the week's other calls. */
const tagOf = (scene: Scene): string | null =>
  scene.kind === 'episode' ? episodeTagOf(scene.id) : null;

/**
 * Behind a counter (the café's, the office's): the host large on the left, a second neighbour
 * smaller behind the counter on the right (Mei while Hank orders), the roommate small in front at
 * the side. In Pass it on the strip of rounds sits up top, so the bubbles start under it.
 */
function counterLayout(
  scene: Scene,
  host: CharacterId,
  name: 'cafe' | 'office',
): Pick<CallLayout, 'backdrop' | 'cast' | 'castFront' | 'bubbles' | 'bubbleDefault' | 'pill'> {
  const second = neighboursOf(scene).find((c) => c !== host) ?? null;
  const top = scene.kind === 'practice' ? 160 : 124;
  return {
    backdrop: { kind: 'sharp', name, front: true },
    cast: [at(host, 220, 40, 212), ...(second ? [at(second, 150, 236, 262)] : [])],
    // Small at the side, it rises over the cards on a short phone.
    castFront: [{ ...at('pip', 130, 252, 486), clear: true }],
    bubbles: {
      [host]: bubble(top, 16, 120),
      ...(second ? { [second]: bubble(top, 120, 16) } : {}),
      pip: bubble(404, 96, 16),
      // Under the phone pill while the office is on the line.
      office: bubble(160, 16, 16),
    },
    bubbleDefault: bubble(top, 16, 120),
    pill: host,
  };
}

/**
 * A neighbour on their own, the roommate not in the scene: Dex across the interview room's desk,
 * large and in the middle, his line over his head the full width.
 */
function aloneLayout(scene: Scene, host: CharacterId): CallLayout {
  const top = bubble(124, 16, 16);
  return {
    backdrop: { kind: 'sharp', name: 'office', front: true },
    cast: [at(host, 250, 56, 202)],
    castFront: [],
    bubbles: { [host]: top },
    bubbleDefault: top,
    pill: host,
    place: { key: scene.kind === 'real_week' ? 'call.place.interviewRoom' : 'call.place.onCall' },
    exit: 'call.done.wrapUp',
    episodeTag: tagOf(scene),
    rounds: scene.kind === 'practice',
    letter: null,
  };
}

/** Up to three neighbours in the Inn's back row, left, right, then the middle. */
const BACK_ROW = [
  { size: 112, left: 10, top: 268 },
  { size: 112, left: 268, top: 268 },
  { size: 104, left: 143, top: 258 },
] as const;

/**
 * A gathering (the Inn, the town meeting), every line up top over the heads. At the Inn, which
 * borrows the town softly behind until its own set exists: the host large in front on the left,
 * the roommate in front on the right, up to three more neighbours behind them. At the meeting in
 * the square: a row by the fountain, the roommate in the middle beside the learner, neighbours
 * either side.
 */
function gatheringLayout(scene: Scene, where: 'inn' | 'square'): CallLayout {
  const neighbours = neighboursOf(scene);
  // A timed speech's ring sits up top on the right: the lines leave it room.
  const top = bubble(124, 16, timedBeats(scene).length > 0 ? 112 : 16);
  const pipIn = scene.cast.includes('pip') || neighbours.length === 0;
  const pip = (size: number, left: number, y: number): CastSpot[] =>
    pipIn ? [{ ...at('pip', size, left, y), clear: true }] : [];
  const [first = null, second = null, ...rest] = neighbours;
  const spots =
    where === 'square'
      ? {
          cast: rest.slice(0, 2).map((c, i) => at(c, 100, i === 0 ? 70 : 220, 330)),
          castFront: [
            ...(first ? [at(first, 124, 6, 412)] : []),
            ...(second ? [at(second, 124, 262, 412)] : []),
            ...pip(140, 128, 470),
          ],
        }
      : {
          cast: [second, ...rest].flatMap((c, i) => {
            const slot = BACK_ROW[i];
            return c && slot ? [at(c, slot.size, slot.left, slot.top)] : [];
          }),
          castFront: [...(first ? [at(first, 190, 14, 380)] : []), ...pip(140, 240, 420)],
        };
  return {
    backdrop:
      where === 'square'
        ? { kind: 'sharp', name: 'square', front: false }
        : { kind: 'blur', name: 'town' },
    ...spots,
    bubbles: {},
    bubbleDefault: top,
    pill: where === 'square' && pipIn ? 'pip' : (first ?? 'pip'),
    place: { key: where === 'square' ? 'call.place.square' : 'call.place.inn' },
    exit: 'call.done.wrapUp',
    episodeTag: tagOf(scene),
    rounds: scene.kind === 'practice',
    letter: null,
  };
}

/**
 * Pip's minute: in the burrow itself, not on the phone. The room is lifted so the roommate stands
 * on the rug mid-screen with the line over its head, clear of the cards over the call bar.
 */
function pipsMinuteLayout(): CallLayout {
  const top = bubble(132, 20, 20);
  return {
    backdrop: { kind: 'sharp', name: 'burrow', front: false, top: -170 },
    cast: [],
    castFront: [{ ...at('pip', 190, 100, 330), clear: true }],
    bubbles: { pip: top },
    bubbleDefault: top,
    pill: 'pip',
    place: { key: 'call.place.pipsMinute' },
    exit: 'common.done',
    episodeTag: null,
    rounds: false,
    letter: null,
  };
}

export function layoutFor(scene: Scene): CallLayout {
  const chapter = SETTLING_SCENES.indexOf(scene.id as SettlingSceneId);
  if (scene.kind === 'settling' && chapter >= 0) return settlingLayout(scene, chapter + 1);
  if (scene.kind === 'daily') return pipsMinuteLayout();
  const neighbour = neighbourOf(scene);
  switch (scene.place) {
    case 'lantern-cafe': {
      const host = neighbour ?? 'mei';
      if (!scene.cast.includes('pip') && neighbour) return aloneLayout(scene, host);
      return {
        ...counterLayout(scene, host, 'cafe'),
        place: { key: 'call.place.cafe' },
        exit: 'call.done.wrapUp',
        episodeTag: tagOf(scene),
        rounds: scene.kind === 'practice',
        letter: COUNTER_LETTER,
      };
    }
    case 'bus-45':
      return {
        backdrop: { kind: 'sharp', name: 'bus', front: true },
        cast: [at('bea', 190, 100, 292)],
        castFront: [at('pip', 112, 4, 600), at('linh', 118, 272, 596)],
        bubbles: {
          pip: bubble(500, 16, 140),
          linh: bubble(500, 140, 16),
          bea: bubble(150, 16, 120),
        },
        bubbleDefault: bubble(500, 16, 140),
        pill: 'bea',
        place: { key: 'call.place.busStop' },
        exit: 'call.done.hopOff',
        episodeTag: tagOf(scene),
        rounds: scene.kind === 'practice',
        letter: null,
      };
    case 'hollowbrook-office': {
      const host = neighbour ?? 'sol';
      if (!scene.cast.includes('pip') && neighbour) return aloneLayout(scene, host);
      return {
        ...counterLayout(scene, host, 'office'),
        place: { key: 'call.place.onCall' },
        exit: 'call.done.wrapUp',
        episodeTag: tagOf(scene),
        rounds: scene.kind === 'practice',
        letter: COUNTER_LETTER,
      };
    }
    case 'burrow':
      if (scene.kind === 'placement') {
        return {
          backdrop: { kind: 'sharp', name: 'burrow-day1', front: false },
          cast: [at('pip', 230, 80, 330)],
          castFront: [],
          bubbles: { pip: bubble(236, 20, 20) },
          bubbleDefault: bubble(236, 20, 20),
          pill: 'pip',
          place: { key: 'onboarding.unpack.place', day: 1 },
          exit: 'onboarding.unpack.done',
          episodeTag: null,
          rounds: false,
          letter: null,
        };
      }
      return {
        backdrop: { kind: 'blur', name: 'burrow' },
        cast: [at('pip', 230, 80, 300)],
        castFront: [],
        bubbles: { pip: bubble(200, 20, 20) },
        bubbleDefault: bubble(200, 20, 20),
        pill: 'pip',
        place: { key: 'call.place.fromBurrow' },
        exit: 'common.done',
        episodeTag: null,
        rounds: false,
        letter: null,
      };
    case 'lantern-inn':
      return gatheringLayout(scene, 'inn');
    case 'town-square':
      return gatheringLayout(scene, 'square');
  }
}

/** Every critter on the stage, back to front. */
export const stageCast = (layout: CallLayout): readonly CastSpot[] => [
  ...layout.cast,
  ...layout.castFront,
];
