import { languages, type Language } from './catalogue-types';

/** The chrome's language when nothing says otherwise: Vietnamese, the app's first market. */
export const defaultLanguage: Language = 'vi';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (languages as readonly string[]).includes(value);
}

/**
 * The catalogue for one locale tag, or null when we ship none for it. Case and `_` or `-` don't
 * matter (`vi-VN`, `en_GB`, `EN`).
 */
export function languageOfLocale(locale: string): Language | null {
  const base = locale.toLowerCase().split(/[-_]/)[0] ?? '';
  return isLanguage(base) ? base : null;
}

/**
 * The chrome's language: a stored choice (the first-language picker) when it names a language we
 * ship, otherwise the first device locale we have a catalogue for, otherwise Vietnamese.
 */
export function pickLanguage(
  deviceLocales: readonly string[],
  storedChoice?: string | null,
): Language {
  if (isLanguage(storedChoice)) return storedChoice;
  for (const locale of deviceLocales) {
    const language = languageOfLocale(locale);
    if (language !== null) return language;
  }
  return defaultLanguage;
}
