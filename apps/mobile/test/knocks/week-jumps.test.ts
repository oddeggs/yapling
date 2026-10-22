import { describe, expect, it } from '@jest/globals';
import { Keepsake, WeekRing } from '@yapling/contracts';
import { instantOf, storyWeek } from '@yapling/domain';

import { SEASON_WEEKS } from '../../src/data/season';
import {
  JUMP_WEEKS,
  fillRingPlan,
  filledCallId,
  listeningScenesBefore,
  storyDayOf,
  weekJumpPlan,
} from '../../src/features/devmenu/week-tools';

const tz = 'Asia/Ho_Chi_Minh';
const startedOn = '2026-10-20';

const jump = (week: number, day: number, from: Partial<Parameters<typeof weekJumpPlan>[0]> = {}) =>
  weekJumpPlan({ week, day, weeks: [], keepsakes: [], startedOn, timezone: tz, ...from });

/** The story week the phone would show after a jump. */
const shown = (plan: ReturnType<typeof jump>) =>
  storyWeek({ season: SEASON_WEEKS, weeks: plan.weeks, dayIndex: plan.storyDay, startedOn });

const statuses = (ring: WeekRing | undefined) => ring?.slots.map((s) => s.status);

describe('the test menu’s week jumps', () => {
  it('reaches every week after the first', () => {
    expect(JUMP_WEEKS).toEqual([2, 3, 4, 5, 6, 7]);
    expect(storyDayOf(3, 2)).toBe(16);
    expect(storyDayOf(5, 5)).toBe(33);
  });

  it('jumps to week 3, day 2 with weeks 1 and 2 played and week 3 as its calendar opens it', () => {
    const plan = jump(3, 2);
    expect(plan.storyDay).toBe(16);
    expect(plan.weeks.map((w) => w.week)).toEqual([1, 2, 3]);
    expect(statuses(plan.weeks[0])).toEqual(['done', 'done', 'done']);
    expect(statuses(plan.weeks[1])).toEqual(['done', 'done', 'done']);
    // Week 3: the episode opened on day 1; the real-week and practice calls open on days 3 and 4.
    expect(statuses(plan.weeks[2])).toEqual(['open', 'upcoming', 'upcoming']);
    expect(plan.weeks[2]?.slots[0]?.sceneId).toBe('s1-e3');
    // Each earlier call done at noon on the day it opened (week 2's episode: day 8).
    expect(plan.weeks[1]?.slots[0]).toMatchObject({
      sceneId: 's1-e2',
      callRecordId: filledCallId(2, 'episode'),
      doneAt: instantOf('2026-10-27', '12:00', tz),
    });
    expect(plan.keepsakes.map((k) => k.id)).toEqual(['week-1', 'week-2']);
    for (const ring of plan.weeks) expect(WeekRing.safeParse(ring).success).toBe(true);
    for (const k of plan.keepsakes) expect(Keepsake.safeParse(k).success).toBe(true);

    const week = shown(plan);
    expect(week).toMatchObject({ week: 3, dayOfWeek: 2, behind: false, full: false });
    expect(week.waiting).toEqual([]);
    expect(week.today.map((o) => o.scene)).toEqual(['s1-e3-story', 's1-e3-postcard']);
  });

  it('jumps to week 5, day 5 with its three calls open and four rings on the wall', () => {
    const plan = jump(5, 5);
    expect(plan.storyDay).toBe(33);
    expect(plan.weeks.slice(0, 4).map(statuses)).toEqual(
      Array.from({ length: 4 }, () => ['done', 'done', 'done']),
    );
    expect(statuses(plan.weeks[4])).toEqual(['open', 'open', 'open']);
    expect(plan.keepsakes.map((k) => k.id)).toEqual(['week-1', 'week-2', 'week-3', 'week-4']);
    const week = shown(plan);
    expect(week).toMatchObject({ week: 5, dayOfWeek: 5 });
    expect(week.today.map((o) => o.scene)).toEqual(['s1-e5-voicemail']);
  });

  it('keeps real calls, and jumps back exactly: later weeks and their keepsakes go', () => {
    const real = jump(2, 1);
    const played = {
      ...real,
      weeks: real.weeks.map((w) =>
        w.week === 1
          ? {
              ...w,
              slots: w.slots.map((s) => ({ ...s, callRecordId: `real-${s.kind}` })),
            }
          : w,
      ),
    };
    const ahead = jump(5, 5, { weeks: played.weeks, keepsakes: played.keepsakes });
    expect(ahead.weeks[0]?.slots.map((s) => s.callRecordId)).toEqual([
      'real-episode',
      'real-real_week',
      'real-practice',
    ]);
    const canDo: Keepsake = {
      id: 'cando-1',
      kind: 'can_do',
      canDoId: 's1-e1-a',
      signedBy: 'mei',
      earnedOn: '2026-10-21',
    };
    const back = jump(3, 2, { weeks: ahead.weeks, keepsakes: [...ahead.keepsakes, canDo] });
    expect(back.weeks.map((w) => w.week)).toEqual([1, 2, 3]);
    expect(statuses(back.weeks[2])).toEqual(['open', 'upcoming', 'upcoming']);
    expect(back.keepsakes.map((k) => k.id)).toEqual(['week-1', 'week-2', 'cando-1']);
    expect(back.weeks[0]?.slots[0]?.callRecordId).toBe('real-episode');
  });

  it('fills a week’s ring with its keepsake, once', () => {
    const plan = jump(3, 2);
    const now = instantOf('2026-11-04', '18:00', tz);
    const filled = fillRingPlan({
      week: 3,
      weeks: plan.weeks,
      keepsakes: plan.keepsakes,
      now,
      timezone: tz,
    });
    expect(statuses(filled.weeks[2])).toEqual(['done', 'done', 'done']);
    expect(filled.weeks[2]?.slots.map((s) => s.doneAt)).toEqual([now, now, now]);
    expect(filled.keepsakes.at(-1)).toEqual({
      id: 'week-3',
      kind: 'week',
      canDoId: null,
      signedBy: 'pip',
      earnedOn: '2026-11-04',
    });
    expect(shown({ ...plan, weeks: filled.weeks }).full).toBe(true);
    const again = fillRingPlan({ ...filled, week: 3, now, timezone: tz });
    expect(again.keepsakes.filter((k) => k.id === 'week-3')).toHaveLength(1);
    expect(again.weeks).toEqual(filled.weeks);
  });

  it('adds the rings up to a week progress doesn’t have yet before filling it', () => {
    const filled = fillRingPlan({
      week: 2,
      weeks: [],
      keepsakes: [],
      now: instantOf('2026-10-27', '18:00', tz),
      timezone: tz,
    });
    expect(filled.weeks.map((w) => w.week)).toEqual([1, 2]);
    expect(statuses(filled.weeks[1])).toEqual(['done', 'done', 'done']);
    expect(filled.keepsakes.map((k) => k.id)).toEqual(['week-2']);
  });

  it('marks heard every story, postcard and voicemail before the week, and nothing of it', () => {
    const heard = listeningScenesBefore(3);
    expect(heard).toEqual(
      expect.arrayContaining([
        's1-e1-story',
        's1-e1-voicemail',
        's1-e2-postcard',
        's1-e2-voicemail',
      ]),
    );
    expect(heard).not.toContain('s1-e2');
    expect(heard).not.toContain('s1-e2-real-week');
    expect(heard).not.toContain('s1-e3-story');
    expect(listeningScenesBefore(1)).toEqual([]);
  });
});
