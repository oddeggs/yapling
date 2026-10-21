import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the season map. Episode titles ("The Café Might Close", "Help Wanted") and the town's
 * signs come from `@yapling/story`.
 */
export const seasonEn = {
  'season.top': 'SEASON {season} · EPISODE {episode} OF {episodes}',
  'season.comingSoon': 'Season {season} · coming soon →',
  'season.next': 'EPISODE {episode} · {place}',
  'season.place.hollowbrookOffice': 'HOLLOWBROOK OFFICE',
  /** The next episode's title and the day it opens. */
  'season.nextWhen': '{title} · {day}',
} as const satisfies EnCatalogue;
