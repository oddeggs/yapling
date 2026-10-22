import { describe, expect, it, jest } from '@jest/globals';
import type { SettlingChapterDone } from '@yapling/contracts';
import { addDays, instantOf } from '@yapling/domain';

import type { KnockInputs } from '../../src/features/knocks/inputs';
import {
  knockDataOf,
  knockTarget,
  planKnockRequests,
  type KnockClock,
} from '../../src/features/knocks/plan';
import { toNotificationRequest } from '../../src/features/knocks/scheduler';
import { planSettlingKnock, type SettlingState } from '../../src/features/knocks/settling';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

const tz = 'Asia/Ho_Chi_Minh';
const installedOn = '2026-10-20';
const day = (n: number) => addDays(installedOn, n - 1);
const at = (date: string, time: string) => instantOf(date, time, tz);

/** Chapters 1 to `upTo` done, `perDay` on each day from the install day. */
const done = (upTo: number, perDay = 1): SettlingChapterDone[] =>
  Array.from({ length: upTo }, (_, i) => ({
    chapter: i + 1,
    doneOn: day(Math.floor(i / perDay) + 1),
    callRecordId: null,
  }));

const visitor = (over: Partial<KnockInputs> = {}): KnockInputs => ({
  installedOn,
  timezone: tz,
  notificationsAllowed: true,
  lastOpenedAt: null,
  completedEpisodes: [],
  roommateName: 'Bơ',
  visitorPath: true,
  storyStartedOn: null,
  settlingChaptersDone: done(1),
  ...over,
});

const clock = (now: number, over: Partial<KnockClock> = {}): KnockClock => ({
  now,
  offsetMs: 0,
  cameBackAfterAway: false,
  ...over,
});

const when = (knocks: readonly { day: number; date: string; time: string }[]) =>
  knocks.map((k) => `${k.day} ${k.date} ${k.time}`);

const state = (chapters: SettlingChapterDone[], over: Partial<SettlingState> = {}) => ({
  visitorPath: true,
  chapters,
  storyStartedOn: null,
  ...over,
});

describe('Settling in’s knocks', () => {
  it('knocks the next morning for the chapter that waits, from Yapling, in Vietnamese', () => {
    // Chapter 1 done on day 1, evening.
    const knocks = planKnockRequests(visitor(), 'vi', clock(at(day(1), '19:00')));
    expect(when(knocks)).toEqual([`2 ${day(2)} 08:20`]);
    expect(knocks[0]?.title).toBe('Yapling');
    expect(knocks[0]?.body).toBe('Linh sang phụ bạn dỡ thùng đồ đây.');
    expect(knocks[0]?.identifier).toBe('knock-settling-2');
    expect(knocks[0]?.fireAt).toBe(at(day(2), '08:20'));
  });

  it('opens the chapter’s call', () => {
    const knocks = planKnockRequests(
      visitor({ settlingChaptersDone: done(3) }),
      'vi',
      clock(at(day(3), '20:00')),
    );
    expect(knocks[0]?.body).toBe('Linh đang đợi bạn ở bến xe buýt.');
    expect(knocks[0]?.data).toEqual({ kind: 'knock', day: 4, url: '/(call)/s1-set4', chapter: 4 });
    const request = toNotificationRequest(knocks[0]!);
    expect(knockDataOf(request.content.data)).toEqual({
      kind: 'knock',
      day: 4,
      url: '/(call)/s1-set4',
      chapter: 4,
      test: false,
    });
  });

  it('names the roommate in Chapter 6’s knock, in both languages', () => {
    const inputs = visitor({ settlingChaptersDone: done(5) });
    const now = clock(at(day(5), '21:00'));
    expect(planKnockRequests(inputs, 'vi', now)[0]?.body).toBe('Bơ đang viết một trang về bạn.');
    expect(planKnockRequests(inputs, 'en', now)[0]?.body).toBe('Bơ is writing a page about you.');
  });

  it('rings this morning when no chapter is done today and its time is still ahead', () => {
    // Chapter 2 done on day 2; day 4 at 07:00, chapter 3 still waiting.
    const inputs = visitor({ settlingChaptersDone: done(2) });
    expect(when(planKnockRequests(inputs, 'en', clock(at(day(4), '07:00'))))).toEqual([
      `4 ${day(4)} 08:10`,
    ]);
    // Past its time: tomorrow.
    expect(when(planKnockRequests(inputs, 'en', clock(at(day(4), '09:00'))))).toEqual([
      `5 ${day(5)} 08:10`,
    ]);
  });

  it('rings one knock a settling day: after a chapter today, the next one waits for tomorrow', () => {
    // Two chapters on day 2 (the burrow suggests tomorrow): one knock, on day 3.
    const two = visitor({
      settlingChaptersDone: done(3, 2).map((d) => ({ ...d, doneOn: day(2) })),
    });
    const knocks = planKnockRequests(two, 'en', clock(at(day(2), '07:30')));
    expect(when(knocks)).toEqual([`3 ${day(3)} 08:40`]);
    // Never more than one at a time, however long the learner stays away.
    for (const hour of ['06:00', '12:00', '23:30']) {
      expect(planKnockRequests(two, 'en', clock(at(day(9), hour)))).toHaveLength(1);
    }
  });

  it('keeps out of quiet hours, and moves nothing when there are none', () => {
    const late = visitor({ quietHours: { start: '22:00', end: '09:00' } });
    expect(when(planKnockRequests(late, 'en', clock(at(day(1), '19:00'))))).toEqual([
      `2 ${day(2)} 09:00`,
    ]);
    const none = visitor({ quietHours: null });
    expect(when(planKnockRequests(none, 'en', clock(at(day(1), '19:00'))))).toEqual([
      `2 ${day(2)} 08:20`,
    ]);
    // The default quiet hours (22:00–08:00) leave the morning knocks as they are.
    expect(when(planKnockRequests(visitor(), 'en', clock(at(day(1), '23:00'))))).toEqual([
      `2 ${day(2)} 08:20`,
    ]);
  });

  it('never knocks on the install day or for Chapter 1 (Linh knocks in the app)', () => {
    const fresh = visitor({ settlingChaptersDone: [] });
    expect(planKnockRequests(fresh, 'en', clock(at(day(1), '07:00')))).toEqual([]);
    expect(planKnockRequests(fresh, 'en', clock(at(day(3), '07:00')))).toEqual([]);
  });

  it('stops once the letter has come and the first week’s knocks take over from its day', () => {
    // Chapter 6 done on day 6: the letter's day is week 1's day 1.
    const letter = visitor({ settlingChaptersDone: done(6) });
    const knocks = planKnockRequests(letter, 'en', clock(at(day(6), '20:00')));
    expect(knocks.some((k) => k.identifier.startsWith('knock-settling'))).toBe(false);
    expect(when(knocks)[0]).toBe(`2 ${day(7)} 08:12`);
    // "Start the story" from the list: the recorded story start counts the same way.
    const skipped = visitor({ settlingChaptersDone: done(2), storyStartedOn: day(3) });
    const after = planKnockRequests(skipped, 'en', clock(at(day(3), '20:00')));
    expect(after.some((k) => k.identifier.startsWith('knock-settling'))).toBe(false);
    expect(when(after)[0]).toBe(`2 ${day(4)} 08:12`);
  });

  it('leaves learners who didn’t start with Linh on the first week from install', () => {
    const newcomer = visitor({ visitorPath: false, settlingChaptersDone: [] });
    expect(when(planKnockRequests(newcomer, 'en', clock(at(day(1), '10:00'))))[0]).toBe(
      `2 ${day(2)} 08:12`,
    );
  });

  it('schedules nothing without permission', () => {
    const no = visitor({ notificationsAllowed: false });
    expect(planKnockRequests(no, 'en', clock(at(day(1), '19:00')))).toEqual([]);
    expect(
      planSettlingKnock({
        state: state(done(1)),
        installedOn,
        timezone: tz,
        now: at(day(1), '19:00'),
        notificationsAllowed: false,
      }),
    ).toBeNull();
  });

  it('rings on the phone’s clock when the debug clock has moved the app', () => {
    const now = at(day(3), '20:00');
    const offsetMs = now - at(installedOn, '20:00');
    const knocks = planKnockRequests(
      visitor({ settlingChaptersDone: done(3) }),
      'en',
      clock(now, { offsetMs }),
    );
    expect(knocks[0]?.fireAt).toBe(at(day(4), '08:40') - offsetMs);
  });
});

describe('a tapped Settling-in knock', () => {
  const knock = { kind: 'knock', day: 4, url: '/(call)/s1-set4', chapter: 4 } as const;

  it('opens its chapter’s call while that chapter is next', () => {
    expect(knockTarget(knock, visitor({ settlingChaptersDone: done(3) }))).toBe('/(call)/s1-set4');
    // Before the learner's data is read: the knock's own place.
    expect(knockTarget(knock, null)).toBe('/(call)/s1-set4');
  });

  it('opens the burrow once the chapter is done or the letter has come', () => {
    expect(knockTarget(knock, visitor({ settlingChaptersDone: done(4) }))).toBe('/');
    expect(knockTarget(knock, visitor({ settlingChaptersDone: done(6) }))).toBe('/');
  });

  it('opens what a test knock shows, whatever the learner’s state', () => {
    expect(knockTarget({ ...knock, test: true }, visitor({ settlingChaptersDone: done(6) }))).toBe(
      '/(call)/s1-set4',
    );
  });

  it('reads no chapter from a payload that has none or a strange one', () => {
    expect(knockDataOf({ kind: 'knock', day: 2, url: '/?day=2' })).toEqual({
      kind: 'knock',
      day: 2,
      url: '/?day=2',
      test: false,
    });
    expect(knockDataOf({ kind: 'knock', day: 2, url: '/x', chapter: 9 })?.chapter).toBeUndefined();
    expect(knockDataOf({ kind: 'knock', day: 2, url: 'https://x', chapter: 2 })).toBeNull();
  });
});
