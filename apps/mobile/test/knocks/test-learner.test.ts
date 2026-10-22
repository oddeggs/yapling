import { describe, expect, it } from '@jest/globals';

import {
  letterAhead,
  testLearnerOf,
  withBurrowSettling,
} from '../../src/features/devmenu/test-learner';

const known = {
  ...testLearnerOf(null, Date.UTC(2026, 9, 23, 3)),
  installedOn: '2026-10-23',
  timezone: 'Asia/Ho_Chi_Minh',
  known: true,
};

describe('the test menu’s learner, as the burrow sees them', () => {
  it('takes the burrow’s chapters and letter day over the server’s copy', () => {
    const chapters = [1, 2, 3, 4, 5, 6].map((chapter) => ({
      chapter,
      doneOn: '2026-10-23',
      callRecordId: null,
    }));
    const learner = withBurrowSettling(known, {
      visitorPath: true,
      chapters,
      letterOn: '2026-10-23',
    });
    expect(learner.settling).toEqual({ visitorPath: true, chapters, storyStartedOn: '2026-10-23' });
    expect(learner.storyDayOne).toBe('2026-10-23');
    expect(letterAhead(learner, '2026-10-23')).toBe(false);
  });

  it('says when the burrow’s letter is dated after the clock', () => {
    const learner = withBurrowSettling(known, {
      visitorPath: true,
      chapters: [],
      letterOn: '2026-10-28',
    });
    expect(letterAhead(learner, '2026-10-23')).toBe(true);
    expect(letterAhead(learner, '2026-10-28')).toBe(false);
  });

  it('keeps the learner as it was until the burrow has read its data', () => {
    expect(withBurrowSettling(known, null)).toBe(known);
  });
});
