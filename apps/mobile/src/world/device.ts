import {
  FIRST_LANGUAGES,
  TimeZone,
  type FirstLanguage,
  type MomentRequest,
} from '@yapling/contracts';
import { pickLanguage, type Language } from '@yapling/i18n';
import { getLocales } from 'expo-localization';

/*
 * What the phone says about the learner before they say anything: their language, their region
 * and their clock. Natterwick runs on that clock, and the director plans for that part of the world.
 */

const locales = () => {
  try {
    return getLocales();
  } catch {
    return [];
  }
};

export function deviceTimeZone(): TimeZone {
  const parsed = TimeZone.safeParse(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return parsed.success ? parsed.data : 'Asia/Ho_Chi_Minh';
}

/** The learner's first language from the phone's languages: the first one we know, else other. */
export function deviceFirstLanguage(): FirstLanguage {
  for (const l of locales()) {
    const code = (l.languageCode ?? '').toLowerCase();
    if (code === 'en') continue;
    if ((FIRST_LANGUAGES as readonly string[]).includes(code)) return code as FirstLanguage;
  }
  return 'other';
}

export function deviceCountry(): string | null {
  const region = locales()[0]?.regionCode ?? null;
  return region && /^[A-Z]{2}$/.test(region) ? region : null;
}

/** The chrome's language: Vietnamese on a Vietnamese phone, English otherwise. */
export function chromeLanguage(): Language {
  return pickLanguage(locales().map((l) => l.languageTag));
}

export function momentRequest(): MomentRequest {
  return {
    firstLanguage: deviceFirstLanguage(),
    country: deviceCountry(),
    timezone: deviceTimeZone(),
  };
}
