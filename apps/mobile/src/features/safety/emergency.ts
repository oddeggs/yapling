import type { StringKey } from '@yapling/i18n';

/*
 * Real help, by the learner's country. Each market gets its own verified emergency number before
 * it launches; a country not listed here gets no number, and the sheet asks the learner to call
 * their local emergency number instead. Never guess a number.
 */

export interface EmergencyContact {
  /** ISO 3166-1 alpha-2. */
  readonly country: string;
  /** The country's name in the chrome's language. */
  readonly countryKey: StringKey;
  /** The number to call for an ambulance. */
  readonly number: string;
}

const CONTACTS: Readonly<Record<string, EmergencyContact>> = {
  // Vietnam: 115 is the ambulance (113 police, 114 fire).
  VN: { country: 'VN', countryKey: 'safety.country.vn', number: '115' },
};

/** Where the learner is looked up by default: Yapling launches in Vietnam. */
export const DEFAULT_COUNTRY = 'VN';

/** The verified contact for a country, or null where none is listed yet. */
export function emergencyFor(country: string | null): EmergencyContact | null {
  if (country === null) return null;
  const code = country.toUpperCase();
  return Object.hasOwn(CONTACTS, code) ? (CONTACTS[code] ?? null) : null;
}

/** Timezones that place a phone in a country, for the countries listed above. */
const COUNTRY_OF_ZONE: Readonly<Record<string, string>> = {
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Saigon': 'VN',
};

/**
 * The country the phone is in, as best the phone can say: its timezone where that names a listed
 * country (where someone is matters more than their language setting), then the region of its
 * locale (`vi-VN`), then the launch country.
 */
export function countryOf(device: {
  timeZone?: string | undefined;
  locale?: string | undefined;
}): string {
  const byZone = device.timeZone === undefined ? undefined : COUNTRY_OF_ZONE[device.timeZone];
  if (byZone !== undefined) return byZone;
  const region = device.locale?.match(/[-_]([A-Za-z]{2})(?:$|[-_])/)?.[1];
  return region === undefined ? DEFAULT_COUNTRY : region.toUpperCase();
}

/** The phone's own timezone and locale. */
export function deviceCountry(): string {
  try {
    const { timeZone, locale } = Intl.DateTimeFormat().resolvedOptions();
    return countryOf({ timeZone, locale });
  } catch {
    return DEFAULT_COUNTRY;
  }
}

/** Where "Find a support line" goes: a verified, free directory of helplines by country. */
export const SUPPORT_LINES_URL = 'https://findahelpline.com';
