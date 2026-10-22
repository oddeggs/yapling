import { PHRASE_STATES, PhraseProgress } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  duePhrases,
  markPipReuse,
  meetPhrase,
  nextDueOn,
  pickPipReuse,
  recordPhraseUse,
  seedPhrase,
  toPhraseProgress,
  fromPhraseProgress,
  usePhrase,
  type PhraseRecord,
  type PhraseUse,
} from './phrases';
import { seededRng } from './rng';
import { DAY_MS, HOUR_MS, instantOf } from './time';

const HCM = 'Asia/Ho_Chi_Minh';
/** 09:00 on a day of the learner's first weeks (day 0 is Monday 21 September). */
const on = (day: number, hour = 9): number =>
  instantOf('2026-09-21', '00:00', HCM) + day * DAY_MS + hour * HOUR_MS;

const correct = (day: number, extra: Partial<PhraseUse> = {}): PhraseUse => ({
  at: on(day),
  correct: true,
  prompted: true,
  contextId: 's1-e1',
  ...extra,
});

const run = (uses: readonly PhraseUse[], start = seedPhrase('can-i-help', 'Can I help?', on(0))) =>
  uses.reduce<PhraseRecord>((p, u) => usePhrase(p, u, HCM).phrase, start);

describe('the phrase lifecycle', () => {
  it('meets a phrase as a seed, once', () => {
    const first = meetPhrase([], { id: 'whats-wrong', text: "What's wrong?", at: on(1) });
    expect(first.met).toBe(true);
    expect(first.phrases[0]?.state).toBe('seed');
    const again = meetPhrase(first.phrases, {
      id: 'whats-wrong',
      text: "What's wrong?",
      at: on(3),
    });
    expect(again.met).toBe(false);
    expect(again.phrases).toBe(first.phrases);
  });

  it('sprouts on the first correct use and ignores incorrect ones', () => {
    const seed = seedPhrase('can-i-help', 'Can I help?', on(0));
    expect(usePhrase(seed, correct(1, { correct: false }), HCM)).toEqual({
      phrase: seed,
      events: [],
    });
    const { phrase, events } = usePhrase(seed, correct(1), HCM);
    expect(phrase.state).toBe('sprout');
    expect(events).toEqual(['used', 'sprouted']);
  });

  it('leafs only on a different calendar day in the learner’s timezone', () => {
    const sprout = run([correct(1)]);
    expect(usePhrase(sprout, correct(1, { at: on(1, 20) }), HCM).phrase.state).toBe('sprout');
    // 23:30 local on day 1 is 16:30 UTC: still the same local day.
    expect(usePhrase(sprout, correct(1, { at: on(1, 23.5) }), HCM).phrase.state).toBe('sprout');
    // 00:30 local the next day.
    const leaf = usePhrase(sprout, correct(2, { at: on(2, 0.5) }), HCM);
    expect(leaf.phrase.state).toBe('leaf');
    expect(leaf.events).toEqual(['used', 'leafed']);
  });

  it.each([
    ['unprompted in a new context 14 days after seed', 14, false, 's1-e3', 'bloom'],
    ['13 days after seed', 13, false, 's1-e3', 'leaf'],
    ['when prompted', 20, true, 's1-e3', 'leaf'],
    ['in a context already used', 20, false, 's1-e1', 'leaf'],
  ] as const)('blooms %s → %s', (_, day, prompted, contextId, state) => {
    const leaf = run([correct(1), correct(2)]);
    expect(leaf.state).toBe('leaf');
    expect(usePhrase(leaf, correct(day, { prompted, contextId }), HCM).phrase.state).toBe(state);
  });

  it('moves at most one state per use and never back, and stays valid for the contract', () => {
    const use = fc.record({
      day: fc.integer({ min: 0, max: 60 }),
      hour: fc.integer({ min: 0, max: 23 }),
      correct: fc.boolean(),
      prompted: fc.boolean(),
      contextId: fc.constantFrom('s1-e1', 's1-e2', 'real-week-1', 'practice-1'),
    });
    fc.assert(
      fc.property(fc.array(use, { maxLength: 30 }), (uses) => {
        let phrase = seedPhrase('can-i-help', 'Can I help?', on(0));
        for (const u of [...uses].sort((a, b) => a.day - b.day || a.hour - b.hour)) {
          const before = PHRASE_STATES.indexOf(phrase.state);
          phrase = usePhrase(phrase, { ...u, at: on(u.day, u.hour) }, HCM).phrase;
          const after = PHRASE_STATES.indexOf(phrase.state);
          expect(after - before).toBeGreaterThanOrEqual(0);
          expect(after - before).toBeLessThanOrEqual(1);
          expect(PhraseProgress.safeParse(toPhraseProgress(phrase)).success).toBe(true);
        }
      }),
    );
  });

  it('grows the same through the progress body as in memory, use after use', () => {
    const use = fc.record({
      day: fc.integer({ min: 0, max: 60 }),
      correct: fc.boolean(),
      prompted: fc.boolean(),
      contextId: fc.constantFrom('s1-e1', 's1-e2', 'real-week-1', 'practice-1'),
    });
    fc.assert(
      fc.property(fc.array(use, { maxLength: 30 }), (uses) => {
        let memory = seedPhrase('can-i-help', 'Can I help?', on(0));
        let wire = toPhraseProgress(memory);
        for (const u of [...uses].sort((a, b) => a.day - b.day)) {
          const at = on(u.day);
          memory = usePhrase(memory, { ...u, at }, HCM).phrase;
          wire = toPhraseProgress(usePhrase(fromPhraseProgress(wire), { ...u, at }, HCM).phrase);
          expect(wire).toEqual(toPhraseProgress(memory));
        }
      }),
    );
  });

  it('keeps a seen context from blooming again after the round trip', () => {
    const leaf = run([correct(1), correct(2, { contextId: 's1-e2' })]);
    const back = fromPhraseProgress(toPhraseProgress(leaf));
    expect(back.contexts).toEqual(leaf.contexts);
    expect(
      usePhrase(back, correct(20, { prompted: false, contextId: 's1-e2' }), HCM).phrase.state,
    ).toBe('leaf');
    expect(
      usePhrase(back, correct(20, { prompted: false, contextId: 'new' }), HCM).phrase.state,
    ).toBe('bloom');
  });

  it('keeps when Pip last reused a phrase through the progress body, so it rests a week', () => {
    const sprout = run([correct(1)]);
    const reused = markPipReuse(sprout, on(3));
    const wire = toPhraseProgress(reused);
    expect(wire.pipReusedAt).toBe(on(3));
    expect(PhraseProgress.parse(wire)).toEqual(wire);
    const back = fromPhraseProgress(PhraseProgress.parse(JSON.parse(JSON.stringify(wire))));
    expect(back.pipReusedAt).toBe(on(3));
    expect(pickPipReuse([back], on(5), HCM, seededRng(1))).toBeNull();
    expect(pickPipReuse([back], on(10), HCM, seededRng(1))?.id).toBe(sprout.id);
  });

  it('reads a body without the reuse time as never reused, and leaves it out until there is one', () => {
    const sprout = run([correct(1)]);
    const wire = toPhraseProgress(sprout);
    expect('pipReusedAt' in wire).toBe(false);
    expect(fromPhraseProgress(wire).pipReusedAt).toBeNull();
    expect(fromPhraseProgress({ ...wire, pipReusedAt: null }).pipReusedAt).toBeNull();
  });

  it('meets an unknown phrase when the learner uses it first', () => {
    const result = recordPhraseUse([], { id: 'deal', text: 'Deal' }, correct(4), HCM);
    expect(result.events).toEqual(['met', 'used', 'sprouted']);
    expect(result.phrases[0]?.state).toBe('sprout');
    expect(
      recordPhraseUse([], { id: 'deal', text: 'Deal' }, correct(4, { correct: false }), HCM),
    ).toEqual({ phrases: [], events: [] });
  });
});

describe('due phrases and spacing', () => {
  it('is due at once as a seed, then 1, 3 and 7 days after the last use', () => {
    const seed = seedPhrase('can-i-help', 'Can I help?', on(0));
    expect(nextDueOn(seed, HCM)).toBe('2026-09-21');
    expect(nextDueOn(run([correct(1)]), HCM)).toBe('2026-09-23');
    expect(nextDueOn(run([correct(1), correct(2)]), HCM)).toBe('2026-09-26');
    expect(nextDueOn(run([correct(1), correct(2), correct(5)]), HCM)).toBe('2026-10-03');
    expect(
      nextDueOn(
        run([correct(1), correct(2), correct(14, { prompted: false, contextId: 'x' })]),
        HCM,
      ),
    ).toBeNull();
  });

  it('never wilts: a phrase left alone for months keeps its state and is simply due', () => {
    const leaf = run([correct(1), correct(2)]);
    const months = on(200);
    const due = duePhrases([leaf], months, HCM);
    expect(due).toEqual([leaf]);
    expect(due[0]?.state).toBe('leaf');
  });

  it('offers the longest overdue first, the week’s phrases before all, up to the limit', () => {
    const a = run([correct(1)], seedPhrase('a', 'A', on(0))); // due day 2
    const b = run([correct(1), correct(2)], seedPhrase('b', 'B', on(0))); // due day 5
    const c = seedPhrase('c', 'C', on(6)); // due day 6
    const d = run([correct(6)], seedPhrase('d', 'D', on(5))); // due day 7
    const picked = duePhrases([d, c, b, a], on(6), HCM).map((p) => p.id);
    expect(picked).toEqual(['a', 'b', 'c']);
    expect(
      duePhrases([d, c, b, a], on(6), HCM, { always: ['d'], limit: 2 }).map((p) => p.id),
    ).toEqual(['d', 'a']);
  });
});

describe('Pip reuses a phrase slightly wrong', () => {
  const sprout = run([correct(1)], seedPhrase('can-i-help', 'Can I help?', on(0)));
  const seed = seedPhrase('i-need-a-plan', 'I need a plan', on(0));

  it('picks a phrase the learner has used on an earlier day', () => {
    expect(pickPipReuse([seed, sprout], on(5), HCM, seededRng(1))?.id).toBe('can-i-help');
    expect(pickPipReuse([seed, sprout], on(1, 20), HCM, seededRng(1))).toBeNull();
    expect(pickPipReuse([seed], on(5), HCM, seededRng(1))).toBeNull();
  });

  it('rests a phrase for a week after Pip reused it', () => {
    const reused = markPipReuse(sprout, on(5));
    expect(pickPipReuse([reused], on(8), HCM, seededRng(1))).toBeNull();
    expect(pickPipReuse([reused], on(12), HCM, seededRng(1))?.id).toBe('can-i-help');
  });

  it('is replayable with the same seed and only picks used phrases', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: 1, max: 8 }), (seedValue, n) => {
        const phrases = Array.from({ length: n }, (_, i) =>
          i % 2 === 0
            ? run([correct(1)], seedPhrase(`p${i}`, `P${i}`, on(0)))
            : seedPhrase(`p${i}`, `P${i}`, on(0)),
        );
        const first = pickPipReuse(phrases, on(4), HCM, seededRng(seedValue));
        expect(pickPipReuse(phrases, on(4), HCM, seededRng(seedValue))).toEqual(first);
        expect(first?.state).toBe('sprout');
      }),
    );
  });
});
