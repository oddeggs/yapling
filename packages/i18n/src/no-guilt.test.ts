import { describe, expect, it } from 'vitest';

import { features } from './catalogues.generated';

/*
 * Nothing dies, no guilt: no learner-facing string, in either language, counts what wasn't done,
 * keeps a streak or threatens a loss. The test menu's facilitator labels are left out.
 */

const GUILT: readonly RegExp[] = [
  /\bmiss(ed|ing)?\b/i,
  /\bstreaks?\b/i,
  /\blose\b/i,
  /you('ve| have)? lost/i,
  /\boverdue\b/i,
  /fall(en)? behind/i,
  /\bguilt/i,
  /last chance/i,
  /don'?t break/i,
  /bỏ lỡ/i,
  /(^|\s)lỡ(\s|$)/i,
  /chuỗi/i,
  /quá hạn/i,
];

/**
 * Strings that say "missed" to reassure ("missed weeks wait"), from the design's episode-end card.
 * The gate asks that no screen mention anything missed: these wait on the founder's call.
 */
const WAITING_ON_FOUNDER: ReadonlySet<string> = new Set(['story.end.outOn', 'story.end.readyNow']);

describe('care without guilt', () => {
  it('never counts a miss, keeps a streak or threatens a loss, in any learner-facing string', () => {
    const found = features
      .filter((f) => f.name !== 'devmenu')
      .flatMap((f) =>
        Object.entries(f.catalogues).flatMap(([language, catalogue]) =>
          Object.entries(catalogue as Record<string, string>)
            .filter(
              ([key, text]) => !WAITING_ON_FOUNDER.has(key) && GUILT.some((p) => p.test(text)),
            )
            .map(([key, text]) => `${language} ${key}: ${text}`),
        ),
      );
    expect(found).toEqual([]);
  });
});
