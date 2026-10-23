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
  /** An episode's row: "S1 · E1 · The Letter" (the title stays in English). */
  'week.slot.episodeTitle': 'S{season} · E{episode} · {title}',
  /** The first week's practice call, at the Bus 45 stop. */
  'week.slot.passItOn': 'Pass it on · Bus 45',
  'week.slot.today': 'Today',
  'week.slot.a11y.done': 'Done',
  'week.slot.a11y.open': 'Ready',
  'week.slot.a11y.upcoming': 'Coming up',
  'week.phrasesTitle': 'THIS WEEK’S PHRASES',
  /** No call open yet this week: the next one and its day ("Mon"). */
  'week.next': 'Next call opens {when}: {title}',
  'week.seedNote': 'Seed packets: heard, not said yet. Say them to sprout.',
  'week.cta': 'Go to the café with {name}',
  /** A call still open from an earlier week: it waits, it never expires. */
  'week.waiting.tag': 'Week {week} · waiting for you',
  'week.waiting.when': 'Ready',
  'week.waiting.a11y': 'Waiting for you from week {week}: {title}. Tap to start.',
  /** A done call can be played again; it doesn't change the ring. */
  'week.slot.again': 'Again',
  'week.slot.a11y.again': 'Done. Tap to play it again',
  /** A week with no episode of its own: its calls replay the season's. */
  'week.slot.replay': 'Replay',
} as const satisfies EnCatalogue;
