import { getScene, type RunnerState } from '@yapling/story';
import { describe, expect, it } from 'vitest';

import { parseControl } from './control';
import { Director, replyDirection } from './director';

const E1 = getScene('s1-e1');
const UNPACK = getScene('s1-pro-unpack');

const listening = (sceneId: string, beatId: string, tries = 0): RunnerState => ({
  version: 1,
  sceneId,
  stage: 'newcomer',
  beatId,
  phase: 'listening',
  tries,
  asks: 0,
  correcting: false,
  lastLine: null,
});

describe('the director', () => {
  it('reads unclear and question outcomes from the control line', () => {
    expect(parseControl('{"outcome":"unclear"}').outcome).toBe('unclear');
    expect(parseControl('{"outcome":"question"}').outcome).toBe('question');
  });

  it('keeps the beat for an unclear turn, a question back or an off-topic one', () => {
    for (const outcome of ['unclear', 'question', 'off_topic'] as const) {
      const director = new Director(UNPACK, listening(UNPACK.id, 'ask-work'), 'newcomer');
      const plan = director.plan();
      if (!plan) throw new Error('no plan');
      const applied = director.apply(plan, outcome);
      expect(applied.event).toBe('unclear');
      expect(director.state.beatId).toBe('ask-work');
      expect(director.state.tries).toBe(1);
      expect(applied.effects.some((e) => e.type === 'beat_changed')).toBe(false);
    }
  });

  it('offers the hint on a long quiet once, and never as a try', () => {
    const director = new Director(UNPACK, listening(UNPACK.id, 'ask-work'), 'newcomer');
    expect(director.offersOnQuiet()).toBe(true);
    const effects = director.dispatch({ type: 'silent' });
    expect(effects.map((e) => e.type)).toEqual(['hint']);
    expect(director.state).toMatchObject({ beatId: 'ask-work', tries: 0, phase: 'listening' });
    expect(director.offersOnQuiet()).toBe(false);
    expect(director.dispatch({ type: 'silent' })).toEqual([]);
  });

  it('falls back after the beat’s tries, so nobody is stuck', () => {
    const director = new Director(UNPACK, listening(UNPACK.id, 'ask-work', 1), 'newcomer');
    const plan = director.plan();
    if (!plan) throw new Error('no plan');
    const applied = director.apply(plan, 'question');
    expect(director.state.phase).toBe('fallback');
    // Pip's fallback is folded into Pip's own answer.
    expect(applied.fulfilled).toBe(true);
  });

  it('answers each kind of turn its own way, never by echoing the learner as quiet', () => {
    const director = new Director(UNPACK, listening(UNPACK.id, 'ask-work'), 'newcomer');
    const plan = director.plan();
    if (!plan) throw new Error('no plan');
    const text = replyDirection(plan, 'newcomer', [], null, 'What do you do for work?');
    expect(text).toContain('[unclear]');
    expect(text).toContain('[question]');
    expect(text).toContain('[off_topic]');
    expect(text).toContain('"What do you do for work?"');
    expect(text).toMatch(/\[question\][^\n]*answer it in a few words/i);
    expect(text).not.toMatch(/learner is quiet/i);
  });

  it('on the last try, leads into the fallback instead of asking again', () => {
    const director = new Director(UNPACK, listening(UNPACK.id, 'ask-work', 1), 'newcomer');
    const plan = director.plan();
    if (!plan) throw new Error('no plan');
    const text = replyDirection(plan, 'newcomer', [], null);
    expect(text).toMatch(/\[question\][^\n]*last try[^\n]*no rush/i);
    // The fallback is a direction to follow in the character's own words, never a line to read.
    expect(text).toMatch(/last try[^\n]*never words to read out/i);
    expect(text).not.toMatch(/Say that's okay|Then open the next box/);
  });

  it('reacts without a question when someone else speaks next', () => {
    // At "what's wrong", Pip asks for the learner once the tries run out.
    const director = new Director(E1, listening(E1.id, 'ask-whats-wrong', 2), 'newcomer');
    const plan = director.plan();
    if (!plan) throw new Error('no plan');
    expect(plan.offTopic.kind).toBe('react');
    expect(replyDirection(plan, 'newcomer', [], null)).toMatch(
      /\[off_topic\][^\n]*with no question/,
    );
  });

  it('never hands the listener the answer the learner is meant to give', () => {
    const director = new Director(E1, listening(E1.id, 'teach-rent'), 'newcomer');
    const plan = director.plan();
    if (!plan) throw new Error('no plan');
    const text = replyDirection(plan, 'newcomer', [], null, 'What does rent mean?', 'Not sure.');
    expect(text).toContain('Only the learner may give that answer');
    // The next line's written example holds the answer ("the money you pay"): left out.
    expect(text).not.toMatch(/money you pay/);
    expect(text).toContain('They said: "Not sure."');
    expect(text).toMatch(/\[unclear\][^\n]*Do not explain it or answer it/);
  });

  it('asks no question of its own when someone else prompted the learner', () => {
    const director = new Director(E1, listening(E1.id, 'ask-whats-wrong'), 'newcomer');
    const plan = director.plan();
    if (!plan) throw new Error('no plan');
    const text = replyDirection(plan, 'newcomer', [], null, null, 'Can I have a coffee?');
    expect(text).toContain('You have asked them nothing yet');
    expect(text).toMatch(/\[off_topic\][^\n]*with no question/);
  });
});
