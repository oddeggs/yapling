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
  /*
   * Settling in, before the story: one morning knock from Yapling announcing the chapter that
   * waits (Chapter 1 is Linh at the door, in the app). Chrome, so translated; an invitation, never
   * a reminder of what is left.
   */
  /** Chapter 2, Boxes. */
  'knocks.settling.2': 'Linh’s coming over to help you unpack.',
  /** Chapter 3, Again, please. */
  'knocks.settling.3': 'Linh has two lifesavers to show you.',
  /** Chapter 4, Bus 45. */
  'knocks.settling.4': 'Linh is waiting for you at the bus stop.',
  /** Chapter 5, Mei's café. */
  'knocks.settling.5': 'Mei’s café is open. Come for a cup of tea.',
  /** Chapter 6, About me. */
  'knocks.settling.6': '{name} is writing a page about you.',
  /*
   * Weeks 2 to 7, three a week from the week's own plan: the new episode (day 1), Pip's story
   * (day 2), the voicemail (day 5). A character's line stays in English; the app's is translated.
   * At Visitor every knock is from Yapling: a character's line has a `_visitor` version, the same
   * news told by the app. Week 2's episode falls on day 8, which week one's own knock keeps.
   */
  /** From the roommate. Episode 2, Help Wanted. */
  'knocks.week2_episode': 'Interview day! Sol is waiting. Come with me?',
  /** From Yapling, at Visitor. */
  'knocks.week2_episode_visitor': '{name} has a job interview today. Go along with {name}?',
  /** From Yapling. */
  'knocks.week2_story': '{name} tried on three things for the interview.',
  /** From Yapling. */
  'knocks.week2_voicemail': '{name} left you a voicemail.',
  /** From Mei. Episode 3, Cheaper Beans. */
  'knocks.week3_episode': 'A big customer is coming. Can you help at the counter?',
  /** From Yapling, at Visitor. */
  'knocks.week3_episode_visitor': 'Mei has a big customer coming. Help her at the counter?',
  /** From Yapling. */
  'knocks.week3_story': '{name} had its first morning at work.',
  /** From Yapling. */
  'knocks.week3_voicemail': 'Mei left you a voicemail.',
  /** From Nell. Episode 4, The Plan. */
  'knocks.week4_episode': 'Meeting at the inn tonight. Tea’s on. Bring an idea?',
  /** From Yapling, at Visitor. */
  'knocks.week4_episode_visitor': 'Meeting at Nell’s inn tonight. Bring an idea?',
  /** From Yapling. */
  'knocks.week4_story': '{name} made a poster. Count the f’s.',
  /** From Yapling. */
  'knocks.week4_voicemail': 'Nell left you a voicemail.',
  /** From Bea. Episode 5, The Petition. */
  'knocks.week5_episode': 'Petition day! Bus 45 leaves at nine.',
  /** From Yapling, at Visitor. */
  'knocks.week5_episode_visitor': 'Petition day! Bus 45 leaves at nine.',
  /** From Yapling. */
  'knocks.week5_story': '{name} has a secret to tell you.',
  /** From Yapling. */
  'knocks.week5_voicemail': 'Mei left you a voicemail.',
  /** From Mei. Episode 6, The Town Meeting. */
  'knocks.week6_episode': 'The vote is today. The whole town is in the square.',
  /** From Yapling, at Visitor. */
  'knocks.week6_episode_visitor': 'The vote is today. The whole town is in the square.',
  /** From Yapling. The day's six postcards, the bigger event than the story; it opens them. */
  'knocks.week6_story': 'Six postcards came for you.',
  /** From Yapling. */
  'knocks.week6_voicemail': '{name} left you a voicemail.',
  /** From Yapling. Bunting Week opens (no episode); the burrow. */
  'knocks.week7_episode': 'Bunting Week! Your words are on the flags.',
  /** From Yapling. */
  'knocks.week7_story': '{name} wrote the story of your season.',
  /** From Yapling. */
  'knocks.week7_voicemail': 'Bea left you a voicemail.',
} as const satisfies EnCatalogue;
