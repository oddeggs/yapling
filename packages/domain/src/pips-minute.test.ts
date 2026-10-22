import { PHRASE_STATES } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  duePhrases,
  pickPipReuse,
  recordPhraseUse,
  seedPhrase,
  type PhraseRecord,
} from './phrases';
import { hasPipsMinute, pipsMinuteFor, recordPipsMinute } from './pips-minute';
import { seededRng } from './rng';
import { DAY_MS, HOUR_MS, instantOf } from './time';

const HCM = 'Asia/Ho_Chi_Minh';
const on = (day: number, hour = 19): number =>
  instantOf('2026-09-21', '00:00', HCM) + (day - 1) * DAY_MS + hour * HOUR_MS;

/** A phrase met on `metDay` and used correctly on each of `usedDays`. */
const phrase = (id: string, metDay: number, usedDays: readonly number[] = []): PhraseRecord => {
  let phrases: readonly PhraseRecord[] = [seedPhrase(id, id, on(metDay, 9))];
  for (const d of usedDays) {
    phrases = recordPhraseUse(
      phrases,
      { id, text: id },
      { at: on(d), correct: true, prompted: true, contextId: `call-${d}` },
      HCM,
    ).phrases;
  }
  return phrases[0]!;
};

describe('Pip’s minute', () => {
  it('isn’t offered when nothing is due', () => {
    // Used today: next due tomorrow. A bloom is never due.
    const usedToday = phrase('whats-wrong', 1, [10]);
    const bloom: PhraseRecord = { ...phrase('can-i-help', 1, [2, 3]), state: 'bloom' };
    expect(pipsMinuteFor([usedToday, bloom], on(10), HCM, seededRng(1))).toBeNull();
    expect(hasPipsMinute([usedToday, bloom], on(10), HCM)).toBe(false);
    expect(hasPipsMinute([], on(10), HCM)).toBe(false);
  });

  it('sets up the most overdue phrase, from any week, Settling in’s included', () => {
    const phrases = [
      phrase('i-need-a-plan', 8, [8]), // due day 9
      phrase('nice-to-meet-you', 1, [1, 2]), // due day 5
      phrase('can-i-help', 9), // a seed, due day 9
    ];
    const minute = pipsMinuteFor(phrases, on(12), HCM, seededRng(1));
    expect(minute?.due.id).toBe('nice-to-meet-you');
    expect(minute?.due).toBe(duePhrases(phrases, on(12), HCM, { limit: 1 })[0]);
    expect(hasPipsMinute(phrases, on(12), HCM)).toBe(true);
  });

  it('only sets up a phrase with a set-up line, and reuses one with a wrong line', () => {
    const phrases = [
      phrase('nice-to-meet-you', 1, [1, 2]),
      phrase('whats-wrong', 2, [2]),
      phrase('i-think-you-should', 3, [3]),
    ];
    const minute = pipsMinuteFor(phrases, on(12), HCM, seededRng(4), {
      hasSetUp: (id) => id !== 'nice-to-meet-you',
      hasWrongLine: (id) => id === 'nice-to-meet-you',
    });
    expect(minute?.due.id).toBe('whats-wrong');
    expect(minute?.reuse?.id).toBe('nice-to-meet-you');
    // Nothing with a set-up line: no Pip’s minute.
    expect(pipsMinuteFor(phrases, on(12), HCM, seededRng(4), { hasSetUp: () => false })).toBeNull();
  });

  it('reuses a different phrase from the one it sets up, or none (one turn only)', () => {
    const only = [phrase('whats-wrong', 1, [2])];
    const minute = pipsMinuteFor(only, on(12), HCM, seededRng(1));
    expect(minute).toEqual({ due: only[0], reuse: null });
  });

  it('grows the phrases it practises, and Pip rests the one it reused for a week', () => {
    const seed = phrase('can-i-help', 8);
    const sprout = phrase('whats-wrong', 2, [2]);
    const minute = { due: seed, reuse: sprout };
    const r = recordPipsMinute(
      [seed, sprout],
      minute,
      { at: on(10), sceneId: 's1-pips-minute', dueSaid: true, reuseFixed: true },
      HCM,
    );
    expect(r.events).toEqual([
      { phraseId: 'can-i-help', events: ['used', 'sprouted'] },
      { phraseId: 'whats-wrong', events: ['used', 'leafed'] },
    ]);
    const reused = r.phrases.find((p) => p.id === 'whats-wrong');
    expect(reused?.pipReusedAt).toBe(on(10));
    expect(pickPipReuse(r.phrases, on(15), HCM, seededRng(1))?.id).not.toBe('whats-wrong');
  });

  it('changes nothing for a turn not passed, and skips turn two when it wasn’t played', () => {
    const seed = phrase('can-i-help', 8);
    const sprout = phrase('whats-wrong', 2, [2]);
    const missed = recordPipsMinute(
      [seed, sprout],
      { due: seed, reuse: sprout },
      { at: on(10), sceneId: 's1-pips-minute', dueSaid: false, reuseFixed: null },
      HCM,
    );
    expect(missed.phrases).toEqual([seed, sprout]);
    expect(missed.events).toEqual([{ phraseId: 'can-i-help', events: [] }]);
  });

  it('never makes a bloom, whatever the phrases and however it goes', () => {
    const record = fc.record({
      met: fc.integer({ min: 1, max: 40 }),
      used: fc.uniqueArray(fc.integer({ min: 1, max: 60 }), { maxLength: 4 }),
      state: fc.constantFrom(...PHRASE_STATES),
    });
    fc.assert(
      fc.property(
        fc.array(record, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 20, max: 90 }),
        fc.integer(),
        fc.boolean(),
        fc.option(fc.boolean(), { nil: null }),
        (records, today, seed, dueSaid, reuseFixed) => {
          const phrases = records.map((p, i) => {
            const grown = phrase(
              `p${i}`,
              p.met,
              [...p.used].sort((a, b) => a - b),
            );
            return p.state === 'bloom' ? { ...grown, state: 'bloom' as const } : grown;
          });
          const minute = pipsMinuteFor(phrases, on(today), HCM, seededRng(seed));
          expect(minute !== null).toBe(hasPipsMinute(phrases, on(today), HCM));
          if (minute === null) return;
          expect(minute.due.state).not.toBe('bloom');
          expect(minute.reuse?.id).not.toBe(minute.due.id);
          const r = recordPipsMinute(
            phrases,
            minute,
            { at: on(today), sceneId: 's1-pips-minute', dueSaid, reuseFixed },
            HCM,
          );
          for (const e of r.events) expect(e.events).not.toContain('bloomed');
          const blooms = (ps: readonly PhraseRecord[]) => ps.filter((p) => p.state === 'bloom');
          expect(blooms(r.phrases).map((p) => p.id)).toEqual(blooms(phrases).map((p) => p.id));
        },
      ),
    );
  });
});
