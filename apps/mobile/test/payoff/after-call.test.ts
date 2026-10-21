import { describe, expect, it } from '@jest/globals';
import { translator } from '@yapling/i18n';

import {
  buildAfterCall,
  phraseTransitions,
  type AfterCallReady,
} from '../../src/features/payoff/model';
import { RING_FULL, T0, call, learner, progress, summary, weekOne } from './fixtures';

const vi = translator('vi');
const en = translator('en');

function ready(model: ReturnType<typeof buildAfterCall>): AfterCallReady {
  if (model.state !== 'ready') throw new Error('expected the feedback to be in');
  return model;
}

describe('after the call', () => {
  it('shows the two wins, the fix and the ring moving from 0 to 1 after the first call', () => {
    const model = ready(
      buildAfterCall({ call: call(), progress: progress(), learner, earlierCalls: [] }, vi),
    );
    expect(model.kicker).toBe('Cuộc gọi đầu tiên');
    expect(model.title).toBe('Xong rồi!');
    expect(model.wins).toEqual({
      title: '2 ĐIỀU LÀM TỐT',
      items: ['You asked Mei what was wrong', 'You introduced yourself to the office'],
    });
    expect(model.quiet).toBeNull();
    expect(model.fix).toMatchObject({
      title: '1 LỖI ĐÃ SỬA',
      from: 'I calling',
      to: "I'm calling",
    });
    expect(model.ring).toEqual({ week: 1, before: 0, after: 1, total: 3 });
    expect(model.ringTag).toBe('Vòng tuần · 1/3');
    expect(model.burrow).toEqual({ kind: 'box', text: 'Một thùng trong hang đã được dỡ' });
    expect(model.next).toEqual([]);
    expect(model.cta).toBe('Về hang');
  });

  it('turns seeds into sprouts and leaves a phrase only met as a seed packet', () => {
    const model = ready(
      buildAfterCall({ call: call(), progress: progress(), learner, earlierCalls: [] }, en),
    );
    expect(model.phrases?.title).toBe('SEED TO SPROUT');
    expect(
      model.phrases?.tiles.map((p) => [p.text, p.from, p.to, p.stage, p.artFrom, p.artTo]),
    ).toEqual([
      ["What's wrong?", 'seed', 'sprout', 'Sprout', 'seed', 'plant-0'],
      ['I need a plan', null, 'seed', 'Seed', null, 'seed'],
      ['Can I help?', 'seed', 'sprout', 'Sprout', 'seed', 'plant-0'],
      ['I think you should…', 'seed', 'sprout', 'Sprout', 'seed', 'plant-0'],
    ]);
  });

  it('reads leaf and bloom moves from the phrase events, and keeps a phrase only used where it is', () => {
    const moves = phraseTransitions(
      [
        { phraseId: 'a', text: 'Could we push that to Friday?', event: 'bloomed' },
        { phraseId: 'b', text: 'I need a plan', event: 'leafed' },
        { phraseId: 'c', text: 'Can I help?', event: 'used' },
      ],
      [
        {
          id: 'c',
          text: 'Can I help?',
          state: 'leaf',
          seedAt: T0,
          sproutAt: T0,
          leafAt: T0,
          bloomAt: null,
          lastUsedAt: T0,
          usedOn: ['2026-09-22'],
          contexts: ['s1-e1'],
        },
      ],
    );
    expect(moves).toEqual([
      { id: 'a', text: 'Could we push that to Friday?', from: 'leaf', to: 'bloom', grew: true },
      { id: 'b', text: 'I need a plan', from: 'sprout', to: 'leaf', grew: true },
      { id: 'c', text: 'Can I help?', from: 'leaf', to: 'leaf', grew: false },
    ]);
  });

  it('gives a bloomed phrase its sparkle card', () => {
    const model = ready(
      buildAfterCall(
        {
          call: call({
            summary: summary({
              phraseEvents: [{ phraseId: 'whats-wrong', text: "What's wrong?", event: 'bloomed' }],
            }),
          }),
          progress: progress(),
          learner,
          earlierCalls: [],
        },
        en,
      ),
    );
    expect(model.phrases?.title).toBe('IN BLOOM');
    expect(model.blooms).toEqual([
      {
        id: 'whats-wrong',
        label: 'BLOOM · YOUR OWN',
        phrase: "What's wrong?",
        sub: 'You used it on your own, weeks later. Now it’s in bloom.',
      },
    ]);
  });

  it('shows "writing it down" while the feedback is on its way, and nothing made up', () => {
    const model = buildAfterCall(
      {
        call: call({ summaryPending: true, summary: null }),
        progress: progress(),
        learner,
        earlierCalls: [],
      },
      en,
    );
    expect(model).toEqual({
      state: 'writing',
      title: 'Pip is writing it down…',
      sub: 'Your wins and phrases will be here in a moment.',
    });
  });

  it('is kind about a short call with nothing to report: no wins, no fix, never a miss', () => {
    const model = ready(
      buildAfterCall(
        {
          call: call({ summary: null, kind: 'practice' }),
          progress: progress({
            weeks: [
              weekOne(
                RING_FULL.slots.map((s) => ({
                  ...s,
                  status: 'open',
                  callRecordId: null,
                  doneAt: null,
                })),
              ),
            ],
          }),
          learner: { ...learner, roommateName: 'Miu' },
          earlierCalls: [],
        },
        en,
      ),
    );
    expect(model.wins).toBeNull();
    expect(model.quiet).toEqual({
      title: 'Miu enjoyed the chat',
      sub: 'Every call counts, the short ones too.',
    });
    expect(model.fix).toBeNull();
    expect(model.phrases).toBeNull();
    expect(model.ring).toBeNull();
    expect(model.kicker).toBe('Practice');
    expect(model.receipt).toBeNull();
  });

  it('prints the fluency receipt against the first call, with "up from" only when Flow grew', () => {
    const first = call({ id: 'call_first', startedAt: T0 - 86_400_000, endedAt: T0 - 86_000_000 });
    const later = call({
      startedAt: T0,
      summary: summary({ metrics: { flowSeconds: 48.2, paceWpm: 112.4, pausesPerMin: 3 } }),
    });
    const model = ready(
      buildAfterCall({ call: later, progress: progress(), learner, earlierCalls: [first] }, en),
    );
    expect(model.receipt).toEqual([
      { label: 'FLOW (no stopping)', value: '48s' },
      { label: 'up from', value: '20s', trend: true },
      { label: 'PACE', value: '112 wds/min' },
      { label: 'PAUSES', value: '3 / min' },
    ]);
    const slower = ready(
      buildAfterCall(
        {
          call: call({
            summary: summary({ metrics: { flowSeconds: 12, paceWpm: 70, pausesPerMin: 8.25 } }),
          }),
          progress: progress(),
          learner,
          earlierCalls: [first],
        },
        en,
      ),
    );
    expect(slower.receipt?.map((r) => r.label)).toEqual(['FLOW (no stopping)', 'PACE', 'PAUSES']);
    expect(slower.receipt?.[2]?.value).toBe('8.3 / min');
  });

  it('names the call by its kind after the first one, and sends a full ring to its keepsake', () => {
    const model = ready(
      buildAfterCall(
        {
          call: call({ kind: 'practice' }),
          progress: progress({
            weeks: [RING_FULL],
            keepsakes: [
              {
                id: 'week-1',
                kind: 'week',
                canDoId: null,
                signedBy: 'pip',
                earnedOn: '2026-09-22',
              },
            ],
          }),
          learner,
          earlierCalls: [],
        },
        vi,
      ),
    );
    expect(model.kicker).toBe('Luyện tập');
    expect(model.ring).toEqual({ week: 1, before: 2, after: 3, total: 3 });
    expect(model.next).toEqual(['keepsake']);
    expect(model.cta).toBe('Tiếp tục');
    expect(model.keepsakes?.ringFull).toEqual({ week: 1 });
  });

  it('celebrates an error target that graduated during the call, and names the next one', () => {
    const at = T0 + 4 * 60_000;
    const model = ready(
      buildAfterCall(
        {
          call: call(),
          progress: progress({
            errorTargets: [
              {
                id: 'past_ed',
                status: 'graduated',
                selfCorrections: 5,
                selfCorrectionDays: ['2026-09-12', '2026-09-17', '2026-09-22'],
                activatedAt: T0 - 9 * 86_400_000,
                graduatedAt: at,
              },
              {
                id: 'articles',
                status: 'active',
                selfCorrections: 0,
                selfCorrectionDays: [],
                activatedAt: at,
                graduatedAt: null,
              },
            ],
          }),
          learner,
          earlierCalls: [],
        },
        en,
      ),
    );
    expect(model.graduation).toEqual({
      targetId: 'past_ed',
      badge: '-ed',
      title: 'Pip stopped asking about your -ed. It’s yours now.',
      sub: 'You fixed it yourself 5 times, on 3 different days.',
      next: {
        tag: 'NEXT',
        text: 'Pip might start asking about “a” and “the”. Gently, and not every time.',
      },
      cta: 'Nice',
    });
    expect(model.next).toEqual(['graduation']);
  });

  it('does not celebrate a target that graduated in an earlier call', () => {
    const model = ready(
      buildAfterCall(
        {
          call: call(),
          progress: progress({
            errorTargets: [
              {
                id: 'past_ed',
                status: 'graduated',
                selfCorrections: 5,
                selfCorrectionDays: ['2026-09-12', '2026-09-17', '2026-09-22'],
                activatedAt: T0 - 9 * 86_400_000,
                graduatedAt: T0 - 86_400_000,
              },
            ],
          }),
          learner,
          earlierCalls: [],
        },
        en,
      ),
    );
    expect(model.graduation).toBeNull();
  });
});
