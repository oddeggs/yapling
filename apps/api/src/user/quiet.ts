import type { QuietHours } from '@yapling/contracts';

/** Quiet hours in the learner's timezone: no server push lands inside them. */

const MINUTE_MS = 60_000;
const DAY_MINUTES = 24 * 60;

/** The minute of the day in a timezone (UTC when the name is unknown). */
export function localMinute(now: number, timeZone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return Math.floor((now % (DAY_MINUTES * MINUTE_MS)) / MINUTE_MS);
  }
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function minutesOf(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/** Whether an instant falls in quiet hours (they may run past midnight). */
export function isQuiet(now: number, quiet: QuietHours | null, timeZone: string): boolean {
  if (quiet === null) return false;
  const m = localMinute(now, timeZone);
  const from = minutesOf(quiet.start);
  const to = minutesOf(quiet.end);
  return from > to ? m >= from || m < to : m >= from && m < to;
}

/** When quiet hours end, from an instant inside them: the next local `end`. */
export function quietEnds(now: number, quiet: QuietHours, timeZone: string): number {
  const m = localMinute(now, timeZone);
  const minutesLeft = (minutesOf(quiet.end) - m + DAY_MINUTES) % DAY_MINUTES || DAY_MINUTES;
  return now - (now % MINUTE_MS) + minutesLeft * MINUTE_MS;
}
