import { describe, expect, it } from 'vitest';

import { SEASON_1_EPISODES } from './can-dos';
import {
  dateOfDay,
  dayIndexOf,
  FREE_WEEK_ENDS_ON_DAY,
  planWeekOneKnocks,
  recapFor,
  WEEK_ONE_PLAN,
  weekOneUnlocks,
  welcomeFor,
  type KnockPlanContext,
} from './day-clock';
import { ledgerPeriod } from './ledger';
import { duePhrases, seedPhrase, usePhrase } from './phrases';
import { ringWeeks } from './ring';
import { instantOf, localTimeOf } from './time';

const HCM = 'Asia/Ho_Chi_Minh';
// Installed on Monday 21 September 2026, as in the first-week prototype.
const installedOn = '2026-09-21';
const at = (date: string, time = '09:00') => instantOf(date, time, HCM);

describe('the day clock', () => {
  it('counts the install day as day 1 and turns at local midnight', () => {
    expect(dayIndexOf(installedOn, at('2026-09-21', '00:00'), HCM)).toBe(1);
    expect(dayIndexOf(installedOn, at('2026-09-21', '23:59'), HCM)).toBe(1);
    expect(dayIndexOf(installedOn, at('2026-09-22', '00:00'), HCM)).toBe(2);
    expect(dayIndexOf(installedOn, at('2026-09-28'), HCM)).toBe(8);
    // 18:00 UTC on the 21st is already the 22nd in Ho Chi Minh City.
    expect(dayIndexOf(installedOn, Date.UTC(2026, 8, 21, 18), HCM)).toBe(2);
    expect(dayIndexOf(installedOn, at('2026-09-20'), HCM)).toBe(1);
    expect(dateOfDay(installedOn, 8)).toBe('2026-09-28');
  });
});

describe('the first week', () => {
  it('opens each day’s content and keeps everything open after', () => {
    expect([...weekOneUnlocks(1)]).toEqual([
      'placement_chat',
      'residency_card',
      'linh_welcome',
      'letter_under_door',
    ]);
    expect(weekOneUnlocks(2).has('episode_call')).toBe(true);
    expect(weekOneUnlocks(3).has('pip_story')).toBe(true);
    expect(weekOneUnlocks(3).has('linh_postcard')).toBe(true);
    expect(weekOneUnlocks(4).has('real_week_call')).toBe(true);
    expect(weekOneUnlocks(5).has('practice_call')).toBe(true);
    expect(weekOneUnlocks(6).has('voicemail')).toBe(true);
    expect(weekOneUnlocks(6).has('season_map')).toBe(true);
    expect(weekOneUnlocks(7).has('plus_offer')).toBe(true);
    expect(weekOneUnlocks(8).has('next_episode_peek')).toBe(true);
    expect(weekOneUnlocks(40).size).toBe(WEEK_ONE_PLAN.flatMap((d) => d.unlocks).length);
  });

  it('opens the ring’s calls on the days the plan opens them', () => {
    const slotOpen = (day: number, s: number) => ringWeeks([], day)[0]?.slots[s]?.status === 'open';
    expect(weekOneUnlocks(2).has('episode_call') && slotOpen(2, 0) && !slotOpen(1, 0)).toBe(true);
    expect(weekOneUnlocks(4).has('real_week_call') && slotOpen(4, 1) && !slotOpen(3, 1)).toBe(true);
    expect(weekOneUnlocks(5).has('practice_call') && slotOpen(5, 2) && !slotOpen(4, 2)).toBe(true);
  });

  it('ends the free week on day 7 and starts the weekly allowance on day 8', () => {
    const ctx = (day: number) => ({
      plan: 'free' as const,
      installedOn,
      timezone: HCM,
      now: at(dateOfDay(installedOn, day), '12:00'),
    });
    expect(ledgerPeriod(ctx(FREE_WEEK_ENDS_ON_DAY)).firstWeek).toBe(true);
    expect(ledgerPeriod(ctx(FREE_WEEK_ENDS_ON_DAY + 1)).firstWeek).toBe(false);
  });
});

describe('the first week’s knocks', () => {
  const base: KnockPlanContext = {
    installedOn,
    timezone: HCM,
    now: at('2026-09-21', '20:00'),
    notificationsAllowed: true,
    lastOpenedOn: '2026-09-27',
  };

  it('knocks each morning from day 2 to day 8 at the plan’s times, with copy keys', () => {
    const knocks = planWeekOneKnocks(base);
    expect(knocks.map((k) => [k.day, k.key, k.from, k.date, localTimeOf(k.at, HCM)])).toEqual([
      [2, 'knocks.day2', 'pip', '2026-09-22', '08:12'],
      [3, 'knocks.day3', 'yapling', '2026-09-23', '12:40'],
      [4, 'knocks.day4', 'pip', '2026-09-24', '08:05'],
      [5, 'knocks.day5', 'bea', '2026-09-25', '08:30'],
      [6, 'knocks.day6', 'yapling', '2026-09-26', '19:20'],
      [7, 'knocks.day7', 'yapling', '2026-09-27', '10:02'],
      [8, 'knocks.day8', 'pip', '2026-09-28', '08:15'],
    ]);
  });

  it('uses the coming-back knock on day 8 after three days away', () => {
    const knocks = planWeekOneKnocks({ ...base, lastOpenedOn: '2026-09-25' });
    expect(knocks.at(-1)).toMatchObject({ day: 8, key: 'knocks.day8_back', time: '08:40' });
  });

  it('respects quiet hours and keeps one knock a day', () => {
    const knocks = planWeekOneKnocks({ ...base, quietHours: { start: '18:00', end: '09:00' } });
    // Day 2's 08:12 moves to 09:00; day 6's 19:20 would land on day 7, which has its own knock.
    expect(knocks.find((k) => k.day === 2)?.time).toBe('09:00');
    expect(knocks.find((k) => k.day === 6)).toBeUndefined();
    expect(knocks.find((k) => k.day === 7)?.time).toBe('10:02');
    expect(new Set(knocks.map((k) => k.date)).size).toBe(knocks.length);
    // No quiet hours at all.
    expect(planWeekOneKnocks({ ...base, quietHours: null })).toHaveLength(7);
  });

  it('plans nothing in the past and nothing without permission', () => {
    expect(
      planWeekOneKnocks({ ...base, now: at('2026-09-25', '08:30') }).map((k) => k.day),
    ).toEqual([6, 7, 8]);
    expect(planWeekOneKnocks({ ...base, notificationsAllowed: false })).toEqual([]);
  });
});

describe('coming back after days away', () => {
  const welcome = (lastOpened: string, now: string, completed = ['s1-e1'] as const) =>
    welcomeFor({
      lastOpenedAt: at(lastOpened),
      now: at(now),
      timezone: HCM,
      completedEpisodes: completed,
    });

  it('welcomes back with the recap after three or more days without opening', () => {
    expect(welcome('2026-09-25', '2026-09-27')).toEqual({ kind: 'normal', daysAway: 2 });
    expect(welcome('2026-09-25', '2026-09-28')).toEqual({
      kind: 'back_after_away',
      daysAway: 3,
      recapKey: 's1-e1.recap',
    });
    expect(
      welcomeFor({
        lastOpenedAt: null,
        now: at('2026-09-21'),
        timezone: HCM,
        completedEpisodes: [],
      }),
    ).toEqual({
      kind: 'normal',
      daysAway: 0,
    });
  });

  it('recaps the last finished episode; the finale’s own line when the finale waits', () => {
    expect(recapFor([])).toBeNull();
    expect(recapFor(['s1-e1'])).toBe('s1-e1.recap');
    expect(recapFor(['s1-e1', 's1-e3', 's1-e2'])).toBe('s1-e3.recap');
    expect(recapFor(['s1-e1', 's1-e2', 's1-e3', 's1-e4', 's1-e5'])).toBe('s1-e6.recap');
    expect(recapFor(SEASON_1_EPISODES)).toBeNull();
  });

  it('loses nothing while away: open calls wait and phrases keep their state', () => {
    const before = ringWeeks([], 5);
    const after = ringWeeks(before, 40);
    expect(after[0]?.slots.map((s) => s.status)).toEqual(['open', 'open', 'open']);
    const leaf = [at('2026-09-22'), at('2026-09-23')].reduce(
      (p, t) =>
        usePhrase(p, { at: t, correct: true, prompted: true, contextId: 's1-e1' }, HCM).phrase,
      seedPhrase('can-i-help', 'Can I help?', at('2026-09-22')),
    );
    expect(duePhrases([leaf], at('2027-03-01'), HCM)[0]?.state).toBe('leaf');
  });
});
