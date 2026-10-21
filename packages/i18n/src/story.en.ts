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
} as const satisfies EnCatalogue;
