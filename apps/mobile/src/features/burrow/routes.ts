import type { Href } from 'expo-router';

/**
 * Where the burrow and the week send the learner. Several of these screens belong to other
 * features and may not exist yet; the paths are the agreed names, kept in one place so the
 * integration only has to check this file.
 */
const href = (path: string): Href => path;

export const BURROW_ROUTES = {
  /** The burrow itself. */
  home: href('/(home)'),
  /** The week view. */
  week: href('/(home)/week'),
  /** The Me sheet, from the roommate's face at the top. */
  me: href('/(sheet)/me'),
  /** The Plus offer at the end of the free first week. */
  plus: href('/(sheet)/plus'),
  /** The season map, after the voicemail. */
  seasonMap: href('/season'),
} as const;

/** The week's wrap on the last day of week `week` (the payoff's `PAYOFF_ROUTES.wrap`). */
export const wrapRoute = (week: number): Href => href(`/(home)/wrap?week=${week}`);

/** A call: the episode, the real-week call or the practice call, by scene id. */
export const callRoute = (sceneId: string): Href => href(`/(call)/${sceneId}`);

/** A scene with nothing to fail (Pip's story, a postcard, a voicemail), by scene id. */
export const listenRoute = (sceneId: string): Href => href(`/listen/${sceneId}`);
