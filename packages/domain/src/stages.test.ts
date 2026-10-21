import { STAGES } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  adjustStage,
  hintPolicy,
  isStageAtLeast,
  nextStage,
  pipStage,
  previousStage,
  shouldShowHint,
  SPEECH_SETTINGS,
  speechSettings,
  ttsSpeedFactor,
} from './stages';

const stage = fc.constantFrom(...STAGES);

describe('stage speech settings', () => {
  it.each([
    ['newcomer', 110, 'short_one_idea', 'none', 'never', 0.8],
    ['neighbour', 130, 'one_or_two_ideas', 'rare_explained', 'never', 0.9],
    ['regular', 150, 'normal', 'some', 'rarely_gently', 1.0],
    ['local', 165, 'normal_overlapping', 'natural', 'yes_then_yield', 1.0],
    ['voice', 170, 'natural', 'natural', 'yes', 1.1],
  ] as const)('%s talks at %i wpm', (s, wpm, length, idioms, interruptions, speed) => {
    const settings = speechSettings(s);
    expect(settings.wordsPerMinute).toBe(wpm);
    expect(settings.sentenceLength).toBe(length);
    expect(settings.idioms).toBe(idioms);
    expect(settings.interruptions).toBe(interruptions);
    expect(ttsSpeedFactor(s)).toBe(speed);
  });

  it('hints after 4 s at Newcomer, 6 s at Neighbour, and only on request after', () => {
    expect(hintPolicy('newcomer')).toEqual({ kind: 'after_pause', pauseMs: 4_000 });
    expect(hintPolicy('neighbour')).toEqual({ kind: 'after_pause', pauseMs: 6_000 });
    for (const s of ['regular', 'local', 'voice'] as const) {
      expect(hintPolicy(s)).toEqual({ kind: 'on_request' });
    }
    expect(shouldShowHint('newcomer', 3_999, false)).toBe(false);
    expect(shouldShowHint('newcomer', 4_000, false)).toBe(true);
    expect(shouldShowHint('neighbour', 5_000, false)).toBe(false);
    expect(shouldShowHint('neighbour', 6_000, false)).toBe(true);
    expect(shouldShowHint('regular', 60_000, false)).toBe(false);
  });

  it('always hints when asked', () => {
    fc.assert(
      fc.property(stage, fc.nat(), (s, silence) => {
        expect(shouldShowHint(s, silence, true)).toBe(true);
      }),
    );
  });

  it('gets faster, never slower, stage by stage; Hard mode only speeds up from Local', () => {
    for (let i = 1; i < STAGES.length; i++) {
      const before = SPEECH_SETTINGS[STAGES[i - 1]!];
      const after = SPEECH_SETTINGS[STAGES[i]!];
      expect(after.wordsPerMinute).toBeGreaterThan(before.wordsPerMinute);
      expect(after.ttsSpeed.min).toBeGreaterThanOrEqual(before.ttsSpeed.min);
    }
    expect(ttsSpeedFactor('newcomer', 'hard')).toBe(0.8);
    expect(ttsSpeedFactor('local', 'hard')).toBe(1.1);
    fc.assert(
      fc.property(stage, (s) => {
        const speed = ttsSpeedFactor(s, 'hard');
        expect(speed).toBeGreaterThanOrEqual(0.7);
        expect(speed).toBeLessThanOrEqual(1.2);
        expect(SPEECH_SETTINGS[s].maxWordsPerTurn).toBeLessThanOrEqual(25);
      }),
    );
  });
});

describe('phrase breaks', () => {
  it('slow the two slowest stages, Newcomer most, and stop from Regular', () => {
    expect(SPEECH_SETTINGS.newcomer.phraseBreakSeconds).toBe(0.35);
    expect(SPEECH_SETTINGS.neighbour.phraseBreakSeconds).toBe(0.2);
    for (const s of ['regular', 'local', 'voice'] as const) {
      expect(SPEECH_SETTINGS[s].phraseBreakSeconds).toBeNull();
    }
  });

  it('never grow as the stages get faster', () => {
    for (let i = 1; i < STAGES.length; i++) {
      const before = SPEECH_SETTINGS[STAGES[i - 1]!].phraseBreakSeconds ?? 0;
      const after = SPEECH_SETTINGS[STAGES[i]!].phraseBreakSeconds ?? 0;
      expect(after).toBeLessThanOrEqual(before);
    }
  });
});

describe('moving between stages', () => {
  it('steps one stage at a time and stops at the ends', () => {
    expect(nextStage('newcomer')).toBe('neighbour');
    expect(nextStage('voice')).toBe('voice');
    expect(previousStage('newcomer')).toBe('newcomer');
    expect(adjustStage('neighbour', 'too_easy')).toBe('regular');
    expect(adjustStage('neighbour', 'too_hard')).toBe('newcomer');
    expect(isStageAtLeast('local', 'regular')).toBe(true);
    expect(isStageAtLeast('newcomer', 'neighbour')).toBe(false);
  });

  it('keeps Pip one stage below the learner, never below Newcomer', () => {
    expect(pipStage('newcomer')).toBe('newcomer');
    expect(pipStage('neighbour')).toBe('newcomer');
    fc.assert(
      fc.property(stage, (s) => {
        expect(isStageAtLeast(s, pipStage(s))).toBe(true);
      }),
    );
  });
});
