import { describe, expect, it } from '@jest/globals';
import { controls, layout as space } from '@yapling/theme';
import { getScene, pipsMinuteSceneFor, type Scene } from '@yapling/story';

import { faceOf, liftFor } from '../../src/features/call/place-fit';
import {
  FRAME_WIDTH,
  layoutFor,
  neighboursOf,
  stageCast,
  type CallLayout,
} from '../../src/features/call/scene-layout';

const pipsMinute = pipsMinuteSceneFor(
  { due: { id: 'how-about' }, reuse: { id: 'im-from' } },
  { dayIndex: 9 },
);
if (!pipsMinute) throw new Error("no Pip's minute");

const characters = (l: CallLayout) => stageCast(l).map((s) => s.character);

describe('the places of the later weeks', () => {
  it('tags every episode call and none of the week’s other calls', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(layoutFor(getScene(`s1-e${n}`)).episodeTag).toBe(`S1 · E${n}`);
    }
    for (const id of ['s1-e3-real-week', 's1-e3-practice', 's1-e5-practice', 's1-e2-real-week']) {
      expect(layoutFor(getScene(id)).episodeTag).toBeNull();
    }
    expect(layoutFor(pipsMinute).episodeTag).toBeNull();
  });

  it('puts the one the scene is most with up front', () => {
    expect(neighboursOf(getScene('s1-e3'))).toEqual(['hank', 'mei']);
    const e3 = layoutFor(getScene('s1-e3'));
    expect(e3.pill).toBe('hank');
    expect(characters(e3)).toEqual(['hank', 'mei', 'pip']);
    const e2 = layoutFor(getScene('s1-e2'));
    expect([e2.backdrop, e2.pill]).toEqual([{ kind: 'sharp', name: 'office', front: true }, 'sol']);
  });

  it('meets at the Inn with the town softly behind, everyone on the stage', () => {
    const inn = layoutFor(getScene('s1-e4'));
    expect(inn.backdrop).toEqual({ kind: 'blur', name: 'town' });
    expect(inn.place.key).toBe('call.place.inn');
    expect(inn.pill).toBe('nell');
    expect(new Set(characters(inn))).toEqual(new Set(['nell', 'mei', 'bea', 'linh', 'pip']));
  });

  it('holds the town meeting in the square, Mags heard and not drawn', () => {
    const square = layoutFor(getScene('s1-e6'));
    expect(square.backdrop).toEqual({ kind: 'sharp', name: 'square', front: false });
    expect(square.place.key).toBe('call.place.square');
    expect(square.pill).toBe('pip');
    expect(new Set(characters(square))).toEqual(new Set(['hank', 'mei', 'pip']));
  });

  it('has Dex alone across the interview room on the real-week calls of weeks 3 to 5', () => {
    for (const id of ['s1-e3-real-week', 's1-e4-real-week', 's1-e5-real-week']) {
      const dex = layoutFor(getScene(id));
      expect(characters(dex)).toEqual(['dex']);
      expect(dex.pill).toBe('dex');
      expect(dex.place.key).toBe('call.place.interviewRoom');
      expect(dex.bubbles.dex).toEqual({ top: 124, left: 16, right: 16 });
    }
    // Weeks 2 and 6: the roommate calls from the burrow.
    for (const id of ['s1-e2-real-week', 's1-e6-real-week']) {
      expect(layoutFor(getScene(id)).place.key).toBe('call.place.fromBurrow');
    }
  });

  it("sets Pip's minute in the burrow itself, with the roommate kept clear of the cards", () => {
    expect(pipsMinute.id).toMatch(/^s1-pm\./);
    const minute = layoutFor(pipsMinute);
    expect(minute.backdrop).toMatchObject({ kind: 'sharp', name: 'burrow' });
    expect(minute.place.key).toBe('call.place.pipsMinute');
    expect(minute.exit).toBe('common.done');
    expect(stageCast(minute)).toEqual([expect.objectContaining({ character: 'pip', clear: true })]);
  });
});

/** The phones the app runs on: the smallest, a Pro and a Pro Max. */
const PHONES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 16 Pro', width: 393, height: 852 },
  { name: 'iPhone 16 Pro Max', width: 440, height: 956 },
];
/** A three-line bubble at its tallest, in points. */
const BUBBLE_HEIGHT = 150;

const PLACES: [string, Scene][] = [
  ['the Inn', getScene('s1-e4')],
  ['the square', getScene('s1-e6')],
  ['the interview room', getScene('s1-e3-real-week')],
  ['the café with two neighbours', getScene('s1-e3')],
  ["Pip's minute", pipsMinute],
];

describe('nothing covers a face', () => {
  for (const [name, scene] of PLACES) {
    it(`keeps faces clear of the bubble, each other and the call bar at ${name}`, () => {
      const l = layoutFor(scene);
      for (const phone of PHONES) {
        const k = phone.width / FRAME_WIDTH;
        const barTop = phone.height - space.callBarBottom - controls.callBar.height;
        const faces = stageCast(l).map((s) => ({ s, f: faceOf(s, k) }));
        for (const { s, f } of faces) {
          // Every line up top clears every face. (At the café the roommate's own line sits low
          // over its head, as in the first week.)
          const bubble = l.bubbles[s.character] ?? l.bubbleDefault;
          const tops = [bubble, ...Object.values(l.bubbles), l.bubbleDefault]
            .filter((b) => b.top < 300)
            .map((b) => b.top);
          expect(f.top).toBeGreaterThanOrEqual(
            Math.max(...tops) * k + BUBBLE_HEIGHT * Math.min(1, k),
          );
          // A critter low at the side rises over the call bar on a short phone.
          const lift = liftFor(s, { k, topBound: 0, bottomBound: barTop });
          expect(f.bottom - lift).toBeLessThanOrEqual(barTop);
          expect(s.left * k).toBeGreaterThanOrEqual(0);
          expect((s.left + s.size) * k).toBeLessThanOrEqual(phone.width);
        }
        // Faces may stand side by side; one face never sits over another's.
        for (const a of faces) {
          for (const b of faces) {
            if (a === b) continue;
            const x = (s: typeof a.s) => [s.left + s.size * 0.25, s.left + s.size * 0.75];
            const [al, ar] = x(a.s);
            const [bl, br] = x(b.s);
            const overlapX = (al ?? 0) < (br ?? 0) && (bl ?? 0) < (ar ?? 0);
            const overlapY = a.f.top < b.f.bottom && b.f.top < a.f.bottom;
            expect(overlapX && overlapY).toBe(false);
          }
        }
      }
    });
  }

  it('lifts a clear critter above the cards as they grow, never into the bubble', () => {
    const l = layoutFor(pipsMinute);
    const [pip] = stageCast(l);
    if (!pip) throw new Error('no roommate');
    for (const phone of PHONES) {
      const k = phone.width / FRAME_WIDTH;
      const face = faceOf(pip, k);
      const barTop = phone.height - space.callBarBottom - controls.callBar.height;
      const bubbleBottom = l.bubbleDefault.top * k + 110;
      // Nothing over the bar: it stands where it is.
      expect(liftFor(pip, { k, topBound: bubbleBottom, bottomBound: barTop })).toBe(0);
      // Two cards and a task card over the bar: its face rises clear of them.
      const stackTop = face.bottom - 40;
      const lift = liftFor(pip, { k, topBound: bubbleBottom, bottomBound: stackTop });
      expect(face.bottom - lift).toBeLessThanOrEqual(stackTop - 10 + 1e-9);
      expect(face.top - lift).toBeGreaterThanOrEqual(bubbleBottom - 1e-9);
      // A stack up to the bubble: it rises only as far as the bubble.
      const tall = liftFor(pip, { k, topBound: bubbleBottom, bottomBound: bubbleBottom + 20 });
      expect(face.top - tall).toBeCloseTo(bubbleBottom);
    }
    // A critter not marked clear never moves.
    const mei = stageCast(layoutFor(getScene('s1-e1')))[0];
    if (!mei) throw new Error('no host');
    expect(liftFor(mei, { k: 1, topBound: 0, bottomBound: 0 })).toBe(0);
  });
});
