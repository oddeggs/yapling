import { describe, expect, it } from '@jest/globals';
import type {
  PhraseProgress,
  Progress,
  RingSlot,
  RingSlotKind,
  WeekRing,
} from '@yapling/contracts';

import { pipsMinuteToday } from '../../src/data/pips-minute';
import { currentWeek } from '../../src/data/week';
import { emptyProgress, FakeApi, launch, newPhone } from './fake-api';
import { FULL_SEASON } from './season-fixture';

/*
 * The learner's weeks after the first, through the app's data: the story week and the calls still
 * waiting as `useWeek` reads them from the progress store, the ring opened on the server on the
 * season's days, and whether Pip's minute has a phrase today.
 */

const TZ = 'Asia/Ho_Chi_Minh';
const DAY = 86_400_000;
/** The story started on 1 Oct: story day N is N Oct, at 10:00 in Ho Chi Minh City. */
const STARTED = '2026-10-01';
const dayAt = (day: number): number => Date.UTC(2026, 9, day, 3, 0, 0);

const slot = (kind: RingSlotKind, status: 'open' | 'done', sceneId: string | null): RingSlot => ({
  kind,
  status,
  sceneId,
  callRecordId: status === 'done' ? `c-${sceneId ?? kind}` : null,
  doneAt: status === 'done' ? 1 : null,
});
const fullRing = (week: number): WeekRing => ({
  week,
  slots: [
    slot('episode', 'done', `s1-e${week}`),
    slot('real_week', 'done', `s1-e${week}-real-week`),
    slot('practice', 'done', `s1-e${week}-practice`),
  ],
});

async function learnerWith(progress: Partial<Progress>) {
  const api = new FakeApi();
  const phone = newPhone();
  const data = launch(api, phone, undefined, undefined, { season: FULL_SEASON });
  await data.start();
  const userId = data.session.state.session?.userId ?? '';
  api.progress.set(userId, { ...emptyProgress(), ...progress });
  await data.progress.refresh();
  return { api, phone, data };
}

describe('a learner in week 4 with week 3’s practice call still open', () => {
  const weeks: readonly WeekRing[] = [
    fullRing(1),
    fullRing(2),
    {
      week: 3,
      slots: [
        slot('episode', 'done', 's1-e3'),
        slot('real_week', 'done', 's1-e3-real-week'),
        slot('practice', 'open', 's1-e3-practice'),
      ],
    },
  ];

  it('reads both from the progress store, and again offline from the cache', async () => {
    const { api, phone, data } = await learnerWith({ weeks: [...weeks], dayIndex: 22 });
    const read = (progress: Progress | null) => {
      if (progress === null) throw new Error('no progress');
      return currentWeek(progress, dayAt(23), TZ, STARTED, data.season);
    };
    const week = read(data.progress.resource.data);
    expect(week).toMatchObject({ week: 4, dayOfWeek: 2, behind: false });
    expect(week.ring.slots.map((s) => [s.kind, s.status])).toEqual([
      ['episode', 'open'],
      ['real_week', 'upcoming'],
      ['practice', 'upcoming'],
    ]);
    expect(week.waiting).toEqual([
      { week: 3, kind: 'practice', sceneId: 's1-e3-practice', opensOn: '2026-10-18' },
    ]);

    // Another launch with the API away reads the same week from the cache.
    api.offline = true;
    const again = launch(api, phone, undefined, undefined, { season: FULL_SEASON });
    await again.start();
    const offline = read(again.progress.resource.data);
    expect(offline.week).toBe(4);
    expect(offline.waiting.map((w) => [w.week, w.kind])).toEqual([[3, 'practice']]);
  });

  it('opens week 4’s calls on the server on their days, leaving week 3’s waiting', async () => {
    const { api, data } = await learnerWith({ weeks: [...weeks], dayIndex: 22 });
    await data.progress.openRing(25);
    const saved = api.requests('PUT', '/api/me/progress').map((c) => c.body as Progress);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.weeks[2]?.slots[2]).toMatchObject({
      status: 'open',
      sceneId: 's1-e3-practice',
    });
    expect(saved[0]?.weeks[3]?.slots.map((s) => [s.status, s.sceneId])).toEqual([
      ['open', 's1-e4'],
      ['open', 's1-e4-real-week'],
      ['open', 's1-e4-practice'],
    ]);
  });
});

describe('the ring opened on the server', () => {
  it('opens a call on the day its scene arrives, not the usual day', async () => {
    // Week 5's practice call arrives on its sixth day.
    const { api, data } = await learnerWith({ weeks: [1, 2, 3, 4].map(fullRing), dayIndex: 29 });
    await data.progress.openRing(32);
    const week5 = data.progress.resource.data?.weeks[4];
    expect(week5?.slots.map((s) => s.status)).toEqual(['open', 'open', 'upcoming']);
    await data.progress.openRing(34);
    expect(data.progress.resource.data?.weeks[4]?.slots[2]?.status).toBe('open');
    expect(api.requests('PUT', '/api/me/progress')).toHaveLength(2);
  });

  it('opens week 1 on the first week’s days, as before', async () => {
    const { data } = await learnerWith({});
    await data.progress.openRing(3);
    expect(data.progress.resource.data?.weeks[0]?.slots.map((s) => s.status)).toEqual([
      'open',
      'upcoming',
      'upcoming',
    ]);
    await data.progress.openRing(5);
    expect(data.progress.resource.data?.weeks[0]?.slots.map((s) => s.status)).toEqual([
      'open',
      'open',
      'open',
    ]);
  });
});

const phrase = (id: string, over: Partial<PhraseProgress> = {}): PhraseProgress => ({
  id,
  text: id,
  state: 'seed',
  seedAt: dayAt(20),
  sproutAt: null,
  leafAt: null,
  bloomAt: null,
  lastUsedAt: null,
  usedOn: [],
  contexts: [],
  ...over,
});

describe('Pip’s minute today', () => {
  const sprout = phrase('can-i-help', {
    state: 'sprout',
    sproutAt: dayAt(22),
    lastUsedAt: dayAt(22),
    usedOn: ['2026-10-22'],
    contexts: ['s1-e4'],
  });
  const bloom = phrase('see-you', {
    state: 'bloom',
    sproutAt: dayAt(1),
    leafAt: dayAt(3),
    bloomAt: dayAt(18),
    lastUsedAt: dayAt(18),
    usedOn: ['2026-10-01', '2026-10-04', '2026-10-18'],
  });
  const progress = (phrases: readonly PhraseProgress[]): Progress => ({
    ...emptyProgress(),
    phrases: [...phrases],
  });

  it('has nothing when the learner has no phrases, or only blooms', () => {
    expect(pipsMinuteToday(progress([]), dayAt(22), TZ)).toBe(false);
    expect(pipsMinuteToday(progress([bloom]), dayAt(22), TZ)).toBe(false);
  });

  it('has a phrase on the day one is due, not the day it was used', () => {
    expect(pipsMinuteToday(progress([sprout, bloom]), dayAt(22), TZ)).toBe(false);
    expect(pipsMinuteToday(progress([sprout, bloom]), dayAt(22) + DAY, TZ)).toBe(true);
    // A seed is due the day it is met.
    expect(pipsMinuteToday(progress([phrase('nice-to-meet-you')]), dayAt(20), TZ)).toBe(true);
  });

  it('only sets up a phrase the story has a set-up line for', () => {
    const lines = { hasSetUp: (id: string) => id !== 'can-i-help' };
    expect(pipsMinuteToday(progress([sprout]), dayAt(23), TZ, lines)).toBe(false);
    expect(pipsMinuteToday(progress([sprout, phrase('yes-please')]), dayAt(23), TZ, lines)).toBe(
      true,
    );
  });

  it('reads the learner’s phrases from the progress store', async () => {
    const { data } = await learnerWith({ phrases: [sprout] });
    const now = dayAt(23);
    const stored = data.progress.resource.data ?? emptyProgress();
    expect(pipsMinuteToday(stored, now, TZ, data.pipsMinuteLines)).toBe(true);
  });
});
