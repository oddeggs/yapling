import type { CharacterId, Id, LocalDate, Stage, WeekRing } from '@yapling/contracts';
import { seasonEpisodes, type SeasonEpisode, type SeasonWeeks } from '@yapling/domain';
import type { Place, Season } from '@yapling/story';

import { SEASON_WEEKS } from '../../data/season';

/*
 * The season map: the season as a path through town, one pin per episode where it happens. A
 * finished episode's pin is green with a small keepsake, the next one glows, the rest wait calmly.
 * The card at the bottom is the next episode, with the day it opens when that's still ahead.
 * Days count from the story's start, as the week view counts them, so the map and the week agree
 * on which episode is next and when it opens. A finished episode can be played again, at the
 * learner's stage today. Built from the weekly rings in the learner's progress; nothing reads the
 * clock here.
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

/** What tapping a pin does: play a finished episode again, play the next one, or nothing yet. */
export type PinAction = 'replay' | 'play' | null;

export interface SeasonPin {
  readonly episode: number;
  readonly id: Id;
  /** The episode call's scene. */
  readonly sceneId: Id;
  readonly action: PinAction;
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
  /** The episode call's scene. */
  readonly sceneId: Id;
  /** It can be played now. */
  readonly open: boolean;
  /** The weekday it opens, while that is still ahead (null once open). */
  readonly opensOn: Weekday | null;
  /** The date it opens, counted from the story's start (the week view's date for its slot). */
  readonly opensOnDate: LocalDate;
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
  /** The festival week after the last episode, once every episode is done. */
  readonly festival: { readonly title: string } | null;
  readonly path: SeasonPath;
}

export interface SeasonInput {
  readonly season: Season;
  readonly weeks: readonly WeekRing[];
  /** Today's story day (day 1 is the story's first day, as the week counts it). */
  readonly dayIndex: number;
  /** The story's first day. */
  readonly startedOn: LocalDate;
  /** The season's weeks the rings are read against (the app's season by default). */
  readonly seasonWeeks?: SeasonWeeks;
}

/** Episode `n` plays in week `n`: done once that week's episode call is. */
export const episodeDone = (weeks: readonly WeekRing[], n: number): boolean =>
  weeks[n - 1]?.slots.find((s) => s.kind === 'episode')?.status === 'done';

/** What a pin offers: a finished episode plays again; the next one plays once its day has come. */
export const pinAction = (episode: Pick<SeasonEpisode, 'state' | 'open'>): PinAction =>
  episode.state === 'done' ? 'replay' : episode.state === 'current' && episode.open ? 'play' : null;

/** A finished episode to play again: the same scene, at the learner's stage today. */
export interface Replay {
  readonly episode: number;
  readonly title: string;
  readonly sceneId: Id;
  readonly stage: Stage;
}

/** The replay a pin offers, at today's stage; null for an episode not finished yet. */
export function replayOf(pin: SeasonPin, stage: Stage): Replay | null {
  if (pin.action !== 'replay') return null;
  return { episode: pin.episode, title: pin.title, sceneId: pin.sceneId, stage };
}

const WEEKDAYS: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** The weekday of a local date. */
export const weekdayOf = (date: LocalDate): Weekday =>
  WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? 'mon';

export function seasonMapModel({
  season,
  weeks,
  dayIndex,
  startedOn,
  seasonWeeks = SEASON_WEEKS,
}: SeasonInput): SeasonMapModel {
  const count = season.episodes.length;
  const dated = seasonEpisodes({ season: seasonWeeks, weeks, dayIndex, startedOn });
  const pins = season.episodes.map((e, i): SeasonPin => {
    const n = i + 1;
    const [x, y] = PIN_SPOTS[i] ?? [0, 0];
    const d = dated.find((ep) => ep.week === n);
    const state: PinState = d?.state ?? 'upcoming';
    return {
      episode: n,
      id: e.id,
      sceneId: d?.sceneId ?? e.id,
      title: e.title,
      place: e.place,
      state,
      action: d ? pinAction(d) : null,
      x,
      y,
    };
  });
  const currentIndex = pins.findIndex((p) => p.state === 'current');
  const current = currentIndex === -1 ? null : currentIndex + 1;
  let next: NextEpisode | null = null;
  const episode = current === null ? undefined : season.episodes[current - 1];
  const d = dated.find((ep) => ep.week === current);
  if (current !== null && episode && d) {
    next = {
      episode: current,
      id: episode.id,
      sceneId: d.sceneId,
      title: episode.title,
      place: episode.place,
      face: episode.cast[0] ?? 'pip',
      open: d.open,
      opensOn: d.open ? null : weekdayOf(d.opensOn),
      opensOnDate: d.opensOn,
    };
  }
  const allDone = pins.every((p) => p.state === 'done');
  return {
    season: season.number,
    title: season.title,
    episodes: count,
    onEpisode: current ?? count,
    pins,
    next,
    festival: allDone && season.festival ? { title: season.festival.title } : null,
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
