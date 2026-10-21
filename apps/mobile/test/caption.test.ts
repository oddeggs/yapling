import { describe, expect, it } from '@jest/globals';

import { captionCharTimes, captionWords, saidLength } from '../src/ui/caption';
import timing from '../../../audio/season-1/lines/s1-e1-03-pip.timing.json';

const align = (text: string, step = 0.1) => ({
  characters: [...text],
  character_start_times_seconds: [...text].map((_, i) => i * step),
});

describe('caption timing', () => {
  it('skips delivery tags and matches the caption character by character', () => {
    const times = captionCharTimes('Hi there', align('[whispers] Hi there'));
    // "[whispers] " is 11 characters, so "H" starts at 1.1 s.
    expect(times[0]).toBeCloseTo(1.1);
    expect(times[3]).toBeCloseTo(1.4);
    expect(times).toHaveLength('Hi there'.length);
  });

  it('carries the last time over characters the alignment lacks', () => {
    const times = captionCharTimes('Hi!', align('Hi'));
    expect(times[2]).toBeCloseTo(times[1] ?? -1);
  });

  it('reveals whole words, each from the moment it starts', () => {
    const caption = 'She looks sad.';
    const words = captionWords(caption, captionCharTimes(caption, align(caption)));
    expect(words.map((w) => caption.slice(0, w.end))).toEqual(['She', 'She looks', caption]);
    expect(saidLength(words, -1)).toBe(0);
    expect(saidLength(words, 0)).toBe(3);
    expect(saidLength(words, 0.35)).toBe(3);
    expect(saidLength(words, 0.4)).toBe('She looks'.length);
    expect(saidLength(words, 99)).toBe(caption.length);
  });

  it('follows a recorded line to its end', () => {
    const times = captionCharTimes(timing.caption, timing.alignment);
    const words = captionWords(timing.caption, times);
    expect(words).toHaveLength(timing.caption.split(' ').length);
    // Times never run backwards, and the tag before the first word is not part of it.
    for (let i = 1; i < times.length; i++)
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1] ?? 0);
    expect(words[0]?.at).toBeGreaterThan(0);
    const end = timing.alignment.character_start_times_seconds.at(-1) ?? 0;
    expect(saidLength(words, end)).toBe(timing.caption.length);
  });
});
