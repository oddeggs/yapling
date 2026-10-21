/** Calendar days in the learner's timezone. */

/**
 * The timezone used before the learner or the phone has given one: Vietnam, where the app
 * launches. Never UTC, which puts a Vietnamese evening on the next day.
 */
export const LAUNCH_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** Whether the runtime knows the IANA name. */
export function knownTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}

const DAY_MS = 24 * 60 * 60_000;

/** `YYYY-MM-DD` for an instant in a timezone (the launch timezone when the name is unknown). */
export function localDate(now: number, timeZone: string): string {
  const format = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  return format(knownTimeZone(timeZone) ? timeZone : LAUNCH_TIMEZONE);
}

/** Days since install, the install day being day 1; never below 1 (a timezone moved west). */
export function dayIndex(installedOn: string, today: string): number {
  const days = Math.round((Date.parse(today) - Date.parse(installedOn)) / DAY_MS);
  return Math.max(1, days + 1);
}
