import type { EnCatalogue } from './catalogue-types';

/**
 * The test menu's call-cost page (test builds only): the learner's last live calls with what each
 * cost at list prices and how fast it answered, for the facilitator of a learner session.
 * Dollars are estimates; `{p50}` and `{p90}` are milliseconds from the end of the learner's
 * speech to the first reply audio.
 */
export const devmenuEn = {
  'devmenu.cost.open': 'Call costs',
  'devmenu.cost.title': 'Call costs',
  'devmenu.cost.back': 'Back',
  'devmenu.cost.refresh': 'Refresh',
  'devmenu.cost.loading': 'Loading the last calls…',
  /** `{reason}`: why, in a word or two (offline, refused…). */
  'devmenu.cost.failed': 'Couldn’t load the costs ({reason}).',
  'devmenu.cost.empty': 'No live calls on this learner yet.',
  'devmenu.cost.server': 'From {server}',
  'devmenu.cost.totalsHeading': { one: 'THE LAST CALL', other: 'THE LAST {count} CALLS' },
  'devmenu.cost.total': '${usd} in {minutes} min · ${perMinute} a minute',
  'devmenu.cost.talk': 'The learner talked {minutes} min',
  'devmenu.cost.latency': 'Reply P50 {p50} ms · P90 {p90} ms over {turns} turns',
  'devmenu.cost.phone': 'On the phone P50 {p50} ms · P90 {p90} ms',
  'devmenu.cost.callsHeading': 'CALLS',
  /** `{when}`: date and time; `{kind}`: episode, placement…; `{reason}`: how it ended. */
  'devmenu.cost.call': '{when} · {kind} · {duration} · {reason}',
  'devmenu.cost.callCost':
    '${usd}: speech-to-text ${stt} · voice ${tts} · model ${llm} · summary ${summary}',
  'devmenu.cost.callLatency': 'P50 {p50} ms · P90 {p90} ms · {turns} turns · learner {learner} s',
  'devmenu.cost.none': '–',
  /*
   * Settling in (test builds only): start a Visitor, jump to a chapter or the letter's day, and
   * preview each chapter's morning knock.
   */
  'devmenu.settling.heading': 'SETTLING IN',
  'devmenu.settling.status.none': 'No learner yet: onboarding hasn’t made one.',
  'devmenu.settling.status.notVisitor': 'Not a Visitor: the story runs from the install day.',
  'devmenu.settling.status.settling':
    'Settling in · {done} of 6 chapters done · chapter {next} next',
  'devmenu.settling.status.letter': 'Settled in · the letter came on {date} (week 1, day 1)',
  'devmenu.settling.startVisitor': 'Start as a Visitor',
  /** VoiceOver hint and the note under the button. */
  'devmenu.settling.startVisitorHint':
    'Clears this phone’s learner, then makes a new one at Visitor and opens the burrow with Chapter 1 next',
  'devmenu.settling.jumpHeading': 'JUMP TO CHAPTER',
  'devmenu.settling.a11y.jumpChapter': 'Jump to chapter {chapter}',
  /** VoiceOver hint on each chapter chip. */
  'devmenu.settling.jumpHint': 'The chapters before it done, one a day; the clock on its day',
  'devmenu.settling.letterDay': 'Jump to the letter day',
  'devmenu.settling.letterDayHint':
    'All six chapters done and the clock on the day the letter comes, week 1’s day 1',
  'devmenu.settling.needsVisitor': 'Start as a Visitor first: the jumps work on a Visitor.',
  'devmenu.settling.working': 'Working…',
  /** `{reason}`: the error, for the team. */
  'devmenu.settling.failed': 'Didn’t work: {reason}',
  'devmenu.settling.done.visitor': 'A new Visitor. Chapter 1 is next, on day 1.',
  'devmenu.settling.done.chapter': 'Chapter {chapter} is next, on day {chapter}.',
  'devmenu.settling.done.letter': 'The letter comes today, settling day 6.',
  'devmenu.settling.knocksHeading': 'SETTLING-IN KNOCKS',
  'devmenu.settling.knockChip': 'Chapter {chapter}',
  'devmenu.settling.a11y.knockChip': 'Preview chapter {chapter}’s knock',
  /** VoiceOver hint on the lock-screen preview. */
  'devmenu.settling.previewHint': 'Opens chapter {chapter}’s call, as the tapped knock would',
  'devmenu.settling.ringSoon': 'Chapter {chapter}, a minute before its knock',
  'devmenu.settling.ringSoonHint':
    'Jumps to chapter {chapter} and moves the clock to a minute before its morning knock',
  'devmenu.settling.ringNote':
    'Chapter {chapter}’s scheduled knock rings in a minute. Lock the phone or leave the app.',
  'devmenu.settling.fire': 'Fire chapter {chapter}’s knock in 5 s',
  'devmenu.settling.fireNote':
    'Chapter {chapter}’s knock rings in 5 s. Lock the phone or leave the app.',
  /** The tag on the lock-screen preview. */
  'devmenu.settling.tag': 'Chapter {chapter}',
  /** The status line's day while settling in, counted from the install day. */
  'devmenu.settling.day': 'Settling day {day}',
  'devmenu.settling.noWeekKnock': 'No week-1 knock while settling in',
  /** The other lanes' sample screens, development builds only. */
  'devmenu.previews.heading': 'BEGINNER PREVIEWS',
  'devmenu.previews.afterCall': 'A Visitor’s after-call card',
  'devmenu.previews.stageUp': 'Linh’s Newcomer card',
  'devmenu.previews.me': 'A Visitor’s Me sheet',
  'devmenu.previews.hint': 'A sample learner; nothing is sent',
  /*
   * Weeks 2 on (test builds only): jump to a day of a later week with the weeks before it played,
   * fill a week's ring, and preview, ring or fire that week's knocks.
   */
  'devmenu.weeks.heading': 'LATER WEEKS',
  /** `{done}`: the story week's calls done, of 3. */
  'devmenu.weeks.status': 'Story week {week}, day {day} · ring {done} of 3',
  'devmenu.weeks.needsStory':
    'The story hasn’t started: finish Settling in first (the letter day).',
  'devmenu.weeks.needsLearner': 'No learner yet: onboarding hasn’t made one.',
  'devmenu.weeks.weekChip': 'Week {week}',
  'devmenu.weeks.a11y.weekChip': 'Choose week {week}',
  'devmenu.weeks.dayChip': '{day}',
  'devmenu.weeks.a11y.dayChip': 'Choose day {day} of the week',
  'devmenu.weeks.jump': 'Jump to week {week}, day {day}',
  /** VoiceOver hint on the jump. */
  'devmenu.weeks.jumpHint':
    'Every week before it played in full, its own calls not yet; the clock on that day',
  'devmenu.weeks.fill': 'Fill week {week}’s ring',
  'devmenu.weeks.fillHint': 'Marks the week’s three calls done and hangs its keepsake',
  'devmenu.weeks.working': 'Working…',
  /** `{reason}`: the error, for the team. */
  'devmenu.weeks.failed': 'Didn’t work: {reason}',
  'devmenu.weeks.done.jump': 'Week {week}, day {day}. Every week before it is played.',
  'devmenu.weeks.done.fill': 'Week {week}’s ring is full.',
  'devmenu.weeks.knocksHeading': 'WEEK {week}’S KNOCKS',
  'devmenu.weeks.knockChip': 'Day {day}',
  'devmenu.weeks.a11y.knockChip': 'Preview the knock on day {day} of week {week}',
  'devmenu.weeks.noKnocks': 'Nothing in this week knocks.',
  /** The tag on the lock-screen preview. */
  'devmenu.weeks.tag': 'Week {week} · day {day}',
  /** VoiceOver hint on the lock-screen preview. */
  'devmenu.weeks.previewHint': 'Jumps to that day and opens what the tapped knock opens',
  'devmenu.weeks.ringSoon': 'Week {week} day {day}, a minute before its knock',
  'devmenu.weeks.ringSoonHint':
    'Jumps to that day and moves the clock to a minute before its scheduled knock',
  'devmenu.weeks.ringNote':
    'Week {week}’s scheduled knock rings in a minute. Lock the phone or leave the app.',
  'devmenu.weeks.fire': 'Fire it in 5 s',
  'devmenu.weeks.fireNote': 'The knock rings in 5 s. Lock the phone or leave the app.',
  /** The first week's fire button on a later day: its knocks are the later weeks' (above). */
  'devmenu.weeks.noWeekOneKnock': 'Day {day} has no week-1 knock: see the later weeks',
  /** Back after days away: the welcome back and the recap, never anything lost. */
  'devmenu.back.heading': 'BACK AFTER DAYS AWAY',
  'devmenu.back.off': 'Not away',
  'devmenu.back.days': '{days} days',
  'devmenu.back.a11y': 'Treat this open as a return after {days} days',
  'devmenu.back.offA11y': 'Treat this open as an ordinary one',
  'devmenu.back.note': 'The welcome back with the story so far; everything waits where it was.',
  /** How the learner takes turns in calls, kept on this phone. */
  'devmenu.handsFree.title': 'Hands-free calls',
  'devmenu.handsFree.sub': 'Talk and pause to answer, without holding the mic',
} as const satisfies EnCatalogue;
