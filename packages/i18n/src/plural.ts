import type { Language, PluralCategory } from './catalogue-types';

/**
 * Each shipped language's plural rule for whole numbers, from CLDR (the rules `Intl.PluralRules`
 * uses), and the categories a translation must spell out.
 *
 * Copy only ever counts whole things, so the rules cover whole numbers; a fraction reads as
 * `other`. A table runs everywhere the same way: Hermes (the app's engine) ships no
 * `Intl.PluralRules`, and a table keeps the app, the Worker and the tests in step.
 */
interface PluralRule {
  /** The categories every plural entry in this language spells out (always with `other`). */
  readonly required: readonly PluralCategory[];
  readonly select: (n: number) => PluralCategory;
}

export const pluralRules: { readonly [L in Language]: PluralRule } = {
  en: { required: ['one', 'other'], select: (n) => (n === 1 ? 'one' : 'other') },
  vi: { required: ['other'], select: () => 'other' },
};

/** The plural category of a count in a language; a fraction, a negative or NaN reads as `other`. */
export function pluralCategory(language: Language, count: number): PluralCategory {
  if (!Number.isInteger(count) || count < 0) return 'other';
  return pluralRules[language].select(count);
}

/** The categories a plural entry in this language must have, and the only ones it may have. */
export function requiredCategories(language: Language): readonly PluralCategory[] {
  return pluralRules[language].required;
}
