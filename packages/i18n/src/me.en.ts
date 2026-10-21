import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the Me sheet, opened from the roommate's face: the learner's stage, the can-dos they
 * have shown (`cando.*`), the fixes they own, and the rows below (progress, live minutes, what the roommate
 * remembers, notifications, help and safety). `{name}` is the roommate's name.
 */
export const meEn = {
  'me.stage.newcomer': 'Newcomer',
  'me.stage.neighbour': 'Neighbour',
  'me.stage.regular': 'Regular',
  'me.stage.local': 'Local',
  'me.stage.voiceOfNatterwick': 'Voice of Natterwick',
  'me.canDoTitle': 'Things you can now do',
  'me.group.life': 'LIFE',
  'me.group.work': 'WORK',
  'me.fixesTitle': 'Fixes you now own',
  'me.progress': 'Your progress',
  'me.timeCapsule': 'Time capsule',
  'me.progressStats': 'Flow {flow}s · Pace {pace} wpm · Pauses {pauses}/min',
  'me.liveMinutes': 'Live minutes this week',
  'me.minutesLeft': '{left} of {total} left',
  'me.moreWithPlus': 'Get more with Plus',
  'me.memory': 'What {name} remembers',
  'me.memoryNotes': { one: '{count} note', other: '{count} notes' },
  'me.notifications': 'Notifications and quiet hours',
  'me.help': 'Help and safety',
} as const satisfies EnCatalogue;
