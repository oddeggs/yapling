import { describe, expect, it } from '@jest/globals';

import { releaseLine, takeLine, type LineHolder } from '../../src/voice/live-line';

const engine = () => {
  const e = { disposed: 0, dispose: () => Promise.resolve(void e.disposed++) };
  return e satisfies LineHolder;
};

describe('the live line', () => {
  it('holds one call engine: a newer one disposes the one before', () => {
    const first = engine();
    const second = engine();
    takeLine(first);
    takeLine(second);
    expect(first.disposed).toBe(1);
    expect(second.disposed).toBe(0);
    // The first screen unmounting later leaves the newer call alone.
    releaseLine(first);
    const third = engine();
    takeLine(third);
    expect(second.disposed).toBe(1);
    releaseLine(third);
  });

  it('lets go when its screen unmounts', () => {
    const only = engine();
    takeLine(only);
    releaseLine(only);
    takeLine(engine());
    expect(only.disposed).toBe(0);
  });
});
