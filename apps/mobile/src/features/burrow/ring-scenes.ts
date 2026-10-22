import type { Character } from '@yapling/art';
import type { CharacterId, Id, LocalDate, RingSlotKind, WeekRing } from '@yapling/contracts';
import { storyWeek, type StoryWeek } from '@yapling/domain';
import { findScene, SEASON_1, seasonWeeks, type Episode, type Scene } from '@yapling/story';

/*
 * The scenes behind the ring after week 1. Each week of the season names its three calls; a week
 * that names none (the festival week, and every week after the season) is a ring of replays: an
 * episode played again at today's stage, a real-week call (always new: it is about this week) and
 * a practice call, taken from the season's weeks in turn so no two weeks running offer the same.
 */

/** The season's weeks, week 1 first: the six episodes, then the festival. */
export const SEASON_WEEKS = seasonWeeks(SEASON_1);

/** The season's episodes in order. */
const EPISODES: readonly Episode[] = SEASON_1.episodes;

/** The season's scenes of a ring kind, week 1 first. */
const scenesOfKind = (kind: RingSlotKind): readonly Scene[] =>
  EPISODES.flatMap((e) => e.scenes.filter((s) => s.kind === kind));

const REPLAYS: Readonly<Record<RingSlotKind, readonly Scene[]>> = {
  episode: scenesOfKind('episode'),
  real_week: scenesOfKind('real_week'),
  practice: scenesOfKind('practice'),
};

/** The first week whose ring is made of replays (the first week with no episode of its own). */
export const FIRST_REPLAY_WEEK = EPISODES.length + 1;

/**
 * The scene a ring slot plays: its own scene when the week names one, else a replay. Replays go
 * round the season's scenes of the slot's kind, Episode 1's first in the first replay week.
 */
export function ringSceneFor(week: number, kind: RingSlotKind, sceneId: Id | null): Id {
  if (sceneId !== null) return sceneId;
  const replays = REPLAYS[kind];
  const index = (((week - FIRST_REPLAY_WEEK) % replays.length) + replays.length) % replays.length;
  const scene = replays[index] ?? replays[0];
  if (scene === undefined) throw new Error(`the season has no ${kind} scene`);
  return scene.id;
}

/** Whether a slot plays a replay (its week names no scene of its own for it). */
export const isReplay = (sceneId: Id | null): boolean => sceneId === null;

/** The episode a scene belongs to, if any. */
export const episodeOfScene = (sceneId: Id): Episode | undefined =>
  EPISODES.find((e) => e.scenes.some((s) => s.id === sceneId));

/** A face the art can draw: a voice with no face (Mags, the office) is drawn as Pip. */
export const drawable = (id: CharacterId | undefined): Character =>
  id === undefined || id === 'mags' || id === 'office' ? 'pip' : id;

/** Who a scene is with, besides Pip (Pip when it is only Pip). */
export function guestOf(sceneId: Id): Character {
  const cast = findScene(sceneId)?.cast ?? [];
  return drawable(cast.find((c) => c !== 'pip' && c !== 'mags' && c !== 'office') ?? 'pip');
}

/** Who a scene is from (a voicemail's or a postcard's sender): its first cast member. */
export const senderOf = (sceneId: Id): CharacterId => findScene(sceneId)?.cast[0] ?? 'pip';

/** The learner's story week, on the season's weeks. */
export const storyWeekFor = (
  weeks: readonly WeekRing[],
  dayIndex: number,
  startedOn: LocalDate,
): StoryWeek => storyWeek({ season: SEASON_WEEKS, weeks, dayIndex, startedOn });
