import { describe, expect, it } from '@jest/globals';
import type { CanDoProgress } from '@yapling/contracts';
import { translator } from '@yapling/i18n';

import {
  earnedKeepsakes,
  hungKeepsakes,
  keepsakeScreenCopy,
  trackOf,
} from '../../src/features/payoff/keepsake-model';
import { CALL_ID, RING_FULL, RING_ONE, T0, learner, progress } from './fixtures';

const vi = translator('vi');
const en = translator('en');

const introduced: CanDoProgress = {
  id: 'introduce-yourself-30s',
  stage: 'newcomer',
  status: 'ticked',
  evidence: [{ callRecordId: CALL_ID, quote: "Hi, I'm Lan. I'm a designer.", at: T0 }],
  witness: 'linh',
  tickedOn: '2026-09-25',
};

const canDoKeepsake = {
  id: 'cando-introduce-yourself-30s',
  kind: 'can_do',
  canDoId: 'introduce-yourself-30s',
  signedBy: 'linh',
  earnedOn: '2026-09-25',
} as const;

describe('the keepsake', () => {
  it('is signed with the learner’s name, the can-do, its witness and the day it was earned', () => {
    const earned = earnedKeepsakes(
      { id: CALL_ID },
      progress({ canDos: [introduced], keepsakes: [canDoKeepsake], weeks: [RING_FULL] }),
      learner,
    );
    expect(earned?.ringFull).toEqual({ week: 1 });
    expect(earned?.certificates).toHaveLength(1);
    expect(earned?.certificates[0]).toMatchObject({
      heading: 'Lan can now…',
      canDo: 'Introduced myself in 30 seconds',
      witnessed: 'witnessed by Linh · Sep 25',
      witness: 'linh',
      witnessName: 'Linh',
      earnedOn: '2026-09-25',
    });
  });

  it('heads a full ring with the week and keeps the drawing in English in any chrome', () => {
    const earned = earnedKeepsakes(
      { id: CALL_ID },
      progress({ canDos: [introduced], keepsakes: [canDoKeepsake], weeks: [RING_FULL] }),
      { name: 'Minh', roommateName: 'Pip' },
    );
    expect(earned).not.toBeNull();
    const copy = keepsakeScreenCopy(earned!, 0, vi);
    expect(copy).toEqual({
      ring: { label: '3/3', week: 'TUẦN 1', title: 'Vòng tuần đã đầy!' },
      ticked: null,
      roommateSays: 'Mình tự vẽ đó. Linh đã ký!',
      cta: 'Treo lên tường',
      hungToast: 'Đã treo trên tường hang',
    });
    expect(earned?.certificates[0]?.heading).toBe('Minh can now…');
  });

  it('names the office’s receptionist in the learner’s language when they signed it', () => {
    const office = { ...introduced, witness: 'office' } as const;
    const earned = earnedKeepsakes(
      { id: CALL_ID },
      progress({
        canDos: [office],
        keepsakes: [{ ...canDoKeepsake, signedBy: 'office' }],
        weeks: [RING_ONE],
      }),
      learner,
    );
    expect(earned?.certificates[0]).toMatchObject({ witness: null });
    expect(keepsakeScreenCopy(earned!, 0, vi)?.roommateSays).toBe(
      'Mình tự vẽ đó. Cô lễ tân đã ký!',
    );
    expect(keepsakeScreenCopy(earned!, 0, en)?.roommateSays).toBe(
      'I drew it myself. The receptionist signed it!',
    );
  });

  it('shows a can-do ticked mid-week with its track and count instead of the ring', () => {
    const earned = earnedKeepsakes(
      { id: CALL_ID },
      progress({ canDos: [introduced], keepsakes: [canDoKeepsake], weeks: [RING_ONE] }),
      learner,
    );
    expect(earned?.ringFull).toBeNull();
    expect(keepsakeScreenCopy(earned!, 0, en)).toMatchObject({
      ring: null,
      ticked: { track: 'WORK', title: 'New can-do ticked', count: '1 of 6' },
      roommateSays: 'I drew it myself. Linh signed it!',
    });
  });

  it('draws the week’s keepsake when the ring fills without a new can-do, dated the day it filled', () => {
    const earlier = {
      ...introduced,
      evidence: [{ ...introduced.evidence[0]!, callRecordId: 'call_a' }],
      tickedOn: '2026-09-22',
    };
    const earned = earnedKeepsakes(
      { id: CALL_ID },
      progress({
        canDos: [earlier],
        keepsakes: [
          { ...canDoKeepsake, earnedOn: '2026-09-22' },
          { id: 'week-1', kind: 'week', canDoId: null, signedBy: 'pip', earnedOn: '2026-09-25' },
        ],
        weeks: [RING_FULL],
      }),
      learner,
    );
    expect(earned?.certificates.map((c) => [c.id, c.canDo, c.witnessed])).toEqual([
      ['week-1', 'Introduced myself in 30 seconds', 'witnessed by Linh · Sep 25'],
    ]);
  });

  it('falls back to the week itself when no can-do is ticked yet, signed by the roommate', () => {
    const earned = earnedKeepsakes(
      { id: CALL_ID },
      progress({
        keepsakes: [
          { id: 'week-1', kind: 'week', canDoId: null, signedBy: 'pip', earnedOn: '2026-09-25' },
        ],
        weeks: [RING_FULL],
      }),
      { name: 'Lan', roommateName: 'Bánh Bao' },
    );
    expect(earned?.certificates[0]).toMatchObject({
      canDo: 'fill a whole week with calls',
      witnessed: 'witnessed by Bánh Bao · Sep 25',
      witness: 'pip',
    });
  });

  it('earns nothing from a call that ticked nothing and left the ring open', () => {
    expect(earnedKeepsakes({ id: CALL_ID }, progress(), learner)).toBeNull();
    const other = {
      ...introduced,
      evidence: [{ ...introduced.evidence[0]!, callRecordId: 'call_old' }],
    };
    expect(
      earnedKeepsakes(
        { id: CALL_ID },
        progress({ canDos: [other], keepsakes: [canDoKeepsake] }),
        learner,
      ),
    ).toBeNull();
  });

  it('lists every earned keepsake for the burrow wall, oldest first', () => {
    const wall = hungKeepsakes(
      progress({
        canDos: [introduced],
        keepsakes: [
          { id: 'week-1', kind: 'week', canDoId: null, signedBy: 'pip', earnedOn: '2026-09-26' },
          canDoKeepsake,
        ],
      }),
      learner,
    );
    expect(wall.map((k) => k.id)).toEqual(['cando-introduce-yourself-30s', 'week-1']);
  });
});

describe('the keepsake’s track count', () => {
  const ticked = (id: string, stage: CanDoProgress['stage'], callRecordId = CALL_ID) =>
    ({
      id,
      stage,
      status: 'ticked',
      evidence: [{ callRecordId, quote: 'Hi! I’m Lan.', at: T0 }],
      witness: 'linh',
      tickedOn: '2026-09-22',
    }) as const satisfies CanDoProgress;

  it('counts a Visitor’s can-do among the Visitor’s own, in the Visitor’s words', () => {
    const hello = ticked('say-hello-and-your-name', 'visitor');
    const earned = earnedKeepsakes(
      { id: CALL_ID },
      progress({
        canDos: [hello],
        keepsakes: [
          {
            id: 'cando-say-hello-and-your-name',
            kind: 'can_do',
            canDoId: 'say-hello-and-your-name',
            signedBy: 'linh',
            earnedOn: '2026-09-22',
          },
        ],
        weeks: [RING_ONE],
      }),
      learner,
    );
    expect(earned?.certificates[0]).toMatchObject({
      canDo: 'Said hello and my name',
      track: { track: 'life', done: 1, total: 4 },
    });
    expect(keepsakeScreenCopy(earned!, 0, vi)?.ticked?.count).toBe('1/4');
  });

  it('never counts past its total once Settling in and Season 1 are both under way', () => {
    const canDos = [
      ticked('say-hello-and-your-name', 'visitor', 'call_a'),
      ticked('answer-yes-or-no-politely', 'visitor', 'call_b'),
      ticked('ask-again-or-slower', 'visitor', 'call_c'),
      ticked('order-one-thing', 'visitor', 'call_d'),
      ticked('ask-whats-wrong', 'newcomer'),
    ];
    expect(trackOf('ask-whats-wrong', canDos)).toEqual({ track: 'life', done: 1, total: 6 });
    expect(trackOf('order-one-thing', canDos)).toEqual({ track: 'life', done: 4, total: 4 });
    expect(trackOf('understand-number-time-price', canDos)).toEqual({
      track: 'work',
      done: 0,
      total: 2,
    });
  });

  it('keeps Season 1’s count unchanged for a learner who never settled in', () => {
    expect(trackOf('introduce-yourself-30s', [introduced])).toEqual({
      track: 'work',
      done: 1,
      total: 6,
    });
    expect(trackOf('no-such-can-do')).toBeNull();
  });
});
