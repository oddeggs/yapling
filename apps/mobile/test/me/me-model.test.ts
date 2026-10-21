import { describe, expect, it } from '@jest/globals';
import type { CanDoProgress, MemoryItem, MinutesSummary } from '@yapling/contracts';

import { translator } from '@yapling/i18n';
import {
  canDoGroups,
  memoryGroups,
  meView,
  minutesRow,
  progressNote,
  type MeInputs,
} from '../../src/features/me/me-model';

const en = translator('en');
const vi = translator('vi');

const minutes = (over: Partial<MinutesSummary> = {}): MinutesSummary => ({
  plan: 'free',
  periodStart: 0,
  periodEnd: 7 * 86_400_000,
  allowanceSeconds: 600,
  usedSeconds: 240,
  leftSeconds: 360,
  firstWeek: false,
  ...over,
});

const ticked = (id: string): CanDoProgress => ({
  id,
  stage: 'newcomer',
  status: 'ticked',
  evidence: [{ callRecordId: 'call', quote: 'Hello', at: 1 }],
  witness: 'mei',
  tickedOn: '2026-10-21',
});

const inProgress = (id: string): CanDoProgress => ({
  id,
  stage: 'newcomer',
  status: 'in_progress',
  evidence: [],
  witness: null,
  tickedOn: null,
});

const note = (id: string, category: MemoryItem['category'], createdAt: number): MemoryItem => ({
  id,
  text: `note ${id}`,
  category,
  createdAt,
  sourceCallId: null,
});

describe('the live minutes row', () => {
  it('reads the free week as minutes left of the allowance, with the way to Plus', () => {
    expect(minutesRow(minutes(), en)).toEqual({
      title: 'Live minutes this week',
      value: '6 of 10 left',
      plusLink: 'Get more with Plus',
    });
    expect(minutesRow(minutes(), vi).value).toBe('còn 6/10');
  });

  it('never rounds a part minute up into one the learner doesn’t have', () => {
    expect(minutesRow(minutes({ leftSeconds: 359 }), en).value).toBe('5 of 10 left');
    expect(minutesRow(minutes({ leftSeconds: 0, usedSeconds: 600 }), en).value).toBe(
      '0 of 10 left',
    );
  });

  it('counts the generous first week the same way', () => {
    const first = minutes({
      allowanceSeconds: 3_600,
      usedSeconds: 600,
      leftSeconds: 3_000,
      firstWeek: true,
    });
    expect(minutesRow(first, en).value).toBe('50 of 60 left');
  });

  it('on Plus counts the month and offers no upgrade', () => {
    const plus = minutes({
      plan: 'plus',
      allowanceSeconds: 9_000,
      usedSeconds: 1_800,
      leftSeconds: 7_200,
    });
    expect(minutesRow(plus, en)).toEqual({
      title: 'Live minutes this month',
      value: '120 of 150 left',
      plusLink: null,
    });
  });

  it('shows no number before the ledger has loaded', () => {
    expect(minutesRow(null, en)).toEqual({
      title: 'Live minutes this week',
      value: null,
      plusLink: null,
    });
  });
});

describe('the can-dos', () => {
  it('splits Life and Work, the ticked ones first and then the next to aim for', () => {
    const groups = canDoGroups('both', [ticked('introduce-yourself-30s')], en);
    expect(groups).toEqual([
      {
        track: 'life',
        name: 'LIFE',
        items: [
          {
            id: 'ask-whats-wrong',
            title: 'Ask someone what’s wrong and offer help',
            ticked: false,
          },
        ],
      },
      {
        track: 'work',
        name: 'WORK',
        items: [
          { id: 'introduce-yourself-30s', title: 'Introduce yourself in 30 seconds', ticked: true },
          { id: 'tell-me-about-yourself', title: 'Answer “Tell me about yourself”', ticked: false },
        ],
      },
    ]);
  });

  it('shows only the track the learner chose, and counts evidence in progress as not yet ticked', () => {
    const groups = canDoGroups(
      'life',
      [inProgress('ask-whats-wrong'), ticked('introduce-yourself-30s')],
      vi,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ track: 'life', name: 'CUỘC SỐNG' });
    expect(groups[0]?.items).toEqual([
      expect.objectContaining({ id: 'ask-whats-wrong', ticked: false }),
    ]);
  });

  it('lists every can-do once all of a track are ticked', () => {
    const life = [
      'ask-whats-wrong',
      'say-what-youre-good-at',
      'say-no-politely',
      'agree-disagree-kindly',
      'short-story-with-a-point',
      'speak-to-a-group',
    ];
    const items = canDoGroups('life', life.map(ticked), en)[0]?.items ?? [];
    expect(items.map((i) => i.id)).toEqual(life);
    expect(items.every((i) => i.ticked)).toBe(true);
  });
});

describe('the rest of the sheet', () => {
  it('reads progress with its units, or says when it will arrive', () => {
    expect(progressNote({ flowSeconds: 47.6, paceWpm: 111.8, pausesPerMin: 3.04 }, en)).toBe(
      'Flow 48s · Pace 112 wpm · Pauses 3/min',
    );
    expect(progressNote({ flowSeconds: 20, paceWpm: 90, pausesPerMin: 4.55 }, vi)).toBe(
      'Trôi chảy 20 giây · 90 từ/phút · ngắt 5 lần/phút',
    );
    expect(progressNote(null, en)).toBe('Numbers arrive after your first call');
  });

  it('groups what the roommate remembers by section, newest first', () => {
    const groups = memoryGroups(
      [note('a', 'about_you', 1), note('b', 'about_us', 2), note('c', 'about_you', 3)],
      en,
    );
    expect(groups.map((g) => [g.name, g.items.map((i) => i.id)])).toEqual([
      ['About you', ['c', 'a']],
      ['About us', ['b']],
    ]);
  });

  it('puts the stage, the counts and the quiet hours together', () => {
    const inputs: MeInputs = {
      displayName: 'Lan',
      roommateName: 'Pip',
      stage: 'newcomer',
      track: 'both',
      canDos: [],
      minutes: minutes(),
      fluency: null,
      memory: [note('a', 'about_you', 1), note('b', 'coming_up', 2)],
      quietHours: { start: '22:00', end: '08:00' },
    };
    const view = meView(inputs, en);
    expect(view.stage).toEqual({ label: 'Newcomer', step: 1, of: 5, a11y: 'Stage 1 of 5' });
    expect(view.memory).toEqual({ title: 'What Pip remembers', count: '2 notes' });
    expect(view.notifications.value).toBe('22:00 – 08:00');
    expect(
      meView({ ...inputs, quietHours: null, memory: [note('a', 'about_you', 1)] }, en),
    ).toMatchObject({
      notifications: { value: 'Off' },
      memory: { count: '1 note' },
    });
    expect(meView(inputs, vi).stage.label).toBe('Người mới');
  });
});
