import { describe, expect, it } from '@jest/globals';

import { CHECK_EVERY_MS, shouldApply, shouldCheck } from '../../src/features/updates/policy';

describe('over-the-air updates', () => {
  it('checks at launch, then at most every few minutes', () => {
    expect(shouldCheck(null, 1_000)).toBe(true);
    expect(shouldCheck(1_000, 1_000 + CHECK_EVERY_MS - 1)).toBe(false);
    expect(shouldCheck(1_000, 1_000 + CHECK_EVERY_MS)).toBe(true);
  });

  it('restarts only as the app comes to the front on the burrow, the week or the season map', () => {
    expect(shouldApply(true, true, '/')).toBe(true);
    expect(shouldApply(true, true, '/week')).toBe(true);
    expect(shouldApply(true, true, '/season')).toBe(true);
    expect(shouldApply(true, true, '/call')).toBe(false);
    expect(shouldApply(true, true, '/listen/s1-e1-story')).toBe(false);
    expect(shouldApply(true, true, '/onboarding/unpack')).toBe(false);
    expect(shouldApply(true, false, '/')).toBe(false);
    expect(shouldApply(false, true, '/')).toBe(false);
  });
});
