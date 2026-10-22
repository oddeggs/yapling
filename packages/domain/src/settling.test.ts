import { Id, SETTLING_CHAPTER_COUNT } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import { SETTLING_PHRASES, SETTLING_SCENES, settlingPhrasesFor, settlingSceneId } from './settling';

describe('Settling in', () => {
  it('has one scene per chapter, in order', () => {
    expect(SETTLING_SCENES).toHaveLength(SETTLING_CHAPTER_COUNT);
    expect(settlingSceneId(1)).toBe('s1-set1');
    expect(settlingSceneId(6)).toBe('s1-set6');
  });

  it('seeds six phrases: two in Chapter 3, none in Chapter 4', () => {
    expect(SETTLING_PHRASES).toHaveLength(6);
    for (const p of SETTLING_PHRASES) expect(Id.safeParse(p.id).success).toBe(true);
    expect(new Set(SETTLING_PHRASES.map((p) => p.id)).size).toBe(6);
    expect(settlingPhrasesFor(3).map((p) => p.id)).toEqual(['sorry-again-please', 'slowly-please']);
    expect(settlingPhrasesFor(4)).toEqual([]);
    expect([1, 2, 5, 6].map((c) => settlingPhrasesFor(c as 1 | 2 | 5 | 6).length)).toEqual([
      1, 1, 1, 1,
    ]);
  });
});
