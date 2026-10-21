import { describe, expect, it } from 'vitest';

import { pickLanguage } from './pick-language';
import { pluralCategory } from './plural';
import { resolveEntry, t, translator } from './translate';

describe('t', () => {
  it('reads Vietnamese and English', () => {
    expect(t('vi', 'call.holdOn')).toBe('Chờ chút');
    expect(t('en', 'call.holdOn')).toBe('Hold on');
  });

  it('fills placeholders, and leaves a missing one visible', () => {
    expect(t('vi', 'onboarding.ai.title', { name: 'Pip' })).toBe('Pip và hàng xóm là AI');
    expect(t('en', 'week.ringToast', { done: 2, total: 3 })).toBe('Weekly ring: 2 of 3');
    // @ts-expect-error a params argument without `name`
    expect(t('en', 'onboarding.ai.title', {})).toBe('{name} and the neighbours are AI');
  });

  it('picks plural forms by each language’s rule', () => {
    expect(t('en', 'me.memoryNotes', { count: 1 })).toBe('1 note');
    expect(t('en', 'me.memoryNotes', { count: 14 })).toBe('14 notes');
    expect(t('vi', 'me.memoryNotes', { count: 1 })).toBe('1 ghi chú');
    expect(t('en', 'plus.ctaTrial', { count: 7 })).toBe('Try 7 days free');
  });

  it('formats dates in each language’s order', () => {
    const vi = translator('vi');
    const en = translator('en');
    expect(
      vi('common.date.long', {
        weekday: vi('common.weekday.mon'),
        day: 21,
        month: vi('common.month.9'),
      }),
    ).toBe('Thứ Hai, 21 tháng 9');
    expect(
      en('common.date.long', {
        weekday: en('common.weekday.mon'),
        day: 21,
        month: en('common.month.9'),
      }),
    ).toBe('Monday 21 September');
    expect(en('common.date.range', { from: 21, to: 27, month: en('common.monthShort.9') })).toBe(
      'Sep 21 – 27',
    );
    expect(vi('common.date.range', { from: 21, to: 27, month: vi('common.monthShort.9') })).toBe(
      '21 – 27 tháng 9',
    );
  });
});

describe('resolveEntry', () => {
  it('falls back to English for a blank or absent entry, then to nothing', () => {
    const from = { en: { 'a.x': 'Hi' }, vi: { 'a.x': ' ' } };
    expect(resolveEntry(from, 'vi', 'a.x')).toEqual({ entry: 'Hi', language: 'en' });
    expect(resolveEntry(from, 'vi', 'a.y')).toBeNull();
  });
});

describe('pluralCategory', () => {
  it('follows CLDR for whole numbers without Intl.PluralRules', () => {
    expect([0, 1, 2].map((n) => pluralCategory('en', n))).toEqual(['other', 'one', 'other']);
    expect(pluralCategory('en', 1.5)).toBe('other');
    expect(pluralCategory('vi', 1)).toBe('other');
  });
});

describe('pickLanguage', () => {
  it('takes a stored choice, then the device, then Vietnamese', () => {
    expect(pickLanguage(['en-GB'], 'vi')).toBe('vi');
    expect(pickLanguage(['fr-FR', 'en_US'])).toBe('en');
    expect(pickLanguage(['fr-FR'])).toBe('vi');
    expect(pickLanguage([], 'xx')).toBe('vi');
  });
});
