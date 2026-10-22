import { describe, expect, it } from '@jest/globals';

import { appendAlignment, EMPTY_TRACK } from '../../src/voice/caption-clock';
import { artVisemeTrack, mouthAt } from '../../src/voice/visemes';

describe("the call's mouths from the art package", () => {
  it('shapes each character, holds it 60 ms, and closes in pauses', () => {
    const track = appendAlignment(
      EMPTY_TRACK,
      ['t', 'h', 'e', ' ', 'b', 'o', 'x'],
      [0, 50, 100, 150, 400, 450, 500],
      [50, 100, 150, 160, 450, 500, 560],
    );
    const v = artVisemeTrack(track);
    expect(mouthAt(v, -5)).toBe('rest');
    expect(mouthAt(v, 10)).toBe('L');
    expect(mouthAt(v, 120)).toBe('E');
    // "e" ends at 150 and the space is silent: closed once the hold runs out.
    expect(mouthAt(v, 300)).toBe('rest');
    expect(mouthAt(v, 420)).toBe('M');
    expect(mouthAt(v, 460)).toBe('O');
    expect(mouthAt(v, 1000)).toBe('rest');
  });

  it('keeps the mouth shut inside delivery tags', () => {
    const chars = [...'[sighs] Oh'];
    const track = appendAlignment(
      EMPTY_TRACK,
      chars,
      chars.map((_, i) => i * 40),
      chars.map((_, i) => i * 40 + 40),
    );
    const v = artVisemeTrack(track);
    expect(mouthAt(v, 100)).toBe('rest');
    expect(mouthAt(v, 8 * 40 + 10)).toBe('O');
  });
});
