import { critterMotion } from '@yapling/theme';
import { describe, expect, it } from 'vitest';

import { prototypeDc } from './lipsync/visemes';
import { BLINK, blinkingAt, critterIdle, idleHash, idleTransformAt } from './motion';

describe('critter motion', () => {
  it("blinks to the prototype's rhythm (yap-dc blinkers)", () => {
    const { blinkers } = prototypeDc();
    for (let tick = 0; tick < 3 * BLINK.periodTicks; tick++) {
      expect(blinkingAt(tick * BLINK.tickMs + 1), `tick ${tick}`).toBe(blinkers(tick).b1);
    }
  });

  it('idles by mood with the theme tokens, other moods by the instance hash', () => {
    expect(critterIdle('excited', 0).idle).toBe(critterMotion.idle.excited);
    const hs = idleHash('otter200');
    expect(critterIdle('happy', hs).idle).toBe(critterMotion.rest[hs % 4]);
    expect(critterIdle('happy', 33).r).toBe(16 / 16);
  });

  it('turns keyframes into a Skia transform (a hop rises 16 points at a quarter)', () => {
    const t = idleTransformAt(critterMotion.idle.excited, 0.25 * 1200, 0);
    expect(t).toContainEqual({ translateY: -16 });
    const sway = idleTransformAt(critterMotion.idle.listen, 0, 0);
    expect(sway).toEqual([{ rotate: (-2.5 * Math.PI) / 180 }]);
  });
});
