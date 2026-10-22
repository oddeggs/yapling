import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the season map. Episode titles ("The Café Might Close", "Help
 * Wanted") come from `@yapling/story`. The pins' names are the town's own signs, in English in
 * every language.
 */
export const seasonEn = {
  'season.top': 'SEASON {season} · EPISODE {episode} OF {episodes}',
  'season.comingSoon': 'Season {season} · coming soon →',
  'season.next': 'EPISODE {episode} · {place}',
  'season.place.burrow': 'THE BURROW',
  'season.place.lanternCafe': 'LANTERN CAFÉ',
  'season.place.hollowbrookOffice': 'HOLLOWBROOK OFFICE',
  'season.place.lanternInn': 'LANTERN INN',
  'season.place.bus45': 'BUS 45',
  'season.place.townSquare': 'TOWN SQUARE',
  /** The next episode's title and the day it opens. */
  'season.nextWhen': '{title} · {day}',
  'season.pin.burrow': 'Burrow',
  'season.pin.lanternCafe': 'Café',
  'season.pin.hollowbrookOffice': 'Office',
  'season.pin.lanternInn': 'Inn',
  'season.pin.bus45': 'Bus 45',
  'season.pin.townSquare': 'Square',
  'season.a11y.pin': 'Episode {episode}, {title}: {state}',
  'season.a11y.done': 'done',
  'season.a11y.current': 'next up',
  'season.a11y.upcoming': 'coming later',
  /** A finished episode, picked on the map: it plays again at the learner's stage today. */
  'season.replayKicker': 'EPISODE {episode} · PLAY IT AGAIN',
  'season.replay': 'Play again',
  /** Every episode done: the festival week, and the map's pins to play any episode again. */
  'season.festivalKicker': 'SEASON {season} · EVERY EPISODE DONE',
  'season.festivalHint': 'Tap an episode to play it again',
  'season.a11y.replayHint': 'Plays this episode again',
  'season.a11y.playHint': 'Plays this episode',
} as const satisfies EnCatalogue;
