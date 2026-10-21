import { CallMetrics, type HeardWord } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fluencyDetail, fluencyMetrics, fluencyTrend, longestRunSeconds } from './fluency';

/** Words from `[text, startMs, endMs]` triples. */
const words = (...triples: readonly [string, number, number][]): HeardWord[] =>
  triples.map(([word, startMs, endMs]) => ({ word, startMs, endMs }));

/** `count` evenly spoken words, 300 ms each with 100 ms gaps, starting at `from`. */
const steady = (count: number, from = 0, last = 'word'): HeardWord[] =>
  Array.from({ length: count }, (_, i) => ({
    word: i === count - 1 ? last : 'word',
    startMs: from + i * 400,
    endMs: from + i * 400 + 300,
  }));

describe('fluency metrics', () => {
  it('measures one steady turn', () => {
    // 60 words over 23.9 s: one run, no pauses.
    const detail = fluencyDetail([steady(60)]);
    expect(detail.flowSeconds).toBe(23.9);
    expect(detail.longestRunSeconds).toBe(23.9);
    expect(detail.speakingSeconds).toBe(23.9);
    expect(detail.paceWpm).toBe(151);
    expect(detail.pausesPerMin).toBe(0);
  });

  it('breaks a run at a gap of 1 s or more, not at 0.9 s', () => {
    const turn = words(
      ['I', 0, 200],
      ['went', 300, 600],
      ['to', 1_500, 1_700], // 0.9 s gap: still one run, but a mid-sentence pause
      ['the', 2_700, 2_900], // 1.0 s gap: a new run, and a pause
      ['market.', 3_000, 3_600],
    );
    const detail = fluencyDetail([turn]);
    // Runs of 1.7 s and 0.9 s: Flow is the mean length of run, the longest is kept apart.
    expect(detail.flowSeconds).toBe(1.3);
    expect(detail.longestRunSeconds).toBe(1.7);
    expect(longestRunSeconds([turn])).toBe(1.7);
    expect(detail.pauses).toBe(2);
    expect(detail.speakingSeconds).toBe(3.6);
    expect(detail.paceWpm).toBe(83);
    expect(detail.pausesPerMin).toBe(33.3);
  });

  it('counts only pauses inside a sentence, and only from 0.7 s', () => {
    const turn = words(
      ['It', 0, 200],
      ['was', 800, 1_000], // 0.6 s: not a pause
      ['fine.', 1_700, 2_000], // 0.7 s mid-sentence: a pause
      ['Then', 3_500, 3_800], // 1.5 s after a full stop: a new run, not a pause
      ['what?', 3_900, 4_200],
      ['Okay', 5_000, 5_300], // 0.8 s after a question mark: not a pause
    );
    expect(fluencyDetail([turn]).pauses).toBe(1);
  });

  it('never counts the time between turns, while a character talks', () => {
    const one = steady(10, 0);
    const two = steady(10, 60_000);
    const detail = fluencyDetail([one, two]);
    expect(detail.speakingSeconds).toBe(7.8);
    expect(detail.flowSeconds).toBe(3.9);
    expect(detail.pauses).toBe(0);
  });

  it('gives zeros for silence', () => {
    expect(fluencyMetrics([])).toEqual({ flowSeconds: 0, paceWpm: 0, pausesPerMin: 0 });
    expect(fluencyMetrics([[]])).toEqual({ flowSeconds: 0, paceWpm: 0, pausesPerMin: 0 });
    expect(fluencyMetrics([words(['Hi', 100, 100])])).toEqual({
      flowSeconds: 0,
      paceWpm: 0,
      pausesPerMin: 0,
    });
  });

  it('handles words out of order and always stays in the contract’s ranges', () => {
    const word = fc
      .record({
        start: fc.integer({ min: 0, max: 600_000 }),
        length: fc.integer({ min: 0, max: 2_000 }),
      })
      .map(({ start, length }) => ({ word: 'w', startMs: start, endMs: start + length }));
    fc.assert(
      fc.property(fc.array(fc.array(word, { maxLength: 50 }), { maxLength: 8 }), (turns) => {
        const metrics = fluencyMetrics(turns);
        expect(CallMetrics.safeParse(metrics).success).toBe(true);
        const detail = fluencyDetail(turns);
        expect(detail.longestRunSeconds).toBeLessThanOrEqual(detail.speakingSeconds + 0.1);
        expect(detail.flowSeconds).toBeLessThanOrEqual(detail.longestRunSeconds + 0.1);
      }),
    );
  });
});

describe('fluency trends', () => {
  it('reads longer Flow, quicker Pace and fewer Pauses as better', () => {
    const trend = fluencyTrend(
      { flowSeconds: 20, paceWpm: 100, pausesPerMin: 6 },
      { flowSeconds: 48, paceWpm: 122, pausesPerMin: 3 },
    );
    expect(trend.flow).toEqual({ from: 20, to: 48, changePercent: 140, direction: 'better' });
    expect(trend.pace.changePercent).toBe(22);
    expect(trend.pauses).toEqual({ from: 6, to: 3, changePercent: -50, direction: 'better' });
    const same = fluencyTrend(
      { flowSeconds: 0, paceWpm: 100, pausesPerMin: 2 },
      { flowSeconds: 5, paceWpm: 100, pausesPerMin: 4 },
    );
    expect(same.flow.changePercent).toBeNull();
    expect(same.pace.direction).toBe('same');
    expect(same.pauses.direction).toBe('worse');
  });
});
