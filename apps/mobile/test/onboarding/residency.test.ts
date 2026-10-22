import { describe, expect, it } from '@jest/globals';
import { CALL_SUMMARY_VERSION, type CallRecord, type CallSummary } from '@yapling/contracts';
import { translator } from '@yapling/i18n';

import {
  placementSummaryOf,
  residencyView,
  visitorCardView,
  visitorConfirmView,
  type PlacementSummary,
} from '../../src/features/onboarding/residency';

const vi = translator('vi');
const en = translator('en');
// 21 Oct 2026, 20:00 in Ho Chi Minh City (13:00 UTC).
const NOW = Date.UTC(2026, 9, 21, 13, 0);

const summary = (wins: string[]): CallSummary => ({
  version: CALL_SUMMARY_VERSION,
  wins,
  fix: null,
  phraseEvents: [],
  canDoEvidence: [],
  metrics: { flowSeconds: 2, paceWpm: 80, pausesPerMin: 3 },
  memoryItemIds: [],
});

const record = (over: Partial<CallRecord>): CallRecord => ({
  id: 'call_1',
  kind: 'placement',
  sceneId: 's1-pro-unpack',
  character: 'pip',
  startedAt: NOW - 70_000,
  endedAt: NOW,
  learnerSeconds: 30,
  characterSeconds: 25,
  endReason: 'scene_complete',
  summaryPending: false,
  summary: null,
  ...over,
});

const view = (s: PlacementSummary, t = vi) =>
  residencyView({
    summary: s,
    stage: 'newcomer',
    now: NOW,
    timezone: 'Asia/Ho_Chi_Minh',
    t,
    tEn: en,
  });

describe('the residency card', () => {
  it('shows the stage, the day’s stamp and the first two can-dos', () => {
    const v = view({ kind: 'none' });
    expect(v).toMatchObject({
      stageName: 'Newcomer',
      stageLocal: 'Người mới',
      stageLine: 'Chặng 1/5',
      stampTown: 'NW',
      stampDate: 'OCT 21',
    });
    expect(v.aims).toEqual([
      { id: 'ask-whats-wrong', text: vi('cando.ask-whats-wrong') },
      { id: 'introduce-yourself-30s', text: vi('cando.introduce-yourself-30s') },
    ]);
  });

  it('dates the stamp in the learner’s own day', () => {
    const lateInHanoi = residencyView({
      summary: { kind: 'none' },
      stage: 'newcomer',
      now: Date.UTC(2026, 9, 21, 18, 30),
      timezone: 'Asia/Ho_Chi_Minh',
      t: vi,
      tEn: en,
    });
    expect(lateInHanoi.stampDate).toBe('OCT 22');
  });

  it('shows Pip writing while the summary is pending', () => {
    expect(view({ kind: 'pending' }).strengths).toBeNull();
  });

  it('leads with the call’s wins and fills the third with a general strength', () => {
    const v = view({
      kind: 'ready',
      wins: ['You said your job clearly', 'You asked Pip a question'],
    });
    expect(v.strengths?.map((s) => [s.text, s.fromCall])).toEqual([
      ['You said your job clearly', true],
      ['You asked Pip a question', true],
      [vi('onboarding.card.strength.goodAtUnpacking'), false],
    ]);
  });

  it('fills a partial summary without inventing anything about the call', () => {
    const v = view({ kind: 'ready', wins: ['You described your morning'] }, en);
    expect(v.strengths?.map((s) => s.text)).toEqual([
      'You described your morning',
      'You ask questions back',
      'You’re very good at unpacking',
    ]);
  });

  it('shows the three general strengths, in Pip’s order, when no summary comes', () => {
    expect(view({ kind: 'none' }, en).strengths?.map((s) => s.text)).toEqual([
      'You keep going when you’re stuck',
      'You ask questions back',
      'You’re very good at unpacking',
    ]);
    expect(view({ kind: 'ready', wins: ['  '] }, en).strengths).toHaveLength(3);
  });
});

describe('the placement call’s summary', () => {
  it('is pending while the server writes it, then ready with its wins', () => {
    expect(placementSummaryOf(record({ summaryPending: true }), true, false)).toEqual({
      kind: 'pending',
    });
    expect(placementSummaryOf(null, true, false)).toEqual({ kind: 'pending' });
    expect(placementSummaryOf(record({ summary: summary(['A win']) }), true, false)).toEqual({
      kind: 'ready',
      wins: ['A win'],
    });
  });

  it('is none when there was no call, the call was too short, or the wait ran out', () => {
    expect(placementSummaryOf(null, false, false)).toEqual({ kind: 'none' });
    expect(placementSummaryOf(record({}), true, false)).toEqual({ kind: 'none' });
    expect(placementSummaryOf(record({ summaryPending: true }), true, true)).toEqual({
      kind: 'none',
    });
  });
});

describe('the Visitor’s card', () => {
  const view = (tGloss: typeof vi | null) =>
    visitorCardView({
      learnerName: 'Lan',
      now: NOW,
      timezone: 'Asia/Ho_Chi_Minh',
      t: vi,
      tEn: en,
      tGloss,
    });

  it('shows the stage without a number, with the visitor’s stamp and the day', () => {
    const v = view(vi);
    expect(v).toMatchObject({
      learnerName: 'Lan',
      stageName: 'Visitor',
      stageSub: 'Khách mới đến',
      stamp: ['VISITOR', 'KHÁCH', 'OCT 21'],
    });
  });

  it('lists hello and “again” in English, with their meaning for a Vietnamese learner', () => {
    expect(view(vi).aims).toEqual([
      {
        id: 'say-hello-and-your-name',
        text: 'Say hello and your name',
        gloss: 'Chào hỏi và nói tên mình',
      },
      {
        id: 'ask-again-or-slower',
        text: 'Ask someone to say it again or slower',
        gloss: 'Nhờ người khác nói lại hoặc nói chậm hơn',
      },
    ]);
    expect(view(null).aims.map((a) => a.gloss)).toEqual([null, null]);
  });

  it('puts the call’s two pills in bold in “Go straight to the story?”', () => {
    const body = visitorConfirmView(vi).body;
    expect(body.filter((r) => r.bold).map((r) => r.text)).toEqual(['Nói lại', 'Chậm thôi']);
    expect(body.map((r) => r.text).join('')).toBe(
      'Truyện sẽ nhanh hơn một chút. Trong mọi cuộc gọi, bạn vẫn có thể bấm Nói lại hoặc Chậm thôi.',
    );
  });
});
