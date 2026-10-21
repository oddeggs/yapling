import { describe, expect, it } from 'vitest';

import type { Translation } from './catalogue-types';
import { findCatalogueProblems, findFeatureProblems, findSourceProblems } from './completeness';

const week = {
  'week.title': 'This week',
  'week.notes': { one: '{count} note', other: '{count} notes' },
  'week.cta': 'Go to the café with {name}',
} as const;

describe('a catalogue missing a key', () => {
  it('does not compile, and neither does a misspelt or extra key', () => {
    // @ts-expect-error 'week.cta' is missing
    const partial: Translation<typeof week> = {
      'week.title': 'Tuần này',
      'week.notes': { other: '{count} ghi chú' },
    };
    expect(partial).toBeDefined();
    const extra: Translation<typeof week> = {
      'week.title': 'Tuần này',
      'week.notes': { other: '{count} ghi chú' },
      'week.cta': 'Đến quán cà phê với {name}',
      // @ts-expect-error 'week.tilte' is not an English key
      'week.tilte': 'Tuần này',
    };
    expect(extra).toBeDefined();
  });

  it('fails the completeness check, naming the key', () => {
    const partial = { 'week.title': 'Tuần này', 'week.notes': { other: '{count} ghi chú' } };
    expect(findCatalogueProblems(week, partial, 'vi')).toEqual(['week.cta: missing']);
  });

  it('fails a feature whose other language lacks a key', () => {
    const feature = {
      name: 'week',
      file: 'week',
      catalogues: {
        en: week,
        vi: { 'week.title': 'Tuần này', 'week.notes': { other: '{count} ghi chú' } },
      },
    };
    expect(findFeatureProblems(feature)).toEqual(['week: vi: week.cta: missing']);
  });

  it('passes a complete catalogue', () => {
    const complete: Translation<typeof week> = {
      'week.title': 'Tuần này',
      'week.notes': { other: '{count} ghi chú' },
      'week.cta': 'Đến quán cà phê với {name}',
    };
    expect(findCatalogueProblems(week, complete, 'vi')).toEqual([]);
  });
});

describe('plural forms', () => {
  it('needs exactly the categories its language uses', () => {
    expect(
      findCatalogueProblems(week, { ...week, 'week.notes': { one: '1', other: '{count}' } }, 'vi'),
    ).toEqual(['week.notes: plural has one, never used here']);
    expect(findSourceProblems({ 'a.x': { other: '{count} notes' } })).toEqual([
      'a.x: plural lacks one',
    ]);
  });
});

describe('findCatalogueProblems', () => {
  it('flags extra, empty, reshaped, re-placeholdered and decomposed entries', () => {
    expect(
      findCatalogueProblems(
        {
          'a.empty': 'Full',
          'a.plural': { one: '{count} day', other: '{count} days' },
          'a.params': 'Hi {name}',
          'a.nfc': 'Done',
        },
        {
          'a.empty': ' ',
          'a.plural': '{count} ngày',
          'a.params': 'Chào {ten}',
          'a.nfc': 'Xong rồi'.normalize('NFD'),
          'a.extra': 'Thêm',
        },
      ),
    ).toEqual([
      'a.extra: not in the source catalogue',
      'a.empty: empty',
      'a.plural: plural in one language only',
      'a.params: placeholders differ ({name} in the source, {ten} here)',
      'a.nfc: not in composed Unicode (NFC)',
    ]);
  });
});

describe('findFeatureProblems', () => {
  it('names the file and requires the feature prefix on every key', () => {
    expect(
      findFeatureProblems(
        {
          name: 'week',
          file: 'week',
          catalogues: { en: { 'week.title': 'T', 'plus.title': 'P' } },
        },
        ['en'],
      ),
    ).toEqual(['week: plus.title: keys in week.en.ts start with "week."']);
  });
});
