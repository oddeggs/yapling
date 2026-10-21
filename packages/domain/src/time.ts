import type { EpochMs, LocalDate, LocalTime, TimeZone } from '@yapling/contracts';

/*
 * Calendar helpers. Every rule in the learning model that says "day" means a calendar day in the
 * learner's own timezone (`LocalDate`, `YYYY-MM-DD`). Instants are epoch milliseconds and always
 * come in as parameters; nothing here reads the clock.
 */

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timezone: TimeZone): Intl.DateTimeFormat => {
  let formatter = formatters.get(timezone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timezone, formatter);
  }
  return formatter;
};

interface WallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

const wallClock = (at: EpochMs, timezone: TimeZone): WallClock => {
  const parts = formatterFor(timezone).formatToParts(new Date(at));
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? Number.NaN);
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    // Some engines print midnight as 24 even with h23.
    hour: part('hour') % 24,
    minute: part('minute'),
    second: part('second'),
  };
};

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** How far the timezone's wall clock is ahead of UTC at an instant. */
export const utcOffsetMs = (at: EpochMs, timezone: TimeZone): number => {
  const w = wallClock(at, timezone);
  const wholeSecond = Math.floor(at / 1_000) * 1_000;
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - wholeSecond;
};

/** The learner's calendar day at an instant. */
export const localDateOf = (at: EpochMs, timezone: TimeZone): LocalDate => {
  const w = wallClock(at, timezone);
  return `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}`;
};

/** The learner's wall-clock time (`HH:MM`) at an instant. */
export const localTimeOf = (at: EpochMs, timezone: TimeZone): LocalTime => {
  const w = wallClock(at, timezone);
  return `${pad(w.hour)}:${pad(w.minute)}`;
};

const parseDate = (date: LocalDate): [number, number, number] => {
  const [y, m, d] = date.split('-').map(Number);
  return [y ?? Number.NaN, m ?? Number.NaN, d ?? Number.NaN];
};

/** Minutes after midnight for a `HH:MM` time. */
export const minutesOfDay = (time: LocalTime): number => {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** A `HH:MM` time from minutes after midnight (0–1439). */
export const timeOfMinutes = (minutes: number): LocalTime =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Whole days since 1970-01-01 for a calendar day (no timezone involved). */
const epochDay = (date: LocalDate): number => {
  const [y, m, d] = parseDate(date);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
};

const dateOfEpochDay = (day: number): LocalDate => {
  const t = new Date(day * DAY_MS);
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

/** The calendar day `days` after (or before, if negative) a day. */
export const addDays = (date: LocalDate, days: number): LocalDate =>
  dateOfEpochDay(epochDay(date) + days);

/** Calendar days from `from` to `to`: 0 on the same day, negative if `to` is earlier. */
export const daysBetween = (from: LocalDate, to: LocalDate): number =>
  epochDay(to) - epochDay(from);

/** The first day of the month a day is in. */
export const startOfMonth = (date: LocalDate): LocalDate => `${date.slice(0, 7)}-01`;

/** The first day of the next month. */
export const startOfNextMonth = (date: LocalDate): LocalDate => {
  const [y, m] = parseDate(date);
  return m === 12 ? `${pad(y + 1, 4)}-01-01` : `${pad(y, 4)}-${pad(m + 1)}-01`;
};

/**
 * The instant a wall-clock time happens on a day in a timezone. A time that happens twice (the
 * hour a clock falls back) gives the first; a time that never happens (the hour a clock springs
 * forward) moves forward by the gap, so the result is always the next real instant at or after it.
 */
export const instantOf = (date: LocalDate, time: LocalTime, timezone: TimeZone): EpochMs => {
  const [y, m, d] = parseDate(date);
  const minutes = minutesOfDay(time);
  const asUtc = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const offsets = [
    ...new Set([utcOffsetMs(asUtc - DAY_MS, timezone), utcOffsetMs(asUtc + DAY_MS, timezone)]),
  ];
  const candidates = offsets.map((offset) => asUtc - offset);
  const real = candidates.filter(
    (t) => localDateOf(t, timezone) === date && localTimeOf(t, timezone) === time,
  );
  return real.length > 0 ? Math.min(...real) : Math.max(...candidates);
};

/** The instant the learner's day starts (local midnight). */
export const startOfLocalDay = (date: LocalDate, timezone: TimeZone): EpochMs =>
  instantOf(date, '00:00', timezone);
