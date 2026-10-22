import { describe, expect, it } from '@jest/globals';
import type { CanDoProgress, PhraseProgress, RingSlotKind, WeekRing } from '@yapling/contracts';
import { translator } from '@yapling/i18n';

import {
  phrasesGrown,
  seasonEndedOn,
  seasonKeepsake,
  weekDates,
  weekWrap,
  weekdayOf,
  type WrapInput,
} from '../../src/features/payoff/wrap-model';

const vi = translator('vi');
const en = translator('en');

/** Story day 1: Monday 7 Sep 2026, in Hanoi. */
const STARTED_ON = '2026-09-07';
const TZ = 'Asia/Ho_Chi_Minh';
/** Noon in Hanoi on story day `day`. */
const at = (day: number) => Date.UTC(2026, 8, 7, 5) + (day - 1) * 86_400_000;
const dateOf = (day: number) => new Date(at(day)).toISOString().slice(0, 10);

const KINDS: readonly RingSlotKind[] = ['episode', 'real_week', 'practice'];

/** Weeks 1…n; `done(week)` lists the kinds done that week. */
function weeks(n: number, done: (week: number) => readonly RingSlotKind[]): WeekRing[] {
  return Array.from({ length: n }, (_, i) => ({
    week: i + 1,
    slots: KINDS.map((kind) =>
      done(i + 1).includes(kind)
        ? {
            kind,
            status: 'done' as const,
            sceneId: null,
            callRecordId: `w${i + 1}-${kind}`,
            doneAt: at(i * 7 + 1 + KINDS.indexOf(kind)),
          }
        : { kind, status: 'open' as const, sceneId: null, callRecordId: null, doneAt: null },
    ),
  }));
}
const all = () => KINDS;

function phrase(
  id: string,
  text: string,
  times: Partial<Record<'sprout' | 'leaf' | 'bloom', number>>,
) {
  const reached = times.bloom ? 'bloom' : times.leaf ? 'leaf' : times.sprout ? 'sprout' : 'seed';
  const last = times.bloom ?? times.leaf ?? times.sprout ?? null;
  return {
    id,
    text,
    state: reached,
    seedAt: at(1),
    sproutAt: times.sprout ? at(times.sprout) : null,
    leafAt: times.leaf ? at(times.leaf) : null,
    bloomAt: times.bloom ? at(times.bloom) : null,
    lastUsedAt: last ? at(last) : null,
    usedOn: last ? [dateOf(last)] : [],
    contexts: [],
  } satisfies PhraseProgress;
}

const ticked = (id: string, day: number): CanDoProgress => ({
  id,
  stage: 'newcomer',
  status: 'ticked',
  evidence: [{ callRecordId: 'c', quote: 'q', at: at(day) }],
  witness: 'nell',
  tickedOn: dateOf(day),
});

const input = (over: Partial<WrapInput> = {}): WrapInput => ({
  week: 4,
  progress: {
    phrases: [
      phrase('whats-wrong', "What's wrong?", { sprout: 3, leaf: 6, bloom: 23 }),
      phrase('what-do-you-think', 'What do you think?', { sprout: 23, leaf: 26 }),
      phrase('to-sum-up', 'To sum up,…', { sprout: 27 }),
      phrase('how-about', 'How about…?', { sprout: 16, leaf: 19 }),
    ],
    canDos: [ticked('say-no-politely', 15), ticked('agree-disagree-kindly', 22)],
    weeks: weeks(4, all),
  },
  startedOn: STARTED_ON,
  timezone: TZ,
  today: dateOf(28),
  ...over,
});

describe('the week’s wrap', () => {
  it('names the week, its episode and the full ring with its keepsake and the lifetime count', () => {
    const wrap = weekWrap(input(), vi);
    expect(wrap.title).toBe('Xong tuần 4 rồi');
    expect(wrap.kicker).toBe('Tập 4 · The Plan');
    expect(wrap.ring).toEqual({ week: 4, before: 3, after: 3, total: 3, full: true });
    expect(wrap.ringLine).toBe('Vòng tuần đã đầy. Kỷ vật đã treo trên tường.');
    expect(wrap.rings).toBe('Đã đầy 4 vòng tuần');
  });

  it('shows only the phrases that grew this week, from where they were to the highest they reached', () => {
    const wrap = weekWrap(input(), en);
    expect(
      wrap.phrases?.tiles.map((p) => [p.id, p.from, p.to, p.stage, p.artFrom, p.artTo]),
    ).toEqual([
      ['whats-wrong', 'leaf', 'bloom', 'Bloom', 'plant-1', 'plant-2'],
      ['what-do-you-think', 'seed', 'leaf', 'Leaf', 'seed', 'plant-1'],
      ['to-sum-up', 'seed', 'sprout', 'Sprout', 'seed', 'plant-0'],
    ]);
    expect(wrap.phrases?.title).toBe('PHRASES THAT GREW THIS WEEK');
  });

  it('ticks the can-dos shown this week, not the ones from earlier weeks', () => {
    expect(weekWrap(input(), en).canDos).toEqual({
      title: 'NEW THINGS YOU CAN DO',
      items: [{ id: 'agree-disagree-kindly', title: 'Agree and disagree kindly' }],
    });
  });

  it('says when the next episode opens, by its weekday', () => {
    const wrap = weekWrap(
      {
        ...input(),
        progress: { ...input().progress, weeks: weeks(5, (w) => (w <= 4 ? KINDS : [])) },
      },
      vi,
    );
    // Week 5 starts on story day 29, a Monday.
    expect(wrap.next).toEqual({ tag: 'TIẾP THEO', text: 'Tập 5 mở vào Thứ Hai' });
    expect(weekdayOf('2026-10-05', en)).toBe('Monday');
  });

  it('says an episode already open is waiting, never that it was missed', () => {
    const missedThree = weeks(4, (w) => (w === 3 ? [] : w === 4 ? ['real_week'] : KINDS));
    const wrap = weekWrap(
      { ...input(), progress: { ...input().progress, weeks: missedThree } },
      en,
    );
    expect(wrap.next?.text).toBe('Episode 3 is open and waiting for you');
    expect(wrap.ring).toMatchObject({ after: 1, full: false });
    expect(wrap.ringLine).toBe('1 call this week. The rest will wait for you.');
    expect(wrap.rings).toBe('2 full rings so far');
  });

  it('is kind about a week with no calls and nothing grown', () => {
    const quiet = weekWrap(
      {
        ...input(),
        week: 2,
        progress: { phrases: [], canDos: [], weeks: weeks(2, (w) => (w === 1 ? KINDS : [])) },
        today: dateOf(14),
      },
      vi,
    );
    expect(quiet.ringLine).toBe('Các cuộc gọi tuần này đang chờ bạn, lúc nào cũng được.');
    expect(quiet.phrases).toBeNull();
    expect(quiet.canDos).toBeNull();
    expect(quiet.quiet).toBe('Một tuần nhẹ nhàng. Mọi thứ vẫn ở đây chờ bạn.');
    expect(quiet.seasonDone).toBe(false);
    expect(quiet.cta).toBe('Về hang');
  });

  it('points to Bunting Week after the last episode and goes on to the season’s end', () => {
    const wrap = weekWrap(
      {
        ...input(),
        week: 6,
        progress: { ...input().progress, weeks: weeks(6, all) },
        today: dateOf(42),
      },
      en,
    );
    expect(wrap.kicker).toBe('Episode 6 · The Town Meeting');
    expect(wrap.next?.text).toBe('Bunting Week opens on Monday');
    expect(wrap.seasonDone).toBe(true);
    expect(wrap.cta).toBe('Continue');
  });

  it('counts its days from the story’s start, in the learner’s timezone', () => {
    expect(weekDates(STARTED_ON, 4)).toEqual({ from: '2026-09-28', to: '2026-10-04' });
    // Just before midnight in Hanoi on day 21 is still week 3.
    const late = {
      ...phrase('x', 'x', {}),
      state: 'sprout' as const,
      sproutAt: Date.UTC(2026, 8, 27, 16, 59),
      lastUsedAt: Date.UTC(2026, 8, 27, 16, 59),
      usedOn: ['2026-09-27'],
    };
    expect(phrasesGrown([late], weekDates(STARTED_ON, 4), TZ)).toEqual([]);
    expect(phrasesGrown([late], weekDates(STARTED_ON, 3), TZ)).toHaveLength(1);
  });
});

describe('the season keepsake', () => {
  const learner = { name: 'Lan', roommateName: 'Pip' };

  it('waits until every episode of the season is played', () => {
    expect(
      seasonEndedOn(
        weeks(6, (w) => (w === 6 ? ['real_week'] : KINDS)),
        TZ,
      ),
    ).toBeNull();
    expect(seasonKeepsake(weeks(5, all), learner, TZ, vi)).toBeNull();
  });

  it('is drawn by the roommate and signed by Mei on the day the last episode was played', () => {
    const keepsake = seasonKeepsake(
      weeks(6, (w) => (w === 6 ? ['episode'] : KINDS)),
      learner,
      TZ,
      vi,
    );
    expect(keepsake).toMatchObject({
      tag: 'MÙA MỘT',
      title: 'Mùa Một đã xong!',
      stamp: 'SEASON ONE',
      cta: 'Treo lên tường',
      certificate: {
        id: 'season-1',
        heading: 'Lan helped…',
        canDo: 'keep the Lantern Café open!',
        witnessed: 'signed by Mei · Oct 12',
        witness: 'mei',
        earnedOn: '2026-10-12',
        track: null,
      },
    });
  });
});
