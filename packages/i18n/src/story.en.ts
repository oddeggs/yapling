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
} as const satisfies EnCatalogue;
