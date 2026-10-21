import { beforeAll, describe, expect, it } from 'vitest';

import { GOLDEN_MEAN_LIMIT } from './compare';
import {
  compareState,
  goldenArt,
  rendersPresent,
  SKIP_MESSAGE,
  writeFailure,
  type Golden,
} from './run';
import { stateId, type ArtState } from './states';

/**
 * Each state, drawn by this package on CanvasKit as the app draws it, matches the prototype's
 * render (`design/renders/art`, from headless Chrome) within a mean difference of 2/255. Without
 * the renders (CI) the states are skipped.
 */
export function defineGoldens(title: string, states: readonly ArtState[]): void {
  const present = rendersPresent(states);
  if (!present) console.warn(`${title}: ${SKIP_MESSAGE}`);
  describe.skipIf(!present)(present ? title : `${title} — ${SKIP_MESSAGE}`, () => {
    let g: Golden;
    beforeAll(async () => {
      g = await goldenArt();
    });
    it.each(states.map((s) => [stateId(s), s] as const))('%s matches the render', (_, s) => {
      const r = compareState(g, s);
      if (r.mean > GOLDEN_MEAN_LIMIT) writeFailure(g, s);
      expect(
        r.mean,
        `mean ${r.mean.toFixed(3)}, worst tile ${r.worstTile.toFixed(2)}`,
      ).toBeLessThanOrEqual(GOLDEN_MEAN_LIMIT);
    });
  });
}
