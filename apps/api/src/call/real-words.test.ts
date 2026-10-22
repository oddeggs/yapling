import { describe, expect, it } from 'vitest';

import { hasRealWords } from './real-words';

describe('real words', () => {
  it('finds none in an empty press, noise tags or hesitation alone', () => {
    for (const text of [
      '',
      '   ',
      '...',
      'uh',
      'Um.',
      'ummm',
      'uh, um… er',
      'Hmm?',
      'mm-hmm',
      'Ờ',
      'ờ… ừm',
      'à',
      '(coughs)',
      '[noise]',
      '(background noise) uh',
      '*laughs*',
    ]) {
      expect(hasRealWords(text), text).toBe(false);
    }
  });

  it('counts any other word, however short, in any language', () => {
    for (const text of [
      'I',
      'No.',
      'ok',
      'Yes!',
      '25',
      "What's wrong?",
      "um, I'm a teacher",
      'uh… hi',
      'Tôi không biết',
      'ừ',
      '(coughs) sorry',
    ]) {
      expect(hasRealWords(text), text).toBe(true);
    }
  });
});
