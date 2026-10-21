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
  /** Read for the stage dots: "Stage 1 of 5". */
  'me.a11y.stageOf': 'Stage {n} of {total}',
  /** The progress row before the first call has numbers. */
  'me.progressEmpty': 'Numbers arrive after your first call',
  /** The minutes row on Plus, whose allowance is monthly. */
  'me.liveMinutesMonth': 'Live minutes this month',
  /** The quiet-hours row when there are none. */
  'me.quietOff': 'Off',
  /** The row that opens the "is an AI" explainer. */
  'me.aiExplainer': '{name} and the neighbours are AI',
  'me.deleteData': 'Delete my data',
  'me.delete.title': 'Delete all your data?',
  'me.delete.body':
    'Your account, your recordings, what {name} remembers and your progress are deleted within 24 hours. This can’t be undone.',
  'me.delete.confirm': 'Delete everything',
  'me.delete.cancel': 'Keep my data',
  'me.delete.failed': 'Couldn’t delete just now. Try again in a moment.',
  /** The memory page: what the roommate remembers, editable. */
  'me.memory.body': 'Things {name} picked up from your calls. Change or delete anything.',
  'me.memory.about_you': 'About you',
  'me.memory.coming_up': 'Coming up',
  'me.memory.about_us': 'About us',
  'me.memory.empty': '{name} hasn’t noted anything yet.',
  'me.memory.edit': 'Edit',
  'me.memory.save': 'Save',
  'me.memory.cancel': 'Cancel',
  'me.memory.delete': 'Delete',
  /** Read for the delete button beside a note. */
  'me.memory.a11y.delete': 'Delete “{text}”',
  'me.memory.failed': 'That didn’t save. Try again.',
} as const satisfies EnCatalogue;
