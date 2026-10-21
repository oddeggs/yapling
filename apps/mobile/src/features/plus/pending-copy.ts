import {
  pluralCategory,
  translator,
  type Entry,
  type Language,
  type StringKey,
} from '@yapling/i18n';

/*
 * Chrome these features need that `@yapling/i18n` doesn't have yet. Each feature keeps its new
 * keys in a `copy.ts`, written exactly as the catalogue files are (English with its notes, then
 * Vietnamese), so they move into `packages/i18n/src/<feature>.{en,vi}.ts` unchanged; then the
 * feature's `copy.ts` and this file go, and screens call `useLocale().t` alone.
 */

export type PendingCatalogue = Readonly<Record<string, Entry>>;
type Params = Readonly<Record<string, string | number>>;

function format(language: Language, entry: Entry, params: Params = {}): string {
  const count = params['count'];
  const text =
    typeof entry === 'string'
      ? entry
      : (entry[typeof count === 'number' ? pluralCategory(language, count) : 'other'] ??
        entry.other);
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

/** A translator over the catalogue's keys and a feature's pending ones. */
export type FeatureCopy<Pending extends string> = (
  key: StringKey | Pending,
  params?: Params,
) => string;

/** The feature's translator for a language: pending keys first, then the catalogue. */
export function featureCopy<Pending extends string>(
  language: Language,
  pending: {
    readonly en: Readonly<Record<Pending, Entry>>;
    readonly vi: Readonly<Record<Pending, Entry>>;
  },
): FeatureCopy<Pending> {
  const t = translator(language) as (key: string, params?: Params) => string;
  const own: Readonly<Record<string, Entry>> = pending[language];
  return (key: string, params?: Params) => {
    const entry = own[key];
    return entry === undefined ? t(key, params) : format(language, entry, params);
  };
}
