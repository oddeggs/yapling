import { STAGES, type StageRequestReason } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  earnsNewcomerCard,
  placementSkipsLastBox,
  placementStage,
  resolveStageRequest,
  type TurnPass,
} from './stage-moves';

describe('the placement rule', () => {
  it('places a Visitor when at most one of the three open boxes is fine', () => {
    expect(placementStage([false, false, false])).toBe('visitor');
    expect(placementStage([true, false, false])).toBe('visitor');
    expect(placementStage([false, false, true])).toBe('visitor');
  });

  it('places a Newcomer when two or three open boxes are fine', () => {
    expect(placementStage([true, true, false])).toBe('newcomer');
    expect(placementStage([false, true, true])).toBe('newcomer');
    expect(placementStage([true, true, true])).toBe('newcomer');
  });

  it('skips the last box after two misses, and that still places a Visitor', () => {
    expect(placementSkipsLastBox([false, false])).toBe(true);
    expect(placementStage([false, false])).toBe('visitor');
  });

  it('asks the last box whenever one of the first two was fine', () => {
    expect(placementSkipsLastBox([true, false])).toBe(false);
    expect(placementSkipsLastBox([false, true])).toBe(false);
    expect(placementSkipsLastBox([false])).toBe(false);
    expect(placementSkipsLastBox([])).toBe(false);
  });

  it('counts boxes never played as not fine', () => {
    expect(placementStage([])).toBe('visitor');
    expect(placementStage([true])).toBe('visitor');
    expect(placementStage([true, true])).toBe('newcomer');
  });

  it('only ever places Visitor or Newcomer', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 3 }), (boxes) => {
        const fine = boxes.filter(Boolean).length;
        expect(placementStage(boxes)).toBe(fine <= 1 ? 'visitor' : 'newcomer');
      }),
    );
  });
});

const turns = (match: number, other: TurnPass, otherCount: number): TurnPass[] => [
  ...Array<TurnPass>(match).fill('match'),
  ...Array<TurnPass>(otherCount).fill(other),
];

describe('the stage-up rule', () => {
  it('hands a Visitor the Newcomer card at 70% of week-1 turns passed on their own', () => {
    expect(earnsNewcomerCard('visitor', turns(7, 'generous', 3))).toBe(true);
    expect(earnsNewcomerCard('visitor', turns(14, 'generous', 6))).toBe(true);
    expect(earnsNewcomerCard('visitor', turns(10, 'skip', 0))).toBe(true);
  });

  it('waits below 70%, counting generous passes, skips and fallbacks against it', () => {
    expect(earnsNewcomerCard('visitor', turns(6, 'generous', 4))).toBe(false);
    expect(earnsNewcomerCard('visitor', turns(13, 'skip', 6))).toBe(false);
    expect(earnsNewcomerCard('visitor', turns(2, 'fallback', 1))).toBe(false);
  });

  it('waits when there are no week-1 turns yet', () => {
    expect(earnsNewcomerCard('visitor', [])).toBe(false);
  });

  it('is only offered to a Visitor', () => {
    for (const s of STAGES.filter((x) => x !== 'visitor')) {
      expect(earnsNewcomerCard(s, turns(10, 'skip', 0))).toBe(false);
    }
  });

  it('matches the share exactly for any mix of turns', () => {
    const pass = fc.constantFrom<TurnPass>('match', 'generous', 'skip', 'fallback');
    fc.assert(
      fc.property(fc.array(pass, { minLength: 1, maxLength: 60 }), (week) => {
        const matched = week.filter((t) => t === 'match').length;
        expect(earnsNewcomerCard('visitor', week)).toBe(matched / week.length >= 0.7 - 1e-9);
      }),
    );
  });
});

describe('stage requests', () => {
  const ask = (
    current: (typeof STAGES)[number],
    to: (typeof STAGES)[number],
    reason: StageRequestReason,
  ) => resolveStageRequest(current, { to, reason });

  it('lets the level question choose Visitor or Newcomer', () => {
    expect(ask('newcomer', 'visitor', 'self_select')).toBe('visitor');
    expect(ask('visitor', 'newcomer', 'self_select')).toBe('newcomer');
    expect(ask('newcomer', 'neighbour', 'self_select')).toBeNull();
    expect(ask('regular', 'visitor', 'self_select')).toBeNull();
  });

  it('takes a Newcomer to Visitor on "too hard", and anyone higher one stage down', () => {
    expect(ask('newcomer', 'visitor', 'too_hard')).toBe('visitor');
    expect(ask('neighbour', 'newcomer', 'too_hard')).toBe('newcomer');
    expect(ask('neighbour', 'visitor', 'too_hard')).toBeNull();
    expect(ask('visitor', 'visitor', 'too_hard')).toBeNull();
  });

  it('moves one stage up on "too easy", a Visitor to Newcomer', () => {
    expect(ask('visitor', 'newcomer', 'too_easy')).toBe('newcomer');
    expect(ask('newcomer', 'neighbour', 'too_easy')).toBe('neighbour');
    expect(ask('newcomer', 'regular', 'too_easy')).toBeNull();
    expect(ask('voice', 'voice', 'too_easy')).toBeNull();
  });

  it("takes a Visitor to Newcomer on accepting Linh's card, and keeps one who stays", () => {
    expect(ask('visitor', 'newcomer', 'stage_up')).toBe('newcomer');
    expect(ask('newcomer', 'neighbour', 'stage_up')).toBeNull();
    expect(ask('visitor', 'visitor', 'stay')).toBe('visitor');
    expect(ask('visitor', 'newcomer', 'stay')).toBeNull();
  });
});
