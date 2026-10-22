import type { EnCatalogue } from './catalogue-types';

/**
 * The test menu's call-cost page (test builds only): the learner's last live calls with what each
 * cost at list prices and how fast it answered, for the facilitator of a learner session.
 * Dollars are estimates; `{p50}` and `{p90}` are milliseconds from the end of the learner's
 * speech to the first reply audio.
 */
export const devmenuEn = {
  'devmenu.cost.open': 'Call costs',
  'devmenu.cost.title': 'Call costs',
  'devmenu.cost.back': 'Back',
  'devmenu.cost.refresh': 'Refresh',
  'devmenu.cost.loading': 'Loading the last calls…',
  /** `{reason}`: why, in a word or two (offline, refused…). */
  'devmenu.cost.failed': 'Couldn’t load the costs ({reason}).',
  'devmenu.cost.empty': 'No live calls on this learner yet.',
  'devmenu.cost.server': 'From {server}',
  'devmenu.cost.totalsHeading': { one: 'THE LAST CALL', other: 'THE LAST {count} CALLS' },
  'devmenu.cost.total': '${usd} in {minutes} min · ${perMinute} a minute',
  'devmenu.cost.talk': 'The learner talked {minutes} min',
  'devmenu.cost.latency': 'Reply P50 {p50} ms · P90 {p90} ms over {turns} turns',
  'devmenu.cost.phone': 'On the phone P50 {p50} ms · P90 {p90} ms',
  'devmenu.cost.callsHeading': 'CALLS',
  /** `{when}`: date and time; `{kind}`: episode, placement…; `{reason}`: how it ended. */
  'devmenu.cost.call': '{when} · {kind} · {duration} · {reason}',
  'devmenu.cost.callCost':
    '${usd}: speech-to-text ${stt} · voice ${tts} · model ${llm} · summary ${summary}',
  'devmenu.cost.callLatency': 'P50 {p50} ms · P90 {p90} ms · {turns} turns · learner {learner} s',
  'devmenu.cost.none': '–',
} as const satisfies EnCatalogue;
