import { describe, expect, it } from '@jest/globals';

import { sentences } from '../src/ui/spoken';

describe('lines read aloud together', () => {
  it('adds a full stop only where a line doesn’t end a sentence already', () => {
    expect(sentences('No quiz, promise! It just helps me help you.', 'Chỉ để mình giúp bạn.')).toBe(
      'No quiz, promise! It just helps me help you. Chỉ để mình giúp bạn.',
    );
    expect(sentences('Linh, AI: Hi', 'Chào')).toBe('Linh, AI: Hi. Chào');
    expect(sentences('Great!', null, '', 'Tuyệt!')).toBe('Great! Tuyệt!');
    expect(sentences('“Hi.”', 'Chào')).toBe('“Hi.” Chào');
  });
});
