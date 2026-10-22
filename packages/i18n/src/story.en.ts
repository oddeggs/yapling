import type { EnCatalogue } from './catalogue-types';

/**
 * Copy around the between-call stories: the voice story, postcards and voicemails, which cost no
 * live minutes and have nothing to fail. The stories themselves come from `@yapling/story`.
 * `{name}` is the roommate's name.
 */
export const storyEn = {
  'story.place.voiceStory': 'Voice story · {duration}',
  'story.place.voicemail': 'Voicemail',
  'story.nothingToFail': 'No live minutes used · nothing to fail',
  'story.voicemailFrom': 'Voicemail from {name}',
  'story.thanks': 'Thanks, {name}',
  /** The postmark on a postcard: the town, over the day it was sent (`SEP 23`). */
  'story.postmark': 'NATTERWICK',
  /** The toast when a story leaves a gift in the burrow. */
  'story.gift.seagullFeather': 'New in the burrow: a seagull feather',
  /** While the voicemail's line opens. */
  'story.voicemail.opening': 'Opening the voicemail…',
  /** The phrase's sticker after the fix: it grew one stage. */
  'story.voicemail.nowASprout': 'Now a sprout',
  /** The roommate fixed the phrase on its own (the learner stayed quiet): nothing grows, nothing lost. */
  'story.voicemail.workedItOut': '{name} worked it out',
  /** The voicemail's line could not open or dropped. Nothing is lost: it waits. */
  'story.voicemail.offline': "The line is crackly. {name}'s voicemail will wait for you here.",
  'story.voicemail.tryAgain': 'Try again',
  'story.a11y.waveform': 'Played {elapsed} of {duration}',
  'story.a11y.postcard': 'Postcard from {name}: {text}',
  /** The pill over a postcard that comes alone, or a stack of them. */
  'story.place.postcard': 'Postcard',
  'story.place.postcards': { one: '{count} postcard', other: '{count} postcards' },
  /** Under a line at Newcomer: the line has a meaning to open. */
  'story.tapForMeaning': 'Tap for Vietnamese',
  /** A recorded voicemail, as a postcard in the mailbox. */
  'story.mailbox.tag': 'In your mailbox',
  /** The address on the voicemail card, under the learner's name. */
  'story.mailbox.address': 'The Burrow, Natterwick',
  'story.mailbox.later': "Later · it'll wait in your mailbox",
  'story.mailbox.a11y.play': 'Play the voicemail',
  'story.mailbox.a11y.pause': 'Pause the voicemail',
  'story.mailbox.a11y.card': 'Voicemail from {name}: {text}',
  /** The title card at the end of an episode's week. */
  'story.end.kicker': 'SEASON {season} · END OF EPISODE {episode}',
  'story.end.nextEpisode': 'NEXT WEEK · EPISODE {episode}',
  'story.end.nextWeek': 'NEXT WEEK',
  'story.end.nextTitle': '{title}…',
  /** When the next episode opens. Missed weeks never close: they wait. */
  'story.end.outOn': 'Out {day} · missed weeks wait',
  'story.end.readyNow': 'Ready now · missed weeks wait',
  'story.end.backToTown': 'Back to town',
  'story.end.a11y.next': 'Next week: {title}. {when}',
  /** Pip's recap for a learner coming back, as a comic page. */
  'story.recap.title': 'Previously\nin Natterwick',
  'story.recap.badge': 'S{season} · E{episode}',
  'story.recap.withVoices': '{name} reads it to you, with voices.',
  'story.recap.go': "Let's go",
  'story.recap.a11y.panel': 'Panel {n}: {text}',
} as const satisfies EnCatalogue;
