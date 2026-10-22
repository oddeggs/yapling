import { describe, expect, it } from '@jest/globals';
import type { TurnPass } from '@yapling/domain';
import { translator } from '@yapling/i18n';

import {
  STAGE_UP_REQUESTS,
  stageUpOffer,
  stageUpView,
} from '../../src/features/payoff/stage-up-model';
import { CALL_ID, RING_FULL, RING_ONE } from './fixtures';

const vi = translator('vi');
const en = translator('en');

const turns = (match: number, other: TurnPass, count: number): TurnPass[] => [
  ...Array<TurnPass>(match).fill('match'),
  ...Array<TurnPass>(count).fill(other),
];

const offer = (over: Partial<Parameters<typeof stageUpOffer>[0]> = {}) =>
  stageUpOffer({
    call: { id: CALL_ID },
    stage: 'visitor',
    weeks: [RING_FULL],
    weekTurns: turns(7, 'generous', 3),
    answeredWeeks: [],
    ...over,
  });

describe('Linh’s Newcomer card', () => {
  it('is offered to a Visitor whose call filled the ring with 70% of turns passed on their own', () => {
    expect(offer()).toEqual({ week: 1 });
    expect(offer({ weekTurns: turns(10, 'skip', 0) })).toEqual({ week: 1 });
  });

  it('waits when too many turns needed the generous pass, a skip or someone else to say it', () => {
    expect(offer({ weekTurns: turns(6, 'generous', 4) })).toBeNull();
    expect(offer({ weekTurns: turns(6, 'skip', 4) })).toBeNull();
    expect(offer({ weekTurns: turns(6, 'fallback', 4) })).toBeNull();
    expect(offer({ weekTurns: [] })).toBeNull();
  });

  it('is only for a Visitor, only when this call filled the ring', () => {
    expect(offer({ stage: 'newcomer' })).toBeNull();
    expect(offer({ weeks: [RING_ONE] })).toBeNull();
    expect(offer({ call: { id: 'call_a' } })).toBeNull();
  });

  it('isn’t offered while the phone can’t tell how the week’s turns passed', () => {
    expect(offer({ weekTurns: null })).toBeNull();
  });

  it('is offered once a week: after "Ở lại thêm" Linh waits for the next ring', () => {
    expect(offer({ answeredWeeks: [1] })).toBeNull();
    const weekOneDone = {
      week: 1,
      slots: RING_FULL.slots.map((slot) => ({ ...slot, callRecordId: `${slot.callRecordId}-w1` })),
    };
    expect(offer({ weeks: [weekOneDone, { ...RING_FULL, week: 2 }], answeredWeeks: [1] })).toEqual({
      week: 2,
    });
  });

  it('asks the server for the card or for a little longer as a Visitor', () => {
    expect(STAGE_UP_REQUESTS.take).toEqual({ to: 'newcomer', reason: 'stage_up' });
    expect(STAGE_UP_REQUESTS.stay).toEqual({ to: 'visitor', reason: 'stay' });
  });
});

describe('the stage-up screen', () => {
  const base = { learnerName: 'Lan', firstLanguage: 'vi', today: '2026-09-28', hour: 20 } as const;

  it('offers the Newcomer card with Linh’s line, its meaning and the two answers', () => {
    expect(stageUpView({ ...base, phase: 'offer' }, vi)).toMatchObject({
      line: 'Knock knock! You’re not a visitor any more.',
      gloss: 'Cốc cốc! Bạn không còn là khách nữa rồi.',
      card: { stageName: 'Newcomer', stageLocal: 'Người mới', chip: 'Chặng 1/5', stamp: null },
      note: 'Một tuần làm quen đã xong. Thẻ mới mở các cuộc gọi trong truyện.',
      choice: { stay: 'Ở lại thêm', take: 'Nhận thẻ' },
      cta: null,
    });
  });

  it('stamps the card with the day once it’s taken, then hangs it', () => {
    expect(stageUpView({ ...base, phase: 'taken' }, vi)).toMatchObject({
      line: 'Welcome to Natterwick, neighbour.',
      card: { stamp: { stage: 'NEWCOMER', town: 'NW', date: 'SEP 28' } },
      choice: null,
      cta: 'Treo lên tường',
    });
  });

  it('keeps the Visitor’s card, with no stage count, when the learner stays', () => {
    const stay = stageUpView({ ...base, phase: 'stay' }, vi);
    expect(stay).toMatchObject({
      line: 'Of course! Same time tomorrow?',
      card: {
        stageName: 'Visitor',
        stageLocal: 'Khách mới đến',
        chip: null,
        fill: 'secondarySoft',
      },
      note: 'Bạn vẫn là Khách mới đến. Nhận thẻ lúc nào cũng được, trong mục Tôi.',
      cta: 'Chúc ngủ ngon',
      evening: true,
    });
    expect(stageUpView({ ...base, phase: 'stay', hour: 10 }, vi).cta).toBe('Về hang');
  });

  it('shows no meaning under Linh’s line for a learner whose language has none', () => {
    const view = stageUpView({ ...base, phase: 'offer', firstLanguage: 'other' }, en);
    expect(view.gloss).toBeNull();
    expect(view.card.stageLocal).toBeNull();
  });
});
