import { FIRST_LANGUAGES, STAGES } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { chromeLocale, glossPolicy, type HelpSurface } from './first-language';
import { meetPhrase } from './phrases';

const vi = { firstLanguage: 'vi' } as const;

describe('first-language help', () => {
  it('shows the chrome in the learner’s language', () => {
    expect(chromeLocale('vi')).toBe('vi');
    expect(chromeLocale('other')).toBe('en');
  });

  it('fades captions from line glosses everywhere to English definitions only', () => {
    expect(glossPolicy('newcomer', 'captions', vi)).toEqual({
      unit: 'line',
      layers: ['l1'],
      reveal: 'marked',
    });
    expect(glossPolicy('neighbour', 'captions', vi)).toEqual({
      unit: 'line',
      layers: ['l1'],
      reveal: 'on_tap',
    });
    expect(glossPolicy('regular', 'captions', vi)).toEqual({
      unit: 'word',
      layers: ['english', 'l1'],
      reveal: 'on_tap',
    });
    expect(glossPolicy('local', 'captions', vi).layers).toEqual(['english']);
    expect(glossPolicy('voice', 'captions', { ...vi, l1BackOn: true }).layers).toEqual([
      'english',
      'l1',
    ]);
  });

  it('explains in simple English first in a live call, the first language one tap further', () => {
    expect(glossPolicy('newcomer', 'live_call', vi).layers).toEqual(['english', 'l1']);
  });

  it('explains fixes in the first language at Newcomer and Neighbour, English first from Regular', () => {
    expect(glossPolicy('newcomer', 'post_call_fixes', vi).layers).toEqual(['l1']);
    expect(glossPolicy('neighbour', 'post_call_fixes', vi).layers).toEqual(['l1']);
    expect(glossPolicy('regular', 'post_call_fixes', vi).layers).toEqual(['english', 'l1']);
  });

  it('never helps in listening checkpoints or Pass it on, nor in a language it doesn’t have', () => {
    const surfaces: HelpSurface[] = [
      'captions',
      'live_call',
      'post_call_fixes',
      'listening_checkpoint',
      'pass_it_on',
    ];
    fc.assert(
      fc.property(
        fc.constantFrom(...STAGES),
        fc.constantFrom(...surfaces),
        fc.constantFrom(...FIRST_LANGUAGES),
        fc.boolean(),
        (stage, surface, firstLanguage, l1BackOn) => {
          const policy = glossPolicy(stage, surface, { firstLanguage, l1BackOn });
          if (surface === 'listening_checkpoint' || surface === 'pass_it_on') {
            expect(policy.layers).toEqual([]);
          }
          if (firstLanguage === 'other') expect(policy.layers).not.toContain('l1');
          expect(policy.layers.length === 0).toBe(policy.unit === null);
        },
      ),
    );
  });

  it('turns a tapped phrase into a seed, with no penalty', () => {
    const { phrases, met } = meetPhrase([], { id: 'rent', text: 'rent', at: 1_790_000_000_000 });
    expect(met).toBe(true);
    expect(phrases[0]?.state).toBe('seed');
  });
});

describe('first-language help at Visitor', () => {
  it('shows the line gloss under every line without a tap', () => {
    expect(glossPolicy('visitor', 'captions', vi)).toEqual({
      unit: 'line',
      layers: ['l1'],
      reveal: 'shown',
    });
  });

  it('answers "What does that mean?" in the first language first, simple English one tap further', () => {
    expect(glossPolicy('visitor', 'live_call', vi)).toEqual({
      unit: 'line',
      layers: ['l1', 'english'],
      reveal: 'on_tap',
    });
  });

  it('keeps Pass it on and listening checkpoints English only, and English only without a first language', () => {
    expect(glossPolicy('visitor', 'pass_it_on', vi).layers).toEqual([]);
    expect(glossPolicy('visitor', 'listening_checkpoint', vi).layers).toEqual([]);
    expect(glossPolicy('visitor', 'captions', { firstLanguage: 'other' }).unit).toBeNull();
    expect(glossPolicy('visitor', 'live_call', { firstLanguage: 'other' }).layers).toEqual([
      'english',
    ]);
  });
});
