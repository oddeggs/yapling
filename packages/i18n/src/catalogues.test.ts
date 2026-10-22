import { describe, expect, it } from 'vitest';

import { languages, sourceLanguage } from './catalogue-types';
import { catalogues, en, features } from './catalogues.generated';
import { findFeatureProblems } from './completeness';

describe('every feature catalogue', () => {
  it.each(features.map((f) => [f.file, f] as const))(
    '%s is complete in Vietnamese and English, with plain placeholders and its own key prefix',
    (_file, feature) => {
      expect(findFeatureProblems(feature, languages)).toEqual([]);
    },
  );

  it('cover the features of the first week', () => {
    expect(features.map((f) => f.name)).toEqual(
      expect.arrayContaining([
        'onboarding',
        'burrow',
        'week',
        'call',
        'payoff',
        'story',
        'season',
        'plus',
        'me',
        'safety',
        'knocks',
        'errors',
        'cando',
      ]),
    );
  });
});

describe('the merged catalogues', () => {
  it('lose no key to another feature', () => {
    const total = features.reduce(
      (sum, f) => sum + Object.keys(f.catalogues[sourceLanguage]).length,
      0,
    );
    expect(Object.keys(en)).toHaveLength(total);
  });

  it('exist for every shipped language, each with only source keys', () => {
    expect(Object.keys(catalogues).sort()).toEqual([...languages].sort());
    for (const l of languages)
      expect(Object.keys(catalogues[l]).filter((key) => !(key in en))).toEqual([]);
  });

  it('carry the keys the learning model schedules and shows', () => {
    const days = ['2', '3', '4', '5', '6', '7', '8', '8_back'].map((d) => `knocks.day${d}`);
    for (const key of days) expect(Object.keys(catalogues.vi)).toContain(key);
    const canDos = Object.keys(en).filter((k) => k.startsWith('cando.'));
    const titles = canDos.filter((k) => !k.endsWith('.certificate'));
    expect(titles).toHaveLength(12);
    // Each can-do has its keepsake wording too.
    expect(canDos.filter((k) => k.endsWith('.certificate')).sort()).toEqual(
      titles.map((k) => `${k}.certificate`).sort(),
    );
  });
});

describe('the design review’s copy', () => {
  it('upgrades to Plus instead of promising a free trial', () => {
    expect(catalogues.vi['plus.cta']).toBe('Nâng cấp lên Plus');
    expect(catalogues.en['plus.cta']).toBe('Get Plus');
    const all = [...Object.values(catalogues.vi), ...Object.values(catalogues.en)].map((e) =>
      JSON.stringify(e),
    );
    expect(
      all.filter((text) => text.includes('Dùng thử Plus') || text.includes('Try Plus')),
    ).toEqual([]);
  });

  it('gives the paywall restore, terms, privacy and the auto-renew wording', () => {
    for (const key of ['plus.restore', 'plus.terms', 'plus.privacy', 'plus.autoRenew'] as const)
      expect(catalogues.vi[key].length).toBeGreaterThan(0);
  });
});
