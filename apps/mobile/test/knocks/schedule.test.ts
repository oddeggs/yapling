import { describe, expect, it, jest } from '@jest/globals';
import { instantOf } from '@yapling/domain';

import type { KnockInputs } from '../../src/features/knocks/inputs';
import {
  knockDataOf,
  knockPath,
  planKnockRequests,
  type KnockClock,
} from '../../src/features/knocks/plan';
import {
  cancelKnocks,
  fireTestKnock,
  syncKnocks,
  toNotificationRequest,
} from '../../src/features/knocks/scheduler';
import { FakePhone } from './fakes';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

const tz = 'Asia/Ho_Chi_Minh';
const installedOn = '2026-10-20';

const learner = (over: Partial<KnockInputs> = {}): KnockInputs => ({
  installedOn,
  timezone: tz,
  notificationsAllowed: true,
  lastOpenedAt: null,
  completedEpisodes: [],
  roommateName: 'Bơ',
  ...over,
});

const at = (date: string, time: string) => instantOf(date, time, tz);
const clock = (over: Partial<KnockClock> = {}): KnockClock => ({
  now: at(installedOn, '10:00'),
  offsetMs: 0,
  cameBackAfterAway: false,
  ...over,
});

const when = (knocks: readonly { day: number; date: string; time: string }[]) =>
  knocks.map((k) => `${k.day} ${k.date} ${k.time}`);

describe('the week of knocks', () => {
  it('schedules days 2 to 8 at their times, titled by who knocks', () => {
    const knocks = planKnockRequests(learner(), 'en', clock());
    expect(when(knocks)).toEqual([
      '2 2026-10-21 08:12',
      '3 2026-10-22 12:40',
      '4 2026-10-23 08:05',
      '5 2026-10-24 08:30',
      '6 2026-10-25 19:20',
      '7 2026-10-26 10:02',
      // Planned on day 1: if this is the last open, day 8 finds the learner three days away.
      '8 2026-10-27 08:40',
    ]);
    expect(knocks[0]?.fireAt).toBe(at('2026-10-21', '08:12'));
    expect(knocks.map((k) => k.title)).toEqual([
      'Bơ',
      'Yapling',
      'Bơ',
      'Bea',
      'Yapling',
      'Yapling',
      'Bơ',
    ]);
    expect(knocks[1]?.body).toBe('Bơ got lost today. It has a story for you.');
    expect(knocks.every((k) => k.identifier.startsWith('knock-'))).toBe(true);
  });

  it('opens each knock on its day with what it announced in focus', () => {
    const knocks = planKnockRequests(learner(), 'en', clock());
    expect(knocks[0]?.data).toEqual({ kind: 'knock', day: 2, url: '/?day=2&focus=episode_call' });
    expect(knocks[1]?.data.url).toBe('/?day=3&focus=pip_story');
    expect(knockPath(6)).toBe('/?day=6&focus=voicemail');
  });

  it('leaves out knocks already past', () => {
    const knocks = planKnockRequests(learner(), 'en', clock({ now: at('2026-10-22', '13:00') }));
    expect(knocks.map((k) => k.day)).toEqual([4, 5, 6, 7, 8]);
  });

  it('moves a knock out of quiet hours to when they end', () => {
    const late = planKnockRequests(
      learner({ quietHours: { start: '21:00', end: '09:00' } }),
      'en',
      clock(),
    );
    expect(when(late).slice(0, 2)).toEqual(['2 2026-10-21 09:00', '3 2026-10-22 12:40']);
    const evening = planKnockRequests(
      learner({ quietHours: { start: '19:00', end: '20:00' } }),
      'en',
      clock(),
    );
    expect(when(evening).find((k) => k.startsWith('6 '))).toBe('6 2026-10-25 20:00');
  });

  it('follows the learner’s quiet hours, and moves nothing when they have none', () => {
    const early = { quietHours: { start: '06:00', end: '08:20' } } as const;
    expect(when(planKnockRequests(learner(early), 'en', clock()))[0]).toBe('2 2026-10-21 08:20');
    expect(when(planKnockRequests(learner({ quietHours: null }), 'en', clock()))[0]).toBe(
      '2 2026-10-21 08:12',
    );
  });

  it('rings at most once a day: a knock pushed into the next day gives way to that day’s own', () => {
    const knocks = planKnockRequests(
      learner({ quietHours: { start: '19:00', end: '08:30' } }),
      'en',
      clock(),
    );
    const dates = knocks.map((k) => k.date);
    expect(new Set(dates).size).toBe(dates.length);
    // Day 6's 19:20 knock would ring on day 7 at 08:30; day 7's own (10:02) stays.
    expect(knocks.map((k) => k.day)).not.toContain(6);
    expect(when(knocks).find((k) => k.startsWith('7 '))).toBe('7 2026-10-26 10:02');
  });

  it('schedules nothing when the learner said no to knocks', () => {
    expect(planKnockRequests(learner({ notificationsAllowed: false }), 'en', clock())).toEqual([]);
  });

  it('writes the app’s knocks in the app’s language and keeps a character’s line in English', () => {
    const vi = planKnockRequests(learner(), 'vi', clock());
    const en = planKnockRequests(learner(), 'en', clock());
    // Day 2 is the roommate's own line; day 3 is the app speaking.
    expect(vi[0]?.body).toBe(en[0]?.body);
    expect(vi[1]?.body).toBe('Hôm nay Bơ bị lạc. Bơ có một câu chuyện muốn kể bạn nghe.');
    expect(vi[1]?.title).toBe('Yapling');
    expect(vi.every((k) => !k.body.startsWith('knocks.'))).toBe(true);
  });

  it('says "you’re back" on day 8 to a learner away three days', () => {
    const away = planKnockRequests(
      learner(),
      'en',
      clock({ now: at('2026-10-27', '07:00'), cameBackAfterAway: true }),
    );
    expect(away.map((k) => k.body)).toEqual(['You’re back? I kept your seat warm.']);
    expect(when(away)).toEqual(['8 2026-10-27 08:40']);
    const normal = planKnockRequests(learner(), 'en', clock({ now: at('2026-10-27', '07:00') }));
    expect(normal.map((k) => k.body)).toEqual(['How was your week?']);
    // Opening on day 6 replans day 8 as the normal knock; opening on day 5 leaves it "you're back".
    const day6 = planKnockRequests(learner(), 'en', clock({ now: at('2026-10-25', '09:00') }));
    expect(when(day6).at(-1)).toBe('8 2026-10-27 08:15');
    const day5 = planKnockRequests(learner(), 'en', clock({ now: at('2026-10-24', '09:00') }));
    expect(when(day5).at(-1)).toBe('8 2026-10-27 08:40');
  });

  it('rings on the phone’s clock when the debug clock has moved the app', () => {
    const offsetMs = at('2026-10-22', '10:00') - at(installedOn, '10:00');
    const knocks = planKnockRequests(
      learner(),
      'en',
      clock({ now: at('2026-10-22', '10:00'), offsetMs }),
    );
    expect(knocks[0]?.day).toBe(3);
    expect(knocks[0]?.fireAt).toBe(at('2026-10-22', '12:40') - offsetMs);
  });
});

describe('the phone’s schedule', () => {
  const plan = planKnockRequests(learner(), 'en', clock());

  it('schedules each knock at its instant, never time-sensitive', () => {
    const request = toNotificationRequest(plan[0]!);
    expect(request.identifier).toBe('knock-day-2');
    expect(request.trigger).toEqual({ type: 'date', date: plan[0]!.fireAt });
    expect(request.content.interruptionLevel).toBe('active');
    expect(request.content.title).toBe('Bơ');
    expect(request.content.data).toEqual({ ...plan[0]!.data, fireAt: plan[0]!.fireAt });
  });

  it('replaces the schedule on every open without doubling it', async () => {
    const phone = new FakePhone();
    await syncKnocks(plan, phone);
    const first = [...phone.pending.keys()].sort();
    await syncKnocks(plan, phone);
    await syncKnocks(plan, phone);
    expect([...phone.pending.keys()].sort()).toEqual(first);
    expect(phone.pending.size).toBe(7);
  });

  it('drops knocks the new plan no longer has', async () => {
    const phone = new FakePhone();
    await syncKnocks(plan, phone);
    await syncKnocks(plan.slice(3), phone);
    expect([...phone.pending.keys()].sort()).toEqual(
      ['knock-day-5', 'knock-day-6', 'knock-day-7', 'knock-day-8'].sort(),
    );
  });

  it('keeps two opens in a row from interleaving', async () => {
    const phone = new FakePhone();
    await Promise.all([syncKnocks(plan, phone), syncKnocks(plan, phone), syncKnocks(plan, phone)]);
    expect(phone.pending.size).toBe(7);
  });

  it('cancels every knock when notifications are turned off, and leaves other notifications', async () => {
    const phone = new FakePhone();
    await phone.scheduleNotificationAsync({
      identifier: 'voicemail-1',
      content: { title: 'x' },
      trigger: null,
    });
    await syncKnocks(plan, phone);
    const off = planKnockRequests(learner({ notificationsAllowed: false }), 'en', clock());
    const result = await syncKnocks(off, phone);
    expect(result).toEqual({ cancelled: 7, scheduled: [] });
    expect([...phone.pending.keys()]).toEqual(['voicemail-1']);
    await syncKnocks(plan, phone);
    await cancelKnocks(phone);
    expect([...phone.pending.keys()]).toEqual(['voicemail-1']);
  });

  it('schedules nothing without the system permission', async () => {
    const phone = new FakePhone();
    await syncKnocks(plan, phone);
    phone.granted = false;
    expect(await syncKnocks(plan, phone)).toEqual({ cancelled: 7, scheduled: [] });
    expect(phone.pending.size).toBe(0);
  });

  it('fires a test knock shortly, marked to show with the app open and kept apart from the plan', async () => {
    const phone = new FakePhone();
    await fireTestKnock(plan[1]!, phone);
    const test = phone.pending.get('test-knock-day-3');
    expect(test?.trigger).toEqual({ type: 'timeInterval', seconds: 5 });
    expect(knockDataOf(test?.content.data)?.test).toBe(true);
    await syncKnocks(plan, phone);
    expect(phone.pending.has('test-knock-day-3')).toBe(true);
  });
});

describe('a tapped knock', () => {
  it('reads a knock’s payload and nothing else', () => {
    expect(knockDataOf({ kind: 'knock', day: 3, url: '/?day=3' })).toEqual({
      kind: 'knock',
      day: 3,
      url: '/?day=3',
      test: false,
    });
    expect(knockDataOf({ kind: 'voicemail', day: 3, url: '/' })).toBeNull();
    expect(knockDataOf({ kind: 'knock', day: 3, url: 'https://example.com' })).toBeNull();
    expect(knockDataOf(null)).toBeNull();
  });
});
