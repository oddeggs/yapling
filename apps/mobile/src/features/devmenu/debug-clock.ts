import type { EpochMs, LocalDate, TimeZone } from '@yapling/contracts';
import { dateOfDay, instantOf, localTimeOf, MINUTE_MS } from '@yapling/domain';
import { useSyncExternalStore } from 'react';

import { devToolsEnabled } from './dev-tools';
import { CLOCK_KEY, devStorage } from './dev-storage';

/*
 * The app's clock. Everything that asks "what day is it" (the day clock, the knocks, the welcome
 * back) reads `now()`. In the store app it is the phone's clock; in the test builds the test menu
 * can move it to any day of the first week, so a learner session can walk the week in an hour.
 */

export interface DebugClockState {
  /** App time minus phone time. */
  readonly offsetMs: number;
  /** Treats this open as a return after three days away (the welcome back, day 8's knock). */
  readonly cameBackAfterAway: boolean;
}

export const REAL_CLOCK: DebugClockState = { offsetMs: 0, cameBackAfterAway: false };

const parse = (raw: string | null): DebugClockState => {
  if (raw === null) return REAL_CLOCK;
  try {
    const value = JSON.parse(raw) as Partial<DebugClockState>;
    return {
      offsetMs: typeof value.offsetMs === 'number' ? value.offsetMs : 0,
      cameBackAfterAway: value.cameBackAfterAway === true,
    };
  } catch {
    return REAL_CLOCK;
  }
};

let state: DebugClockState | null = null;
const listeners = new Set<() => void>();

const current = (): DebugClockState => {
  if (!devToolsEnabled) return REAL_CLOCK;
  state ??= parse(devStorage.get(CLOCK_KEY));
  return state;
};

const write = (next: DebugClockState): void => {
  if (!devToolsEnabled) return;
  state = next;
  devStorage.set(CLOCK_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
};

/** The debug clock's state; the real clock in the store app. */
export const debugClock = (): DebugClockState => current();

/** The app's time: the phone's, moved by the test menu in test builds. */
export const now = (): EpochMs => Date.now() + current().offsetMs;

/**
 * The offset that puts the app on a day of the first week at the phone's current wall-clock time,
 * so day 3 at 07:55 is a few minutes before day 3's knock would ring.
 */
export const offsetForDay = (
  day: number,
  installedOn: LocalDate,
  timezone: TimeZone,
  realNow: EpochMs,
): number => {
  const date = dateOfDay(installedOn, day);
  const target = instantOf(date, localTimeOf(realNow, timezone), timezone) + (realNow % MINUTE_MS);
  return target - realNow;
};

/** Moves the app to a day of the first week. */
export const jumpToDay = (day: number, installedOn: LocalDate, timezone: TimeZone): void =>
  write({ ...current(), offsetMs: offsetForDay(day, installedOn, timezone, Date.now()) });

/** Moves the app to an instant (a minute before a knock, to watch it ring). */
export const jumpToInstant = (at: EpochMs): void =>
  write({ ...current(), offsetMs: at - Date.now() });

/** Back to the phone's time, keeping "came back after 3 days". */
export const backToRealTime = (): void => write({ ...current(), offsetMs: 0 });

export const setCameBackAfterAway = (on: boolean): void =>
  write({ ...current(), cameBackAfterAway: on });

/** Back to the phone's clock. */
export const resetDebugClock = (): void => write(REAL_CLOCK);

/** Forgets the stored state (after the test menu clears its keys). */
export const reloadDebugClock = (): void => {
  state = null;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The debug clock's state, re-rendering when the test menu moves it. Read the time with `now()`. */
export function useDebugClock(): DebugClockState {
  return useSyncExternalStore(subscribe, current, current);
}
