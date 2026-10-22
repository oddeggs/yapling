import type { Id, Stage } from '@yapling/contracts';
import { recapKey, SEASON_1_EPISODES, type Season1EpisodeId } from '@yapling/domain';

import { parsePipsMinuteSceneId, pipsMinuteScene } from './pips-minute';
import { S1_PHRASES, S1_VISITOR_VERSIONS, SEASON_1 } from './season-1';
import { seasonWeeks, type Episode, type Scene, type Season, type TargetPhrase } from './types';

export const SEASONS: readonly Season[] = [SEASON_1];

/**
 * Every stored scene of every season: prologues first, Settling in, then each week's scenes (the
 * episodes', then the festival's). Pip's minute is built from its id, not stored (`findScene`).
 */
export const SCENES: readonly Scene[] = SEASONS.flatMap((season) => [
  ...season.prologue,
  ...season.settling,
  ...seasonWeeks(season).flatMap((week) => week.scenes),
]);

export const EPISODES: readonly Episode[] = SEASONS.flatMap((season) => season.episodes);

export const PHRASES: readonly TargetPhrase[] = S1_PHRASES;

const scenes = new Map(SCENES.map((s) => [s.id, s]));
const phrases = new Map(PHRASES.map((p) => [p.id, p]));

/** A stored scene, or the Pip's minute its id names. */
export const findScene = (id: Id): Scene | undefined => {
  const stored = scenes.get(id);
  if (stored) return stored;
  const spec = parsePipsMinuteSceneId(id);
  return (spec && pipsMinuteScene(spec)) ?? undefined;
};

export const getScene = (id: Id): Scene => {
  const scene = findScene(id);
  if (!scene) throw new Error(`No scene ${id}`);
  return scene;
};

/** Scenes with a Visitor version of their own, by the scene they stand in for. */
export const VISITOR_VERSIONS: Readonly<Record<Id, Id>> = S1_VISITOR_VERSIONS;

/** The scene to play for a scheduled one at a stage: its Visitor version at Visitor, if any. */
export const sceneIdForStage = (id: Id, stage: Stage): Id =>
  stage === 'visitor' ? (VISITOR_VERSIONS[id] ?? id) : id;

export const findPhrase = (id: Id): TargetPhrase | undefined => phrases.get(id);

const isSeason1Episode = (id: Id): id is Season1EpisodeId =>
  (SEASON_1_EPISODES as readonly Id[]).includes(id);

/**
 * Pip's recap lines by the learning model's recap key (`s1-e1.recap`), for a learner coming back
 * after missing a week.
 */
export const RECAP_LINES: Readonly<Record<string, Id>> = Object.fromEntries(
  EPISODES.flatMap((episode) =>
    isSeason1Episode(episode.id) ? [[recapKey(episode.id), episode.recap]] : [],
  ),
);

/** The recap line for a recap key, or undefined for an unknown key. */
export const recapLine = (key: Id): Id | undefined => RECAP_LINES[key];
