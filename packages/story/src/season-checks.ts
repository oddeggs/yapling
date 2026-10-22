import { RING_SLOT_KINDS, type Id } from '@yapling/contracts';

import { allPipsMinuteScenes } from './pips-minute';
import {
  S1_PIPS_MINUTE,
  S1_PIPS_MINUTE_CLOSES,
  S1_PIPS_MINUTE_OPENS,
} from './season-1/pips-minute';
import { seasonWeeks, type Scene, type Season, type StoryWeek } from './types';
import { visitorLineProblems } from './validate';

/*
 * Checks across a season's weeks, beside `validateScene`'s checks of one scene: every episode's
 * week names its three ring scenes, every slot names a scene of its week on a day 1–7, listening
 * scenes hold written lines only, and every line Pip's minute can play keeps the Visitor's 8 words.
 */

const LISTENING_KINDS: ReadonlySet<Scene['kind']> = new Set(['story', 'postcard', 'voicemail']);

/** Problems with one week: its slots, and (for an episode's week) its three ring scenes. */
export const weekProblems = (week: StoryWeek, { ring }: { readonly ring: boolean }): string[] => {
  const problems: string[] = [];
  const scenes = new Map(week.scenes.map((s) => [s.id, s]));
  for (const slot of week.week) {
    if (!scenes.has(slot.scene))
      problems.push(`${week.id}: slot names ${slot.scene}, not in the week`);
    if (!Number.isInteger(slot.day) || slot.day < 1 || slot.day > 7) {
      problems.push(`${week.id}: ${slot.scene} on day ${slot.day}`);
    }
  }
  if (ring) {
    for (const kind of RING_SLOT_KINDS) {
      const named = week.week.filter((slot) => scenes.get(slot.scene)?.kind === kind);
      if (named.length !== 1) {
        problems.push(`${week.id}: ${named.length} ${kind} scenes in its week (one wanted)`);
      }
    }
  }
  return problems;
};

/**
 * Problems with a listening scene (a story, a postcard, a voicemail): it plays written lines and
 * shows things, nothing generated. A voicemail may wait for a reply (week 1's fix for Pip).
 */
export const listeningSceneProblems = (scene: Scene): string[] => {
  if (!LISTENING_KINDS.has(scene.kind)) return [];
  return scene.beats.flatMap((beat) => {
    if (beat.kind === 'rec' || beat.kind === 'ui') return [];
    if (beat.kind === 'learner' && scene.kind === 'voicemail') return [];
    return [`${scene.id}/${beat.id}: a ${beat.kind} beat in a ${scene.kind}`];
  });
};

/** Every line Pip's minute can play: openers, closers, set-ups and slightly-wrong lines. */
export const PIPS_MINUTE_LINE_IDS: readonly Id[] = [
  ...S1_PIPS_MINUTE_OPENS,
  ...S1_PIPS_MINUTE_CLOSES,
  ...Object.values(S1_PIPS_MINUTE).flatMap((p) => [
    p.setUp.line,
    ...(p.wrong === null ? [] : [p.wrong.line]),
  ]),
];

/** Problems with a season's weeks and Pip's minute; empty when it is sound. */
export const seasonProblems = (season: Season): string[] => [
  ...seasonWeeks(season).flatMap((week, i) =>
    weekProblems(week, { ring: i < season.episodes.length }),
  ),
  ...seasonWeeks(season)
    .flatMap((week) => week.scenes)
    .flatMap(listeningSceneProblems),
  // Pip's minute plays the same lines at every stage, the Visitor's included.
  ...PIPS_MINUTE_LINE_IDS.flatMap(visitorLineProblems),
  ...(allPipsMinuteScenes().length === 0 ? ["no Pip's minute can be built"] : []),
];
