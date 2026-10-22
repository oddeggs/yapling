import { describe, expect, it } from '@jest/globals';
import type { CallRecord, ErrorTargetProgress, PhraseEvent } from '@yapling/contracts';
import { translator } from '@yapling/i18n';

import { buildMinuteCard } from '../../src/features/payoff/minute-model';
import {
  bloomsIn,
  buildAfterCall,
  graduationIn,
  phraseTransitions,
} from '../../src/features/payoff/model';
import { thenAndNow, thenAndNowCalls, weekOfScene } from '../../src/features/payoff/then-now-model';
import { T0, call, learner, progress, summary } from './fixtures';

const vi = translator('vi');
const en = translator('en');

const BLOOM: PhraseEvent = { phraseId: 'whats-wrong', text: "What's wrong?", event: 'bloomed' };

const graduated = (graduatedAt: number): ErrorTargetProgress[] => [
  {
    id: 'past_ed',
    status: 'graduated',
    selfCorrections: 5,
    selfCorrectionDays: ['2026-09-12', '2026-09-16', '2026-09-21'],
    activatedAt: T0 - 20 * 86_400_000,
    graduatedAt,
  },
  {
    id: 'articles',
    status: 'active',
    selfCorrections: 0,
    selfCorrectionDays: [],
    activatedAt: graduatedAt,
    graduatedAt: null,
  },
];

const episodeThree = (events: PhraseEvent[]) =>
  call({ sceneId: 's1-e3', summary: summary({ phraseEvents: events }) });

describe('a phrase in bloom', () => {
  it('is its own moment after the summary when a call bloomed a phrase', () => {
    const model = buildAfterCall(
      { call: episodeThree([BLOOM]), progress: progress(), learner, earlierCalls: [] },
      vi,
    );
    if (model.state !== 'ready') throw new Error('ready');
    expect(model.blooms).toEqual([
      {
        id: 'whats-wrong',
        label: 'NỞ HOA · CỦA RIÊNG BẠN',
        phrase: "What's wrong?",
        sub: 'Bạn tự dùng nó sau nhiều tuần. Giờ nó đã nở hoa.',
      },
    ]);
    expect(model.next).toEqual(['bloom']);
    expect(model.cta).toBe('Tiếp tục');
  });

  it('never comes from Pip’s minute, which is prompted', () => {
    const tiles = phraseTransitions([BLOOM], null);
    expect(bloomsIn({ kind: 'daily' }, tiles, en)).toEqual([]);
    expect(bloomsIn({ kind: 'episode' }, tiles, en)).toHaveLength(1);
  });

  it('isn’t a moment for a phrase that only sprouted or leafed', () => {
    const tiles = phraseTransitions(
      [
        { phraseId: 'how-about', text: 'How about…?', event: 'sprouted' },
        { phraseId: 'can-i-help', text: 'Can I help?', event: 'leafed' },
      ],
      null,
    );
    expect(bloomsIn({ kind: 'episode' }, tiles, en)).toEqual([]);
  });
});

describe('a fix graduating', () => {
  const window = { startedAt: T0, endedAt: T0 + 9 * 60_000 };

  it('is a moment when the target graduated during this call, with the next one named gently', () => {
    const grad = graduationIn(window, graduated(T0 + 60_000), 'Pip', en);
    expect(grad).toEqual({
      targetId: 'past_ed',
      badge: '-ed',
      title: 'Pip stopped asking about your -ed. It’s yours now.',
      sub: expect.any(String),
      next: { tag: 'NEXT', text: expect.stringContaining('“a” and “the”') },
      cta: 'Nice',
    });
  });

  it('isn’t one for a target that graduated in an earlier call', () => {
    expect(graduationIn(window, graduated(T0 - 86_400_000), 'Pip', en)).toBeNull();
  });

  it('comes after the bloom, on an after-call named by its episode', () => {
    const model = buildAfterCall(
      {
        call: episodeThree([BLOOM]),
        progress: progress({ errorTargets: graduated(T0 + 60_000), weeks: [] }),
        learner,
        earlierCalls: [],
      },
      en,
    );
    if (model.state !== 'ready') throw new Error('ready');
    expect(model.next).toEqual(['bloom', 'graduation']);
    expect(model.kicker).toBe('Episode 3 · Cheaper Beans');
  });
});

const flowCall = (id: string, sceneId: string, day: number, flowSeconds: number): CallRecord =>
  call({
    id,
    sceneId,
    kind: sceneId.endsWith('practice') ? 'practice' : 'episode',
    startedAt: T0 + day * 86_400_000,
    endedAt: T0 + day * 86_400_000 + 60_000,
    summary: summary({ metrics: { flowSeconds, paceWpm: 100, pausesPerMin: 3 } }),
  });

describe('then and now', () => {
  const passItOn = flowCall('w1', 's1-e1-practice', 3, 20.4);
  const petition = flowCall('e5', 's1-e5', 29, 47.6);

  it('puts week 1’s Pass it on next to Episode 5’s petition, after its call', () => {
    expect(thenAndNow([passItOn], 'petition', vi, petition)).toEqual({
      kicker: 'NGÀY ẤY · BÂY GIỜ',
      title: 'Nghe bạn bây giờ này',
      then: { week: 'TUẦN 1', title: 'Pass it on', value: '20s' },
      now: { week: 'TUẦN 5', title: 'The Petition', value: '48s' },
      unit: 'nói liền',
      line: 'Nói liền 48 giây không dừng. Tuần 1 là 20 giây.',
      a11y: 'Tuần 1: 20 giây. Tuần 5: 48 giây.',
    });
  });

  it('follows Episode 5 into the after-call, before the keepsake', () => {
    const model = buildAfterCall(
      { call: petition, progress: progress(), learner, earlierCalls: [passItOn] },
      en,
    );
    if (model.state !== 'ready') throw new Error('ready');
    expect(model.thenNow?.line).toBe('48 s without stopping. In week 1 it was 20.');
    expect(model.next).toEqual(['thenNow']);
  });

  it('compares with the first Pass it on, not a replay', () => {
    const replay = flowCall('w1b', 's1-e1-practice', 10, 35);
    expect(thenAndNowCalls([replay, passItOn], 'petition', petition)?.then.id).toBe('w1');
  });

  it('isn’t shown when Flow didn’t grow, or either call is missing', () => {
    expect(thenAndNow([passItOn], 'petition', en, flowCall('e5', 's1-e5', 29, 19))).toBeNull();
    expect(thenAndNow([passItOn], 'petition', en, flowCall('e5', 's1-e5', 29, 20.2))).toBeNull();
    expect(thenAndNow([], 'petition', en, petition)).toBeNull();
    expect(thenAndNow([passItOn], 'petition', en)).toBeNull();
    // Another call isn't the petition: no card after it.
    expect(
      buildAfterCall(
        {
          call: flowCall('e4', 's1-e4', 22, 50),
          progress: progress(),
          learner,
          earlierCalls: [passItOn],
        },
        en,
      ),
    ).toMatchObject({ thenNow: null });
  });

  it('at the season’s end, takes the latest of the last pitches whose Flow grew', () => {
    const townMeeting = flowCall('e6', 's1-e6', 36, 52);
    const pair = thenAndNowCalls([townMeeting, petition, passItOn], 'season');
    expect(pair?.now.id).toBe('e6');
    const shaky = flowCall('e6', 's1-e6', 36, 12);
    expect(thenAndNowCalls([shaky, petition, passItOn], 'season')?.now.id).toBe('e5');
    expect(thenAndNowCalls([shaky, passItOn], 'season')).toBeNull();
    expect(weekOfScene('s1-e6')).toBe(6);
  });
});

describe('Pip’s minute, after the call', () => {
  const minute = (events: PhraseEvent[], sceneId = 's1-pm.2.how-about.whats-wrong') =>
    call({
      kind: 'daily',
      sceneId,
      character: 'pip',
      summary: summary({ wins: [], fix: null, phraseEvents: events }),
    });

  it('shows the phrase Pip set up with its new state, and Pip’s version fixed', () => {
    const card = buildMinuteCard(
      {
        call: minute([
          { phraseId: 'how-about', text: 'How about…?', event: 'used' },
          { phraseId: 'how-about', text: 'How about…?', event: 'leafed' },
          { phraseId: 'whats-wrong', text: "What's wrong?", event: 'used' },
        ]),
        progress: progress(),
        learner,
        firstLanguage: 'vi',
      },
      vi,
    );
    expect(card.kicker).toBe('Một phút với Pip');
    expect(card.notebook).toBe('Đã vào sổ tay của Pip');
    expect(card.quiet).toBeNull();
    expect(card.rows.map((r) => [r.id, r.role, r.line, r.grew, r.artFrom, r.artTo])).toEqual([
      ['how-about', 'due', 'Giờ đã thành lá', true, 'plant-0', 'plant-1'],
      ['whats-wrong', 'reuse', 'Bạn đã sửa câu của Pip', false, null, 'plant-0'],
    ]);
    expect(card.rows[0]?.gloss).not.toBeNull();
  });

  it('says a phrase said again on the same day grows another day', () => {
    const card = buildMinuteCard(
      {
        call: minute(
          [{ phraseId: 'can-i-help', text: 'Can I help?', event: 'used' }],
          's1-pm.1.can-i-help',
        ),
        progress: progress(),
        learner,
        firstLanguage: 'vi',
      },
      en,
    );
    expect(card.rows).toEqual([
      expect.objectContaining({
        id: 'can-i-help',
        line: 'Said again. It grows on another day.',
        grew: false,
      }),
    ]);
  });

  it('is kind when the minute wrote nothing: the phrase waits for another day, Pip’s fix isn’t mentioned', () => {
    const card = buildMinuteCard(
      { call: minute([]), progress: progress(), learner, firstLanguage: 'vi' },
      en,
    );
    expect(card.quiet?.title).toBe('Pip enjoyed the chat');
    expect(card.rows).toEqual([
      expect.objectContaining({
        id: 'how-about',
        line: 'Pip will try this one again another day.',
      }),
    ]);
  });
});
