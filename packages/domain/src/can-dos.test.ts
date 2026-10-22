import { CanDoProgress, CHARACTER_IDS, Id, Keepsake } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CAN_DO_EVIDENCE_MAX,
  canDoById,
  canDosForTrack,
  newCanDo,
  PLACEMENT_CAN_DOS,
  SEASON_1_CAN_DOS,
  SEASON_1_EPISODES,
  SETTLING_CAN_DOS,
  settlingCanDoFor,
  tickCanDo,
  VISITOR_CARD_CAN_DOS,
} from './can-dos';

const HCM = 'Asia/Ho_Chi_Minh';
const introduce = canDoById('introduce-yourself-30s')!;

describe('the Season 1 can-do catalogue', () => {
  it('has one Life and one Work can-do per episode, all at Newcomer, with valid ids', () => {
    expect(SEASON_1_CAN_DOS).toHaveLength(12);
    for (const episode of SEASON_1_EPISODES) {
      const tracks = SEASON_1_CAN_DOS.filter((c) => c.episode === episode).map((c) => c.track);
      expect(tracks.sort()).toEqual(['life', 'work']);
    }
    expect(new Set(SEASON_1_CAN_DOS.map((c) => c.id)).size).toBe(12);
    for (const c of SEASON_1_CAN_DOS) {
      expect(Id.safeParse(c.id).success).toBe(true);
      expect(c.stage).toBe('newcomer');
      expect(c.titleKey).toBe(`cando.${c.id}`);
    }
  });

  it('offers asking what is wrong and introducing yourself after placement', () => {
    expect(PLACEMENT_CAN_DOS.map((c) => c.id)).toEqual([
      'ask-whats-wrong',
      'introduce-yourself-30s',
    ]);
  });

  it('shows a track its own can-dos plus the placement two; both shows all', () => {
    const life = canDosForTrack('life');
    expect(life.every((c) => c.track === 'life' || c.placement)).toBe(true);
    expect(life.map((c) => c.id)).toContain('introduce-yourself-30s');
    expect(canDosForTrack('work').some((c) => c.id === 'say-no-politely')).toBe(false);
    expect(canDosForTrack('both')).toHaveLength(12);
  });
});

describe('ticking a can-do with evidence', () => {
  // Friday 25 September, 19:30 in Ho Chi Minh City.
  const at = Date.UTC(2026, 8, 25, 12, 30);

  it('ticks on the first evidence and makes a keepsake signed by the witness', () => {
    const { canDo, keepsake } = tickCanDo(
      newCanDo(introduce),
      {
        canDoId: introduce.id,
        callRecordId: 'call_1',
        quote: "Hi, I'm Lan. I'm a nurse.",
        witness: 'linh',
        at,
      },
      HCM,
    );
    expect(canDo.status).toBe('ticked');
    expect(canDo.witness).toBe('linh');
    expect(canDo.tickedOn).toBe('2026-09-25');
    expect(CanDoProgress.safeParse(canDo).success).toBe(true);
    expect(keepsake).toEqual({
      id: 'cando-introduce-yourself-30s',
      kind: 'can_do',
      canDoId: 'introduce-yourself-30s',
      signedBy: 'linh',
      earnedOn: '2026-09-25',
    });
    expect(Keepsake.safeParse(keepsake).success).toBe(true);
  });

  it('dates the tick in the learner’s timezone', () => {
    // 23:30 UTC on the 25th is already the 26th in Ho Chi Minh City.
    const late = Date.UTC(2026, 8, 25, 23, 30);
    const evidence = {
      canDoId: introduce.id,
      callRecordId: 'c',
      quote: 'q',
      witness: 'pip' as const,
    };
    expect(tickCanDo(newCanDo(introduce), { ...evidence, at: late }, HCM).canDo.tickedOn).toBe(
      '2026-09-26',
    );
  });

  it('never makes a second keepsake or changes the witness, and keeps evidence bounded', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            witness: fc.constantFrom(...CHARACTER_IDS),
            at: fc.integer({ min: 1_790_000_000_000, max: 1_800_000_000_000 }),
          }),
          { minLength: 1, maxLength: 40 },
        ),
        (lines) => {
          let current = newCanDo(introduce);
          let keepsakes = 0;
          for (const [i, line] of lines.entries()) {
            const result = tickCanDo(
              current,
              { canDoId: introduce.id, callRecordId: `call_${i}`, quote: 'Hello', ...line },
              HCM,
            );
            if (result.keepsake !== null) keepsakes++;
            current = result.canDo;
            expect(CanDoProgress.safeParse(current).success).toBe(true);
          }
          expect(keepsakes).toBe(1);
          expect(current.witness).toBe(lines[0]!.witness);
          expect(current.evidence.length).toBe(Math.min(lines.length, CAN_DO_EVIDENCE_MAX));
        },
      ),
    );
  });

  it('refuses evidence meant for another can-do', () => {
    expect(() =>
      tickCanDo(
        newCanDo(introduce),
        { canDoId: 'ask-whats-wrong', callRecordId: 'c', quote: 'q', witness: 'mei', at },
        HCM,
      ),
    ).toThrow();
  });
});

describe('the Visitor can-dos', () => {
  it('has one per Settling-in chapter, all at Visitor, with valid unique ids', () => {
    expect(SETTLING_CAN_DOS.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const c of SETTLING_CAN_DOS) {
      expect(Id.safeParse(c.id).success).toBe(true);
      expect(c.stage).toBe('visitor');
      expect(c.titleKey).toBe(`cando.${c.id}`);
      expect(settlingCanDoFor(c.chapter)).toBe(c);
      expect(canDoById(c.id)).toBe(c);
    }
    const ids = [...SETTLING_CAN_DOS, ...SEASON_1_CAN_DOS].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('splits four Life (hello, yes or no, again, ordering) and two Work (numbers, about me)', () => {
    expect(SETTLING_CAN_DOS.filter((c) => c.track === 'life').map((c) => c.chapter)).toEqual([
      1, 2, 3, 5,
    ]);
    expect(SETTLING_CAN_DOS.filter((c) => c.track === 'work').map((c) => c.chapter)).toEqual([
      4, 6,
    ]);
  });

  it('shows hello and your name, and asking again, on the Visitor’s card', () => {
    expect(VISITOR_CARD_CAN_DOS.map((c) => c.id)).toEqual([
      'say-hello-and-your-name',
      'ask-again-or-slower',
    ]);
  });

  it('stays out of the Season 1 lists, and ticks like any can-do', () => {
    expect(SEASON_1_CAN_DOS.some((c) => c.stage === 'visitor')).toBe(false);
    expect(canDosForTrack('both')).toHaveLength(12);
    const hello = canDoById('say-hello-and-your-name')!;
    const { canDo, keepsake } = tickCanDo(
      newCanDo(hello),
      {
        canDoId: hello.id,
        callRecordId: 'call_1',
        quote: "Hi! I'm Lan.",
        witness: 'linh',
        at: Date.UTC(2026, 8, 21, 12),
      },
      HCM,
    );
    expect(CanDoProgress.parse(canDo).stage).toBe('visitor');
    expect(keepsake && Keepsake.parse(keepsake).signedBy).toBe('linh');
  });
});
