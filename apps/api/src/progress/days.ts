/** Calendar days in the learner's timezone. */

const DAY_MS = 24 * 60 * 60_000;

/** `YYYY-MM-DD` for an instant in a timezone (UTC when the name is unknown). */
export function localDate(now: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return new Date(now).toISOString().slice(0, 10);
  }
}

/** Days since install, the install day being day 1; never below 1 (a timezone moved west). */
export function dayIndex(installedOn: string, today: string): number {
  const days = Math.round((Date.parse(today) - Date.parse(installedOn)) / DAY_MS);
  return Math.max(1, days + 1);
}
