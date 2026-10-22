import { describe, expect, it } from '@jest/globals';
import type { CanDoProgress } from '@yapling/contracts';
import { translator } from '@yapling/i18n';

import {
  earnedKeepsakes,
  hungKeepsakes,
  keepsakeScreenCopy,
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
