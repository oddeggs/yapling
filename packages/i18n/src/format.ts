import type { Entry, Language } from './catalogue-types';
import { pluralCategory } from './plural';

export type Params = Readonly<Record<string, string | number>>;

/**
 * The text of an entry: a plural picks its form from `params.count` by the language's rule, then
 * each `{name}` placeholder is filled from `params`. A placeholder with no value stays as written,
 * so a missing parameter shows up on screen instead of reading as an empty gap.
 */
export function formatEntry(language: Language, entry: Entry, params?: Params): string {
  const values: Params = params ?? {};
  let text: string;
  if (typeof entry === 'string') {
    text = entry;
  } else {
    const count = values['count'];
    const category = typeof count === 'number' ? pluralCategory(language, count) : 'other';
    text = entry[category] ?? entry.other;
  }
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined ? placeholder : String(value);
  });
}
