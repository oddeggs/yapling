import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the burrow: coming home, the peek at the next episode, new objects, and the stages a
 * phrase grows through (seed packet, sprout, leaf, bloom). `{name}` is the roommate's name.
 */
export const burrowEn = {
  'burrow.place': 'Your burrow',
  'burrow.peek.episode': 'Season {season} · Episode {episode}',
  'burrow.peek.ready': 'Ready when you are',
  /** After days away: the story waits exactly where it was. */
  'burrow.peek.whereYouLeftIt': 'Exactly where you left it',
  'burrow.newObject': 'New in the burrow: {object}',
  'burrow.object.seagullFeather': 'a seagull feather',
  'burrow.stage.seed': 'Seed',
  'burrow.stage.sprout': 'Sprout',
  'burrow.stage.leaf': 'Leaf',
  'burrow.stage.bloom': 'Bloom',
} as const satisfies EnCatalogue;
