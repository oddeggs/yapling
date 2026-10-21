import type { EnCatalogue } from './catalogue-types';

/**
 * Season 1's can-dos, by the ids `@yapling/domain` gives them (`cando.<id>`): one Life and one
 * Work per episode, in the season script's words. They show on the residency card ("aim for these
 * first"), the Me sheet and the keepsakes.
 */
export const candoEn = {
  'cando.ask-whats-wrong': 'Ask someone what’s wrong and offer help',
  'cando.introduce-yourself-30s': 'Introduce yourself in 30 seconds',
  'cando.say-what-youre-good-at': 'Say what you’re good at',
  'cando.tell-me-about-yourself': 'Answer “Tell me about yourself”',
  'cando.say-no-politely': 'Say no politely',
  'cando.push-back-offer-alternative': 'Push back once and offer an alternative',
  'cando.agree-disagree-kindly': 'Agree and disagree kindly',
  'cando.keep-a-meeting-moving': 'Keep a meeting moving and give everyone a turn',
  'cando.short-story-with-a-point': 'Tell a short story with a point',
  'cando.pitch-45s': 'Give a 45-second pitch',
  'cando.speak-to-a-group': 'Speak in front of a group',
  'cando.make-a-case-take-a-question': 'Make a short case and answer a question',
} as const satisfies EnCatalogue;
