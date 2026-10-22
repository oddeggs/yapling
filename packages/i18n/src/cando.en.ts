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
  /** The keepsake's own wording, in the learner's voice and the past ("Introduced myself…"). */
  'cando.ask-whats-wrong.certificate': 'Asked someone what was wrong and offered help',
  'cando.introduce-yourself-30s.certificate': 'Introduced myself in 30 seconds',
  'cando.say-what-youre-good-at.certificate': 'Said what I’m good at',
  'cando.tell-me-about-yourself.certificate': 'Answered “Tell me about yourself”',
  'cando.say-no-politely.certificate': 'Said no politely',
  'cando.push-back-offer-alternative.certificate': 'Pushed back once and offered an alternative',
  'cando.agree-disagree-kindly.certificate': 'Agreed and disagreed kindly',
  'cando.keep-a-meeting-moving.certificate': 'Kept a meeting moving and gave everyone a turn',
  'cando.short-story-with-a-point.certificate': 'Told a short story with a point',
  'cando.pitch-45s.certificate': 'Gave a 45-second pitch',
  'cando.speak-to-a-group.certificate': 'Spoke in front of a group',
  'cando.make-a-case-take-a-question.certificate': 'Made a short case and answered a question',
  /** The Visitor's can-dos, one per Settling-in chapter (`docs/beginner-path.md` §6). */
  'cando.say-hello-and-your-name': 'Say hello and your name',
  'cando.answer-yes-or-no-politely': 'Answer yes or no politely',
  'cando.ask-again-or-slower': 'Ask someone to say it again or slower',
  'cando.understand-number-time-price': 'Understand a number, a time and a price',
  'cando.order-one-thing': 'Order one thing',
  'cando.say-where-youre-from-and-what-you-do': 'Say where you’re from and what you do',
  'cando.say-hello-and-your-name.certificate': 'Said hello and my name',
  'cando.answer-yes-or-no-politely.certificate': 'Answered yes or no politely',
  'cando.ask-again-or-slower.certificate': 'Asked someone to say it again',
  'cando.understand-number-time-price.certificate': 'Understood a number, a time and a price',
  'cando.order-one-thing.certificate': 'Ordered one thing',
  'cando.say-where-youre-from-and-what-you-do.certificate': 'Said where I’m from and what I do',
} as const satisfies EnCatalogue;
