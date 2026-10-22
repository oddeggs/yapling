import type { CharacterId } from '@yapling/contracts';
import type { Scene } from '@yapling/story';

/*
 * Where everything sits in a call, by the scene's place and kind, in the prototype's 390-point
 * frame (the screen scales it to the phone's width). One layout serves every call: the speaker
 * pill, the backdrop, the critters, a bubble anchor per speaker and the call bar's exit.
 */

/** The art scenes a call is drawn over (names from `@yapling/art`). */
export type CallSceneName = 'cafe' | 'bus' | 'office' | 'burrow' | 'burrow-day1';

export type Backdrop =
  /** Drawn sharp; `front` adds the layer over the main cast (the café counter, the bus dashboard). */
  | { readonly kind: 'sharp'; readonly name: CallSceneName; readonly front: boolean }
  /** Softly blurred behind a roommate's call, as if seen from the phone. */
  | { readonly kind: 'blur'; readonly name: CallSceneName };

/** A critter on the stage: its width and the top-left of its box. */
export interface CastSpot {
  readonly character: CharacterId;
  readonly size: number;
  readonly left: number;
  readonly top: number;
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
  'call.done.wrapUp' | 'call.done.hopOff' | 'common.done' | 'onboarding.unpack.done';

export type PlaceCopy =
  | { readonly key: 'onboarding.unpack.place'; readonly day: number }
  | {
      readonly key:
        'call.place.cafe' | 'call.place.fromBurrow' | 'call.place.busStop' | 'call.place.onCall';
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

/** The neighbour a scene is with: its first cast member who isn't the roommate or a voice. */
function neighbourOf(scene: Scene): CharacterId | null {
  return scene.cast.find((c) => c !== 'pip' && c !== 'office' && c !== 'mags') ?? null;
}

export function layoutFor(scene: Scene): CallLayout {
  const neighbour = neighbourOf(scene);
  switch (scene.place) {
    case 'lantern-cafe': {
      const host = neighbour ?? 'mei';
      return {
        backdrop: { kind: 'sharp', name: 'cafe', front: true },
        cast: [at(host, 220, 40, 212)],
        castFront: [at('pip', 130, 252, 486)],
        bubbles: {
          [host]: bubble(124, 16, 120),
          pip: bubble(404, 96, 16),
          // Under the phone pill while the office is on the line.
          office: bubble(160, 16, 16),
        },
        bubbleDefault: bubble(124, 16, 120),
        pill: host,
        place: { key: 'call.place.cafe' },
        exit: 'call.done.wrapUp',
        episodeTag: scene.kind === 'episode' ? episodeTagOf(scene.id) : null,
        rounds: false,
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
        episodeTag: scene.kind === 'episode' ? episodeTagOf(scene.id) : null,
        rounds: scene.kind === 'practice',
        letter: null,
      };
    case 'hollowbrook-office': {
      const host = neighbour ?? 'sol';
      return {
        backdrop: { kind: 'sharp', name: 'office', front: true },
        cast: [at(host, 220, 40, 212)],
        castFront: [at('pip', 130, 252, 486)],
        bubbles: { [host]: bubble(124, 16, 120), pip: bubble(404, 96, 16) },
        bubbleDefault: bubble(124, 16, 120),
        pill: host,
        place: { key: 'call.place.onCall' },
        exit: 'call.done.wrapUp',
        episodeTag: scene.kind === 'episode' ? episodeTagOf(scene.id) : null,
        rounds: false,
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
    case 'town-square':
      // Later episodes: the roommate on a call, the place softly behind.
      return {
        backdrop: { kind: 'blur', name: 'burrow' },
        cast: [at('pip', 220, 85, 330)],
        castFront: [],
        bubbles: { pip: bubble(220, 20, 20) },
        bubbleDefault: bubble(220, 20, 20),
        pill: 'pip',
        place: { key: 'call.place.onCall' },
        exit: 'common.done',
        episodeTag: episodeTagOf(scene.id),
        rounds: false,
        letter: null,
      };
  }
}

/** Every critter on the stage, back to front. */
export const stageCast = (layout: CallLayout): readonly CastSpot[] => [
  ...layout.cast,
  ...layout.castFront,
];
