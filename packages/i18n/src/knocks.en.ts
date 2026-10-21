import type { EnCatalogue } from './catalogue-types';

/**
 * Lock-screen notifications ("knocks"): each day of week one's hook, framed as an event or a
 * favour, never guilt. `@yapling/domain`'s day clock schedules them by these keys and says who each
 * is from. A knock from a character is in that character's voice and stays in English in every
 * language (it is a line they say); a knock from Yapling itself is chrome and is translated.
 * `{name}` is the roommate's name; a character's knock is titled with that character's name.
 */
export const knocksEn = {
  'knocks.from.yapling': 'Yapling',
  /** From the roommate. */
  'knocks.day2': 'Something’s going on at the café. Come with me?',
  /** From Yapling. */
  'knocks.day3': '{name} got lost today. It has a story for you.',
  /** From the roommate. */
  'knocks.day4': 'Can you teach me how to introduce myself at work?',
  /** From Bea, the Bus 45 driver. */
  'knocks.day5': 'Bus 45 leaves at nine sharp. Bring your best story, love.',
  /** From Yapling. */
  'knocks.day6': '{name} left you a voicemail.',
  /** From Yapling. */
  'knocks.day7': 'Your first week is done. One small thing to tell you.',
  /** From the roommate. */
  'knocks.day8': 'How was your week?',
  /** From the roommate, when the learner comes back after days away: nothing lost, no guilt. */
  'knocks.day8_back': 'You’re back? I kept your seat warm.',
} as const satisfies EnCatalogue;
