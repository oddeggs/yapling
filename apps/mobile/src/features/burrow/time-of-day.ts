import type { TimeOfDay } from '@yapling/art';

/**
 * The burrow's light from the learner's clock: morning from 5:00, the plain day from 11:00, dusk
 * from 17:00 and night from 20:00 until 5:00. (`afternoon` is the scene's plain daylight.)
 */
export function timeOfDayAt(hour: number): Exclude<TimeOfDay, 'rain'> {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

/** The local hour of a `HH:MM` time. */
export const hourOf = (time: string): number => Number(time.slice(0, 2)) % 24;
