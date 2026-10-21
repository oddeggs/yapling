import { describe, expect, it } from '@jest/globals';
import { motion } from '@yapling/theme';

import { calm, keyframeStyle, totalMs } from '../src/ui/motion/keyframes';

describe('Reduce Motion', () => {
  it('leaves every animation as designed when it is off', () => {
    expect(calm(motion.screens.toast, false)).toBe(motion.screens.toast);
  });

  it('keeps only the fade of a move that fades (a sheet rising, a toast dropping in)', () => {
    const rise = calm(motion.screens.infoSheet, true);
    expect(rise?.keyframes.transform).toEqual([]);
    expect(rise?.durationMs).toBe(motion.screens.infoSheet.durationMs);
    const mid = keyframeStyle(rise!, totalMs(rise!) / 2);
    expect(mid.transform).toEqual([]);
    expect(mid.opacity).toBeGreaterThan(0);
    expect(mid.opacity).toBeLessThan(1);
  });

  it('turns a pop or a fly-in into a plain fade of the same length', () => {
    const pop = calm(motion.call.timer, true);
    expect(pop?.keyframes.name).toBe('fIn');
    expect(pop?.durationMs).toBe(motion.call.timer.durationMs);
    expect(keyframeStyle(pop!, 0).opacity).toBe(0);
    expect(keyframeStyle(pop!, totalMs(pop!)).opacity).toBe(1);
  });

  it('holds still a loop that only moves (a sway, the mic bars)', () => {
    expect(calm(motion.screens.keepsakeSway, true)).toBeNull();
    expect(calm(motion.call.micBars, true)).toBeNull();
  });

  it('samples a toast at its hold without the centring translate', () => {
    const toast = motion.screens.toast;
    const held = keyframeStyle(toast, toast.durationMs / 2);
    expect(held.opacity).toBe(1);
    expect(held.transform).toEqual([{ translateY: 0 }]);
  });
});
