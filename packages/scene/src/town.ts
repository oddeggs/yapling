import { openVariants, PLACE_IDS, PLACES, type PlaceId } from './places';

/*
 * The town clock: Natterwick runs on the learner's own local time. Everything here is a pure
 * function of a local date, so the phone and the server agree on what is happening at any minute.
 */

export const WEATHERS = ['clear', 'rain', 'fog', 'snow', 'wind'] as const;
export type Weather = (typeof WEATHERS)[number];

/** A local wall-clock moment: what the learner's own clock says. */
export interface LocalTime {
  readonly year: number;
  /** 1–12 */
  readonly month: number;
  readonly day: number;
  /** Hours since local midnight, with minutes as a fraction. */
  readonly hour: number;
}

/** The learner's local time in an IANA time zone (falls back to UTC for an unknown zone). */
export function localTime(at: Date, timeZone: string): LocalTime {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(at);
  } catch {
    return localTime(at, 'UTC');
  }
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') + get('minute') / 60,
  };
}

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h / 4294967296;
};

/**
 * The town's weather, the same for everyone on the same local half-day: mostly clear, some rain,
 * fog on early mornings, wind, and snow only in the winter months.
 */
export function weatherAt(t: LocalTime): Weather {
  const half = t.hour < 12 ? 'am' : 'pm';
  const r = hash(`${t.year}-${t.month}-${t.day}-${half}`);
  const winter = t.month === 12 || t.month <= 2;
  if (winter && r < 0.16) return 'snow';
  if (r < 0.3) return 'rain';
  if (r < 0.4 && t.hour < 11) return 'fog';
  if (r < 0.5) return 'wind';
  return 'clear';
}

/** Where someone can be talked to right now, and in which of the place's variants. */
export interface OpenPlace {
  readonly place: PlaceId;
  readonly variants: readonly number[];
}

export const openPlaces = (hour: number): OpenPlace[] =>
  PLACE_IDS.map((place) => ({ place, variants: openVariants(place, hour) })).filter(
    (p) => p.variants.length > 0,
  );

/** One line for the director: who is where at this hour. */
export function townNow(t: LocalTime): string {
  const open = openPlaces(t.hour)
    .map((p) => {
      const pl = PLACES[p.place];
      return `${pl.name} (${pl.resident}; variants ${p.variants.join(', ')})`;
    })
    .join('; ');
  return open;
}

/** "9:24 PM" for a local hour. */
export function clockLabel(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
