import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the week view: the three calls that fill the weekly ring and this week's phrases as seed
 * packets. Dates come from `common.date.range`. `{name}` is the roommate's name.
 */
export const weekEn = {
  'week.title': 'This week',
  'week.ring': '{done}/{total}',
  /** A toast when a call fills a third of the ring. */
  'week.ringToast': 'Weekly ring: {done} of {total}',
  'week.slot.episode': 'Episode',
  'week.slot.realWeek': 'Real week',
  'week.slot.practice': 'Practice',
  'week.slot.teach': 'Teach {name} to introduce itself',
  'week.slot.today': 'Today',
  'week.phrasesTitle': 'THIS WEEK’S PHRASES',
  'week.seedNote': 'Seed packets: heard, not said yet. Say them to sprout.',
  'week.cta': 'Go to the café with {name}',
} as const satisfies EnCatalogue;
