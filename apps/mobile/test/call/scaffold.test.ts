import { describe, expect, it } from '@jest/globals';
import type { CallServerFrame, Stage } from '@yapling/contracts';
import { getScene } from '@yapling/story';

import { scaffoldView, type ScaffoldInput } from '../../src/features/call/scaffold';
import {
  cardBeatOf,
  initialTracker,
  reduceTracker,
  type TrackerEvent,
  type TrackerState,
} from '../../src/features/call/tracker';
import { initialCallState, update, type CallState } from '../../src/voice/call-state';

const hello = getScene('s1-set1');
const cafe = getScene('s1-set5');
const episode = getScene('s1-e1');

type FrameBody = CallServerFrame extends infer F
  ? F extends { seq: number }
    ? Omit<F, 'seq'>
    : never
  : never;

let seq = 0;
const frame = (body: FrameBody): TrackerEvent => ({
  type: 'frame',
  frame: { ...body, seq: ++seq } as CallServerFrame,
  now: 0,
});
const beat = (beatId: string) => frame({ type: 'beat', beatId, progress: 0.2 });
const heard = (text: string) => frame({ type: 'heard', turn: ++seq, text, words: [] });
const card = (phrase: string, gloss: string, modelLineId?: string) =>
  frame({
    type: 'hint',
    phrase,
    gloss,
    choices: [{ phrase, gloss }],
    persistent: true,
    ...(modelLineId ? { modelLineId } : {}),
  });
const line = (streamId: number) =>
  ({
    type: 'line_shown',
    caption: { streamId, character: 'linh', text: 'Hi!' },
  }) as unknown as TrackerEvent;

function track(scene = hello, events: TrackerEvent[], from: TrackerState = initialTracker) {
  return events.reduce((s, e) => reduceTracker(s, e, { scene, stage: 'visitor' }), from);
}

const yourTurn = (patch: Partial<CallState> = {}) =>
  update(update(initialCallState('hold_to_talk'), { phase: 'connecting' }), {
    connected: true,
    phase: 'your_turn',
    ...patch,
  });

function help(tracker: TrackerState, extra: Partial<ScaffoldInput> = {}, scene = hello) {
  return scaffoldView({
    call: yourTurn(),
    tracker,
    scene,
    stage: 'visitor',
    firstLanguage: 'vi',
    live: true,
    hintShown: false,
    pace: null,
    ...extra,
  });
}

describe('the say-this card', () => {
  const up = track(hello, [line(1), beat('say-hi'), card('Hi!', 'Chào!', 's1-set1-01')]);

  it('is up from the start, with its Vietnamese and "hear it"', () => {
    expect(help(up).cards).toEqual({
      key: 'say-hi',
      cards: [{ phrase: 'Hi!', gloss: 'Chào!', hear: true, said: false }],
      passed: false,
      modelLineId: 's1-set1-01',
    });
    // It stays while the learner talks and while a line plays.
    expect(help(up, { call: yourTurn({ talkHeld: true }) }).cards).not.toBeNull();
  });

  it('ticks when the turn passes, and stays through the next beat only', () => {
    const passed = track(hello, [heard('Hi!'), beat('pip-copies')], up);
    expect(help(passed).cards).toMatchObject({ key: 'say-hi', passed: true });
    const later = track(hello, [beat('and-you')], passed);
    expect(help(later).cards).toBeNull();
  });

  it('is for the next beat when the call sends it before the beat', () => {
    expect(cardBeatOf(hello, 'and-you', "I'm Lan.", 's1-set1-04')).toBe('say-name');
    expect(cardBeatOf(hello, 'say-hi', 'Hi!', 's1-set1-01')).toBe('say-hi');
    // The turn now ticks at once: the next card came, so this one passed.
    const tried = track(hello, [heard('Hi!')], up);
    const next = track(hello, [card("I'm Lan.", 'Mình là Lan.', 's1-set1-04')], tried);
    expect(help(next).cards).toMatchObject({ key: 'say-hi', passed: true });
    const there = track(hello, [beat('pip-copies'), beat('and-you'), beat('say-name')], next);
    expect(help(there).cards).toMatchObject({ key: 'say-name', passed: false });
  });

  it('never ticks a turn that was skipped', () => {
    const skipped = track(
      hello,
      [heard('Uh…'), { type: 'skip_requested' }, beat('pip-copies')],
      up,
    );
    expect(help(skipped).cards).toBeNull();
  });

  it('shows two cards to choose from, "hear it" on the one the model line says', () => {
    const order = track(cafe, [
      beat('order-drink'),
      frame({
        type: 'hint',
        phrase: 'Tea, please.',
        gloss: 'Cho mình trà nhé.',
        choices: [
          { phrase: 'Tea, please.', gloss: 'Cho mình trà nhé.' },
          { phrase: 'Coffee, please.', gloss: 'Cho mình cà phê nhé.' },
        ],
        persistent: true,
      }),
    ]);
    const view = help(order, {}, cafe);
    expect(view.cards?.cards.map((c) => c.phrase)).toEqual(['Tea, please.', 'Coffee, please.']);
    // No recorded line says these: no "hear it".
    expect(view.cards?.modelLineId).toBeNull();
    // The task card, in Vietnamese, until "OK".
    expect(view.task).toEqual({ key: 'order-drink', text: 'Chọn món trên thẻ rồi đọc to nhé.' });
    expect(help(track(cafe, [{ type: 'task_dismissed' }], order), {}, cafe).task).toBeNull();
    // Once it passes, only the card the learner said ticks.
    const said = track(cafe, [heard('Coffee, please.'), beat('kaya-toast')], order);
    expect(help(said, {}, cafe).cards?.cards.map((c) => c.said)).toEqual([false, true]);
  });

  it('knows a number card from the digits the transcript writes', () => {
    const bus = getScene('s1-set4');
    const asked = track(bus, [
      beat('which-bus-answer'),
      frame({
        type: 'hint',
        phrase: 'Forty-five.',
        gloss: 'Bốn mươi lăm.',
        choices: [
          { phrase: 'Forty-five.', gloss: 'Bốn mươi lăm.' },
          { phrase: 'Fifty.', gloss: 'Năm mươi.' },
        ],
        persistent: true,
      }),
      heard('45.'),
      beat('bea-nine'),
    ]);
    expect(help(asked, {}, bus).cards?.cards.map((c) => c.said)).toEqual([true, false]);
  });
});

describe('the pills over the call bar', () => {
  const up = track(hello, [line(1), beat('say-hi'), card('Hi!', 'Chào!', 's1-set1-01')]);

  it('offers "Nói lại" and "Chậm thôi" once a line was said, tappable while the call waits', () => {
    expect(help(up).replay).toEqual({ enabled: true, slowerOn: false });
    expect(help(up, { call: yourTurn({ playing: true }) }).replay?.enabled).toBe(false);
    expect(help(up, { pace: 'slower' }).replay?.slowerOn).toBe(true);
    expect(help(initialTracker).replay).toBeNull();
    expect(help(up, { live: false }).replay).toBeNull();
  });

  it('offers "Bỏ qua" only after a try at a card', () => {
    expect(help(up).skip).toBe(false);
    const tried = track(hello, [heard('Hey there')], up);
    expect(help(tried).skip).toBe(true);
    expect(help(track(hello, [{ type: 'skip_requested' }], tried)).skip).toBe(false);
  });

  it('offers "Gợi ý" from Newcomer up, on a turn with a hint and no card', () => {
    const asked = track(episode, [line(1), beat('ask-whats-wrong')]);
    const newcomer = { stage: 'newcomer' as Stage };
    expect(help(asked, newcomer, episode).hint).toBe(true);
    expect(help(asked, {}, episode).hint).toBe(false);
    expect(help(asked, { ...newcomer, hintShown: true }, episode).hint).toBe(false);
    expect(help(up, newcomer).hint).toBe(false);
  });
});
