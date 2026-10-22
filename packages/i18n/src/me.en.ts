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
  /** The Visitor's stage, below Newcomer (the chip reads "Visitor · Khách mới đến" in Vietnamese). */
  'me.stage.visitor': 'Visitor',
  /** The stage chip with its English name first, when the chrome isn't English. */
  'me.stageBoth': '{en} · {local}',
  /** Beside a Visitor's stage chip: Settling-in chapters done. */
  'me.settlingCount': 'Settling in {done}/{total}',
  'me.a11y.settlingCount': 'Settling in: {done} of {total} chapters done',
  /** The Settling-in card: replay a chapter, move up, or "too hard". */
  'me.settling.title': 'SETTLING IN',
  'me.settling.replay': 'Settle in with Linh again',
  'me.settling.replaySub': 'Play any of the 6 chapters again',
  'me.settling.faster': 'Try it faster',
  'me.settling.fasterSub': 'Into the story at the usual pace',
  'me.settling.tooHard': 'Too hard?',
  'me.settling.tooHardSub': 'Slower voices, or practise with Linh first',
  /** The chapter list behind "Settle in with Linh again". */
  'me.settling.chapter': 'Chapter {chapter}',
  'me.settling.notYet': 'Not played yet',
  'me.settling.played': 'Played',
  /** "Try it faster?": the confirm sheet. */
  'me.faster.title': 'Try it faster?',
  'me.faster.body':
    'Everyone speaks at the usual pace and the read-aloud cards hide. Tap {slower} any time you need it.',
  'me.faster.slowerPill': 'Slower',
  'me.faster.back': 'Want the old pace back? Open Me › Too hard?',
  'me.faster.confirm': 'Try it',
  'me.faster.later': 'Later',
  /** The hands-free row: take turns by just talking, without holding the mic. */
  'me.handsFree': 'Hands-free calls',
  'me.handsFreeSub': 'Just talk; {name} answers when you pause',
  /** Beside a can-do group's header: how many of the season's are ticked. */
  'me.canDoCount': '{done}/{total}',
  'me.a11y.canDoCount': '{done} of {total} this season',
  /** Beside the next can-do: the episode whose call gives the chance to show it. */
  'me.canDoEpisode': 'Ep. {number}',
  'me.a11y.canDoEpisode': 'Comes in episode {number}',
} as const satisfies EnCatalogue;
