import { describe, expect, it } from 'vitest';

import { getScene } from './catalogue';
import { reduceScene, type RunnerState, type SceneEffect } from './runner';
import { lastQuestion, safeLineFor } from './safe-lines';

type GenEffect = Extract<SceneEffect, { type: 'gen' }>;

const E1 = getScene('s1-e1');
const listening = (beatId: string, tries = 0): RunnerState => ({
  version: 1,
  sceneId: E1.id,
  stage: 'local',
  beatId,
  phase: 'listening',
  tries,
  asks: 0,
  correcting: false,
  lastLine: null,
});
const genOf = (effects: readonly SceneEffect[]): GenEffect => {
  const gen = effects.find((e): e is GenEffect => e.type === 'gen');
  if (!gen) throw new Error('no generated line');
  return gen;
};

describe('safe lines', () => {
  it('asks the beat again for a nudge', () => {
    const nudge = genOf(reduceScene(E1, listening('agree-to-call'), { type: 'unclear' }).effects);
    expect(nudge.purpose).toBe('nudge');
    expect(safeLineFor(nudge, 'Can you call them for me?')).toBe(
      'No rush. Can you call them for me?',
    );
    expect(safeLineFor(nudge, null)).toBe('No rush. Take your time.');
  });

  it("says the words a fallback's direction quotes", () => {
    const fallback = genOf(
      reduceScene(E1, listening('agree-to-call', 1), { type: 'unclear' }).effects,
    );
    expect(fallback.purpose).toBe('fallback');
    expect(safeLineFor(fallback, null)).toBe('We can do it!');
  });

  it('finds the last question of a line', () => {
    expect(lastQuestion('Sit, sit. Kaya toast?')).toBe('Kaya toast?');
    expect(lastQuestion("What's wrong? You look worried.")).toBe("What's wrong?");
    expect(lastQuestion('Okay. Thank you.')).toBeNull();
  });
});
