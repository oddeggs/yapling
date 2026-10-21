import type { Id } from '@yapling/contracts';
import { recapKey, SEASON_1_EPISODES, type Season1EpisodeId } from '@yapling/domain';

import { S1_PHRASES, SEASON_1 } from './season-1';
import type { Episode, Scene, Season, TargetPhrase } from './types';

export const SEASONS: readonly Season[] = [SEASON_1];

/** Every scene of every season: prologues first, then each episode's scenes. */
export const SCENES: readonly Scene[] = SEASONS.flatMap((season) => [
  ...season.prologue,
  ...season.episodes.flatMap((episode) => episode.scenes),
]);

export const EPISODES: readonly Episode[] = SEASONS.flatMap((season) => season.episodes);

export const PHRASES: readonly TargetPhrase[] = S1_PHRASES;

const scenes = new Map(SCENES.map((s) => [s.id, s]));
const phrases = new Map(PHRASES.map((p) => [p.id, p]));

export const findScene = (id: Id): Scene | undefined => scenes.get(id);

export const getScene = (id: Id): Scene => {
  const scene = scenes.get(id);
  if (!scene) throw new Error(`No scene ${id}`);
  return scene;
};

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
