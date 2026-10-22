import { describe, expect, it, jest } from '@jest/globals';
import { RING_SLOT_KINDS, type WeekRing } from '@yapling/contracts';
import { KNOCK_HORIZON_DAYS, addDays, instantOf } from '@yapling/domain';
import { t } from '@yapling/i18n';

import { SEASON_WEEKS } from '../../src/data/season';
import type { KnockInputs } from '../../src/features/knocks/inputs';
import { weekKnockDays } from '../../src/features/knocks/later-weeks';
import {
  knockDataOf,
  knockTarget,
  planKnockRequests,
  weekKnockOf,
  type KnockClock,
  type KnockRequest,
} from '../../src/features/knocks/plan';
import { fireTestKnock, toNotificationRequest } from '../../src/features/knocks/scheduler';
import { FakePhone } from './fakes';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

const tz = 'Asia/Ho_Chi_Minh';
const installedOn = '2026-10-20';
/** The date of story day `n` (day 1 is the install day for a Newcomer). */
const day = (n: number) => addDays(installedOn, n - 1);
const at = (date: string, time: string) => instantOf(date, time, tz);

/** Rings for weeks 1 to `upTo`, every call of the weeks in `played` done, the rest open. */
const rings = (upTo: number, played: readonly number[]): WeekRing[] =>
  Array.from({ length: upTo }, (_, i) => ({
    week: i + 1,
    slots: RING_SLOT_KINDS.map((kind) =>
      played.includes(i + 1)
        ? {
            kind,
            status: 'done' as const,
            sceneId: null,
            callRecordId: `call-${i + 1}-${kind}`,
            doneAt: at(day(i * 7 + 2), '12:00'),
          }
        : { kind, status: 'open' as const, sceneId: null, callRecordId: null, doneAt: null },
    ),
  }));

const learner = (over: Partial<KnockInputs> = {}): KnockInputs => ({
  installedOn,
  timezone: tz,
  notificationsAllowed: true,
  lastOpenedAt: null,
  completedEpisodes: [],
  roommateName: 'Bơ',
  ...over,
});

const clock = (now: number, over: Partial<KnockClock> = {}): KnockClock => ({
  now,
  offsetMs: 0,
  cameBackAfterAway: false,
  ...over,
});

const when = (knocks: readonly KnockRequest[]) =>
  knocks.map((k) => `${k.day} ${k.date} ${k.time} ${k.identifier}`);

describe('knocks after the first week', () => {
  it('knock for week 3’s episode, story and voicemail, each from the script’s sender', () => {
    const knocks = planKnockRequests(
      learner({ weeks: rings(2, [1, 2]) }),
      'en',
      clock(at(day(15), '07:00')),
    );
    expect(when(knocks)).toEqual([
      `15 ${day(15)} 08:15 knock-week3-episode`,
      `16 ${day(16)} 12:40 knock-week3-story`,
      `19 ${day(19)} 19:20 knock-week3-voicemail`,
    ]);
    expect(knocks.map((k) => [k.title, k.body])).toEqual([
      ['Mei', 'A big customer is coming. Can you help at the counter?'],
      ['Yapling', 'Bơ had its first morning at work.'],
      ['Yapling', 'Mei left you a voicemail.'],
    ]);
  });

  it('opens what each knock announces: the episode’s call, the story, the voicemail', () => {
    const knocks = planKnockRequests(
      learner({ weeks: rings(2, [1, 2]) }),
      'en',
      clock(at(day(15), '07:00')),
    );
    expect(knocks.map((k) => k.data.url)).toEqual([
      '/(call)/s1-e3',
      '/listen/s1-e3-story',
      '/listen/s1-e3-voicemail',
    ]);
    expect(knocks[0]?.data).toEqual({
      kind: 'knock',
      day: 15,
      url: '/(call)/s1-e3',
      week: 3,
      announces: 'episode',
    });
    // The payload survives the phone's round trip, and the tap opens the call.
    const request = toNotificationRequest(knocks[0]!);
    const data = knockDataOf(request.content.data);
    expect(data).toMatchObject({ week: 3, announces: 'episode', url: '/(call)/s1-e3' });
    expect(knockTarget(data!, learner({ weeks: rings(3, [1, 2]) }))).toBe('/(call)/s1-e3');
  });

  it('sends a tapped episode knock to the burrow once that episode is played since', () => {
    const data = knockDataOf({
      kind: 'knock',
      day: 15,
      url: '/(call)/s1-e3',
      week: 3,
      announces: 'episode',
    })!;
    expect(knockTarget(data, learner({ weeks: rings(3, [1, 2, 3]) }))).toBe('/');
    expect(knockTarget(data, null)).toBe('/(call)/s1-e3');
    // A test knock from the test menu always opens what it shows.
    expect(knockTarget({ ...data, test: true }, learner({ weeks: rings(3, [1, 2, 3]) }))).toBe(
      '/(call)/s1-e3',
    );
    // A story stays open to hear again.
    const story = knockDataOf({
      kind: 'knock',
      day: 16,
      url: '/listen/s1-e3-story',
      week: 3,
      announces: 'story',
    })!;
    expect(knockTarget(story, learner({ weeks: rings(3, [1, 2, 3]) }))).toBe('/listen/s1-e3-story');
    // Nothing outside the app, and nothing that isn't a week's knock kind.
    expect(knockDataOf({ kind: 'knock', day: 15, url: 'https://x.test', week: 3 })).toBeNull();
    expect(
      knockDataOf({ kind: 'knock', day: 15, url: '/', week: 3, announces: 'minute' }),
    ).not.toHaveProperty('week');
  });

  it('opens week 6’s six postcards from its day-2 knock, and the burrow on Bunting Week’s first day', () => {
    const six = weekKnockOf(6, 'story', { ...learner(), storyDayOne: installedOn }, 'en');
    expect(six?.body).toBe('Six postcards came for you.');
    expect(six?.data.url).toBe('/listen/s1-e6-postcards');
    const bunting = weekKnockOf(7, 'episode', { ...learner(), storyDayOne: installedOn }, 'en');
    expect(bunting).toMatchObject({ dayOfWeek: 1, title: 'Yapling' });
    expect(bunting?.data.url).toBe('/');
  });

  it('rings at most once a day, out of quiet hours', () => {
    const quiet = { start: '19:00', end: '13:00' } as const;
    const knocks = planKnockRequests(
      learner({ weeks: rings(2, [1, 2]), quietHours: quiet }),
      'en',
      clock(at(day(15), '07:00')),
    );
    // The episode and the story wait to 13:00 on their days; the voicemail's 19:20 falls in quiet
    // hours and moves to the next day at 13:00.
    expect(when(knocks)).toEqual([
      `15 ${day(15)} 13:00 knock-week3-episode`,
      `16 ${day(16)} 13:00 knock-week3-story`,
      `19 ${day(20)} 13:00 knock-week3-voicemail`,
    ]);
    const all = planKnockRequests(
      learner({ weeks: rings(6, [1, 2, 3, 4, 5, 6]), quietHours: quiet }),
      'en',
      clock(at(day(15), '07:00')),
    );
    const dates = all.map((k) => k.date);
    expect(new Set(dates).size).toBe(dates.length);
    for (const k of all) {
      expect(k.time >= '13:00' && k.time < '19:00').toBe(true);
    }
  });

  it('knocks for nothing missed: a learner who didn’t play week 3 hears nothing in week 4', () => {
    // Day 23 (week 4, day 2): Episode 3 is still waiting; week 3's things are past, and week 4
    // isn't reached.
    const knocks = planKnockRequests(
      learner({ weeks: rings(4, [1, 2]) }),
      'en',
      clock(at(day(23), '07:00')),
    );
    expect(knocks).toEqual([]);
    // Playing Episode 3 brings week 4's new things still to come; its episode (day 22) is past.
    const after = planKnockRequests(
      learner({ weeks: rings(4, [1, 2, 3]) }),
      'en',
      clock(at(day(23), '07:00')),
    );
    expect(when(after)).toEqual([
      `23 ${day(23)} 12:40 knock-week4-story`,
      `26 ${day(26)} 19:20 knock-week4-voicemail`,
    ]);
  });

  it('stops 14 days after the last open, so a learner who stays away stops hearing from us', () => {
    const today = day(15);
    const knocks = planKnockRequests(
      learner({ weeks: rings(6, [1, 2, 3, 4, 5, 6]) }),
      'en',
      clock(at(today, '07:00')),
    );
    const horizon = addDays(today, KNOCK_HORIZON_DAYS);
    expect(knocks.length).toBeGreaterThan(0);
    expect(knocks.every((k) => k.date <= horizon)).toBe(true);
    expect(knocks.at(-1)?.identifier).toBe('knock-week5-episode');
    expect(knocks.at(-1)?.date).toBe(horizon);
    // Opening again a week later plans a week further.
    const later = planKnockRequests(
      learner({ weeks: rings(6, [1, 2, 3, 4, 5, 6]) }),
      'en',
      clock(at(day(22), '07:00')),
    );
    expect(later.at(-1)?.identifier).toBe('knock-week6-episode');
    // The test menu's "back after 14 days" doesn't push the plan past this open's horizon.
    const back = planKnockRequests(
      learner({ weeks: rings(6, [1, 2, 3, 4, 5, 6]) }),
      'en',
      clock(at(today, '07:00'), { cameBackAfterAway: true, awayDays: 14 }),
    );
    expect(back).toEqual(knocks);
  });

  it('opens Bunting Week from Yapling once the season’s episodes are all played', () => {
    const notYet = planKnockRequests(
      learner({ weeks: rings(6, [1, 2, 3, 4, 5]) }),
      'en',
      clock(at(day(42), '20:00')),
    );
    expect(notYet.map((k) => k.identifier)).not.toContain('knock-week7-episode');
    const knocks = planKnockRequests(
      learner({ weeks: rings(6, [1, 2, 3, 4, 5, 6]) }),
      'vi',
      clock(at(day(42), '20:00')),
    );
    expect(when(knocks)).toEqual([
      `43 ${day(43)} 08:15 knock-week7-episode`,
      `44 ${day(44)} 12:40 knock-week7-story`,
      `47 ${day(47)} 19:20 knock-week7-voicemail`,
    ]);
    expect(knocks[0]).toMatchObject({
      title: 'Yapling',
      body: 'Tuần Cờ Dây bắt đầu rồi! Câu nói của bạn ở trên những lá cờ.',
    });
    expect(knocks[0]?.data.url).toBe('/');
  });

  it('keeps a character’s line in English, and tells a Visitor everything from Yapling', () => {
    const base = { weeks: rings(2, [1, 2]) };
    const now = clock(at(day(15), '07:00'));
    const vi = planKnockRequests(learner(base), 'vi', now);
    expect(vi[0]).toMatchObject({
      title: 'Mei',
      body: 'A big customer is coming. Can you help at the counter?',
    });
    expect(vi[1]?.body).toBe('Bơ vừa có buổi sáng đầu tiên đi làm. Có chuyện để kể đây.');
    const visitor = planKnockRequests(learner({ ...base, atVisitor: true }), 'vi', now);
    expect(visitor.map((k) => k.title)).toEqual(['Yapling', 'Yapling', 'Yapling']);
    expect(visitor[0]?.body).toBe('Mei sắp có một vị khách lớn. Ra quầy giúp Mei nhé?');
    const visitorEn = planKnockRequests(learner({ ...base, atVisitor: true }), 'en', now);
    expect(visitorEn[0]).toMatchObject({
      title: 'Yapling',
      body: 'Mei has a big customer coming. Help her at the counter?',
    });
  });

  it('has copy for every later week’s knock, in both languages, never a reminder of loss', () => {
    for (let week = 2; week <= SEASON_WEEKS.length; week++) {
      for (const d of weekKnockDays(SEASON_WEEKS, week)) {
        for (const atVisitor of [false, true]) {
          for (const language of ['vi', 'en'] as const) {
            const knock = weekKnockOf(
              week,
              d.kind,
              { ...learner(), storyDayOne: installedOn, atVisitor },
              language,
            );
            expect(knock).not.toBeNull();
            expect(knock!.body.startsWith('knocks.')).toBe(false);
            expect(knock!.body).not.toMatch(/lose|miss|lost|mất|lỡ/i);
            if (atVisitor) expect(knock!.title).toBe(t(language, 'knocks.from.yapling'));
          }
        }
      }
    }
    // Week 2's first day is week one's day 8, which keeps its own knock.
    expect(weekKnockDays(SEASON_WEEKS, 2).map((d) => d.kind)).toEqual(['story', 'voicemail']);
  });

  it('fires a later week’s knock from the test menu under its own identifier', async () => {
    const phone = new FakePhone();
    const knock = weekKnockOf(3, 'story', { ...learner(), storyDayOne: installedOn }, 'en')!;
    const id = await fireTestKnock(knock, phone);
    expect(id).toBe('test-knock-week3-story');
    expect(phone.pending.get(id)?.content.data).toMatchObject({ test: true, week: 3 });
  });
});
