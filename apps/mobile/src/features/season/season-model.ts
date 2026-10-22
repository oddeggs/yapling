import type { CharacterId, Id, LocalDate, WeekRing } from '@yapling/contracts';
import { addDays, slotOpensOnDay } from '@yapling/domain';
import type { Place, Season } from '@yapling/story';

/*
 * The season map: the season as a path through town, one pin per episode where it happens. A
 * finished episode's pin is green with a small keepsake, the next one glows, the rest wait calmly.
 * The card at the bottom is the next episode, with the day it opens when that's still ahead.
 * Built from the weekly rings in the learner's progress; nothing reads the clock here.
 */

export type PinState = 'done' | 'current' | 'upcoming';

/** Where each episode's pin stands on the town, in the prototype's 390 × 844 frame (its centre). */
export const PIN_SPOTS: readonly (readonly [number, number])[] = [
  [56, 462],
  [158, 384],
  [128, 520],
  [300, 200],
  [326, 346],
  [180, 590],
];

/** Where the path ends: the next season's boat in the harbour. */
export const BOAT_SPOT: readonly [number, number] = [292, 702];

export interface SeasonPin {
  readonly episode: number;
  readonly id: Id;
  readonly title: string;
  readonly place: Place;
  readonly state: PinState;
  readonly x: number;
  readonly y: number;
}

export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface NextEpisode {
  readonly episode: number;
  readonly id: Id;
  readonly title: string;
  readonly place: Place;
  /** Who the episode is with (its card's face). */
  readonly face: CharacterId;
  /** It can be played now. */
  readonly open: boolean;
  /** The day it opens, while that is still ahead (null when open or the install day is unknown). */
  readonly opensOn: Weekday | null;
}

export interface SeasonMapModel {
  readonly season: number;
  readonly title: string;
  readonly episodes: number;
  /** The episode the season is on (the next one to play); the last one when all are done. */
  readonly onEpisode: number;
  readonly pins: readonly SeasonPin[];
  /** Null once every episode is done. */
  readonly next: NextEpisode | null;
  readonly path: SeasonPath;
}

export interface SeasonInput {
  readonly season: Season;
  readonly weeks: readonly WeekRing[];
  /** Days since install (day 1 is the install day). */
  readonly day: number;
  readonly installedOn: LocalDate | null;
}

/** Episode `n` plays in week `n`: done once that week's episode call is. */
export const episodeDone = (weeks: readonly WeekRing[], n: number): boolean =>
  weeks[n - 1]?.slots.find((s) => s.kind === 'episode')?.status === 'done';

const WEEKDAYS: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** The weekday of a local date. */
export const weekdayOf = (date: LocalDate): Weekday =>
  WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? 'mon';

export function seasonMapModel({ season, weeks, day, installedOn }: SeasonInput): SeasonMapModel {
  const count = season.episodes.length;
  const firstOpen = season.episodes.findIndex((_, i) => !episodeDone(weeks, i + 1));
  const current = firstOpen === -1 ? null : firstOpen + 1;
  const pins = season.episodes.map((e, i): SeasonPin => {
    const n = i + 1;
    const [x, y] = PIN_SPOTS[i] ?? [0, 0];
    const state: PinState = episodeDone(weeks, n) ? 'done' : n === current ? 'current' : 'upcoming';
    return { episode: n, id: e.id, title: e.title, place: e.place, state, x, y };
  });
  let next: NextEpisode | null = null;
  const episode = current === null ? undefined : season.episodes[current - 1];
  if (current !== null && episode) {
    const opensDay = slotOpensOnDay(current, 'episode');
    const open = day >= opensDay;
    next = {
      episode: current,
      id: episode.id,
      title: episode.title,
      place: episode.place,
      face: episode.cast[0] ?? 'pip',
      open,
      opensOn: open || installedOn === null ? null : weekdayOf(addDays(installedOn, opensDay - 1)),
    };
  }
  return {
    season: season.number,
    title: season.title,
    episodes: count,
    onEpisode: current ?? count,
    pins,
    next,
    path: seasonPath(current ?? count + 1),
  };
}

/** The route drawn through the pins: walked (to the current pin), still ahead, and out to sea. */
export interface SeasonPath {
  readonly done: string;
  readonly rest: string;
  readonly tail: string;
}

const POINTS = [...PIN_SPOTS, BOAT_SPOT];

/** A gentle arc from p to q, bowing left or right (`k`), as the prototype draws the route. */
function arc(p: readonly [number, number], q: readonly [number, number], k: number): string {
  const mx = (p[0] + q[0]) / 2;
  const my = (p[1] + q[1]) / 2;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const l = Math.hypot(dx, dy);
  const o = l * 0.22 * k;
  return `Q${Math.round(mx - (dy / l) * o)} ${Math.round(my + (dx / l) * o)} ${q[0]} ${q[1]}`;
}

/** The SVG path through points `a`…`b`; empty when there is no stretch. */
function stretch(a: number, b: number): string {
  if (b <= a) return '';
  const start = POINTS[a] ?? [0, 0];
  const arcs = Array.from({ length: b - a }, (_, j) => {
    const p = POINTS[a + j] ?? [0, 0];
    const q = POINTS[a + j + 1] ?? [0, 0];
    return arc(p, q, (a + j) % 2 ? 1 : -1);
  });
  return `M${start[0]} ${start[1]} ${arcs.join(' ')}`;
}

/** The route with episode `current` next (past the last episode once the season is done). */
export function seasonPath(current: number): SeasonPath {
  const last = PIN_SPOTS.length - 1;
  const at = Math.min(Math.max(current - 1, 0), last);
  return { done: stretch(0, at), rest: stretch(at, last), tail: stretch(last, last + 1) };
}
