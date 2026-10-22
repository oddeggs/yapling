import { describe, expect, it } from 'vitest';

import { hasRealWords, speechKind } from './real-words';

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
      'Uh huh uh',
      'uh-huh',
      'Mm hm.',
      'Un huh.',
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
      // A lone "huh" asks to hear the line again: it is a turn.
      'Huh?',
      'Uh huh, I am a teacher.',
      'Huhu, okay.',
    ]) {
      expect(hasRealWords(text), text).toBe(true);
    }
  });
});

describe('the kind of speech', () => {
  it('reads a real word with Vietnamese marks as Vietnamese', () => {
    for (const text of [
      'Có chuyện gì vậy chị?',
      'Dạ, cảm ơn.',
      'Dạ.',
      'Ơ kìa.',
      'Ừm, không.',
      'Bánh mì.',
      'Trà.',
    ]) {
      expect(speechKind(text), text).toBe('vietnamese');
    }
  });

  it('reads the rest as English, and hesitation alone as noise', () => {
    for (const text of ['E-M-T-J.', 'Sorry, again, please.', 'Okay lah.', 'Five.', 'Huh?']) {
      expect(speechKind(text), text).toBe('english');
    }
    for (const text of ['', 'Hmm.', 'Uh, uh.', '[laughs]', 'Mm-hmm.', 'Uh huh uh', 'Ờ…']) {
      expect(speechKind(text), text).toBe('noise');
    }
  });

  it('cannot see Vietnamese typed without its marks', () => {
    expect(speechKind('Toi khong biet.')).toBe('english');
  });
});
