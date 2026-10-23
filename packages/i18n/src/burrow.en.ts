import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the burrow: coming home, the peek at the next episode, new objects, and the stages a
 * phrase grows through (seed packet, sprout, leaf, bloom). `{name}` is the roommate's name.
 */
export const burrowEn = {
  'burrow.place': 'Your burrow',
  'burrow.peek.episode': 'Season {season} · Episode {episode}',
  'burrow.peek.ready': 'Ready when you are',
  /** After days away: the story waits exactly where it was. */
  'burrow.peek.whereYouLeftIt': 'Exactly where you left it',
  'burrow.newObject': 'New in the burrow: {object}',
  'burrow.object.seagullFeather': 'a seagull feather',
  'burrow.stage.seed': 'Seed',
  'burrow.stage.sprout': 'Sprout',
  'burrow.stage.leaf': 'Leaf',
  'burrow.stage.bloom': 'Bloom',

  /** The card at the top of the burrow: always one new thing since the last open. */
  'burrow.delta.sinceAway': 'SINCE YOU WERE AWAY',
  'burrow.delta.today': 'TODAY',
  /** The day tag on the first day's card. */
  'burrow.delta.day': 'DAY {day}',
  'burrow.delta.firstWords': 'Your first words will fill these shelves.',
  'burrow.delta.letterTomorrow': 'A letter comes for you tomorrow.',
  'burrow.delta.tomorrowSub': "That's all for today. Week one starts tomorrow.",
  'burrow.delta.letter': 'A letter under the café door',
  'burrow.delta.letterSub': 'Someone pushed it in last night',
  'burrow.delta.boxUnpacked': 'A box got unpacked',
  'burrow.delta.boxUnpackedSub': 'Your first call made room on the shelves',
  'burrow.delta.story': '{name} got lost today',
  'burrow.delta.storySub': 'It has a story for you, and Linh sent a postcard',
  'burrow.delta.feather': '{name} brought home a seagull feather',
  'burrow.delta.featherSub': 'It’s on the shelf now',
  'burrow.delta.favour': '{name} has a favour to ask',
  'burrow.delta.favourSub': 'How do people introduce themselves at work?',
  'burrow.delta.bus': 'Bus 45 leaves at nine',
  'burrow.delta.busSub': 'Bea wants to hear about your day',
  'burrow.delta.keepsake': 'A keepsake on the wall',
  'burrow.delta.keepsakeSub': '{name} drew it. Linh signed it.',
  'burrow.delta.voicemail': '{name} left you a voicemail',
  'burrow.delta.voicemailSub': 'Big news from Hollowbrook',
  'burrow.delta.firstWeek': 'Your first week is done',
  'burrow.delta.firstWeekSub': 'One small thing to tell you',
  'burrow.delta.nextEpisode': 'Episode {episode} is ready',
  'burrow.delta.nextEpisodeSub': 'Sol from Hollowbrook says hi',
  'burrow.delta.a11y.open': 'Open',

  /** The primary button: today's thing to do. */
  'burrow.action.story': 'Hear {name}’s story',
  'burrow.action.practice': 'Go to the Bus 45 stop',
  'burrow.action.voicemail': 'Play the voicemail',
  'burrow.action.firstWeek': 'See what it is',
  'burrow.action.week': 'See this week',

  /** The ring chip: calls done this week. */
  'burrow.ring': '{done} of {total} calls',
  /** Read for the roommate's face at the top: it opens the Me sheet. */
  'burrow.a11y.me': 'You and {name}',
  'burrow.a11y.keepsake': 'Keepsake on the wall: {canDo}',
  'burrow.a11y.object': '{phrase}: {stage}',

  /**
   * From week 2: the card and button for each day's thing (the new episode, Pip's story and the
   * post, the real-week and practice calls, the voicemail, Pip's minute, the week's wrap), and for
   * a day with nothing new. `{who}` and `{from}` are a character's name. Nothing here mentions a
   * day the learner didn't come: what is waiting simply waits.
   */
  'burrow.later.replay': 'Play Episode {episode} again',
  'burrow.later.realWeek': 'A real-week call with {who}',
  'burrow.later.practice': 'Practice with {who}',
  'burrow.later.story': '{name} has a story for you',
  'burrow.later.storySub': 'Tap a line to see what it means',
  'burrow.later.storyPost': 'And there’s post in the mailbox',
  'burrow.later.postcard': 'Post in the mailbox',
  'burrow.later.voicemail': '{from} left you a voicemail',
  'burrow.later.voicemailSub': 'Something’s happening in Natterwick',
  'burrow.later.pipsMinute': 'A minute with {name}',
  'burrow.later.pipsMinuteSub': 'One of your phrases, in a small moment',
  'burrow.later.wrap': 'Week {week}, wrapped up',
  'burrow.later.wrapFull': 'The ring is full. A keepsake is on the wall',
  'burrow.later.wrapSub': 'See what grew this week',
  'burrow.later.kicker.waiting': 'WAITING FOR YOU',
  'burrow.later.waitingSub': 'Whenever you’re ready',
  'burrow.later.phrases': 'Your phrases are growing',
  'burrow.later.phrasesSub': 'See them on this week’s page',
  'burrow.later.quiet': 'A quiet day with {name}',
  'burrow.later.quietSub': 'Everything is right where you left it',
  'burrow.later.action.postcard': 'Read the post',
  'burrow.later.action.pipsMinute': 'Start · about a minute',
  'burrow.later.action.wrap': 'See the week’s wrap',
  /** The small chip for Pip's minute on a day it isn't the card or the button. */
  'burrow.chip.pipsMinute': 'A minute with {name}',
  'burrow.chip.a11y.pipsMinute': 'A minute with {name}: one of your phrases. No live minutes used.',

  /** Coming back on day 8: the scene's last button goes home to the next episode. */
  'burrow.back.done': 'Back to the burrow',

  /**
   * Settling in: the burrow before the story, one short chapter with Linh at a time. The top pill
   * says the day and its light; the card names the next chapter.
   */
  'burrow.settling.when': 'Day {day} · {time}',
  'burrow.settling.time.morning': 'morning',
  'burrow.settling.time.afternoon': 'afternoon',
  'burrow.settling.time.evening': 'evening',
  /** The letter's evening, when it slides under the café door. */
  'burrow.settling.time.dusk': 'dusk',
  'burrow.settling.kicker': 'SETTLING IN · {chapter}/{total}',
  /** After two chapters in a day: a rest is suggested, never required. */
  'burrow.settling.kickerRest': 'SETTLING IN · {chapter}/{total} · TOMORROW?',
  'burrow.settling.kickerDone': 'SETTLING IN · {done}/{total} DONE',
  /** What each chapter's card says (`{name}` is the roommate's name). */
  'burrow.settling.sub.1': 'Linh from next door comes to say hi.',
  'burrow.settling.sub.2': 'Linh brings the boxes over to help you unpack.',
  'burrow.settling.sub.3': 'Linh has two lifesavers to show you.',
  'burrow.settling.sub.4': 'Linh is waiting for you at the bus stop.',
  'burrow.settling.sub.5': 'Mei’s café is open. Come for tea.',
  'burrow.settling.sub.6': '{name} is writing a page about you.',
  'burrow.settling.restSub': 'Two chapters done today. Time for a rest?',
  'burrow.settling.restedSub': 'See you tomorrow. The next chapter will wait.',
  /** The card's button: who the chapter is with, and about how long it takes. */
  'burrow.settling.go.linh': 'Meet Linh · {minutes} min',
  'burrow.settling.go.mei': 'Go to Mei’s · {minutes} min',
  'burrow.settling.tomorrow': 'Tomorrow',
  'burrow.settling.keepGoing': 'Keep going',
  /** After Chapter 6 (or skipping ahead): the letter goes under Mei's door at dusk. */
  'burrow.settling.settled': 'Settled in!',
  'burrow.settling.settledSub': 'The burrow is full. Tomorrow, the story begins.',
  'burrow.settling.goodnight': 'Good night',
  /** The Settling-in list: replay any chapter, or go straight to the story. */
  'burrow.settling.list.title': 'Settling in',
  'burrow.settling.list.count': '{done}/{total} done',
  'burrow.settling.list.replay': 'Play again',
  'burrow.settling.list.next': 'Next',
  'burrow.settling.list.minutes': '2–3 min',
  'burrow.settling.list.skip': 'Start the story',
  /** Under each chapter's English title, what it's about. */
  'burrow.settling.chapter.1': 'Saying hello',
  'burrow.settling.chapter.2': 'Unpacking',
  'burrow.settling.chapter.3': 'Say it again',
  'burrow.settling.chapter.4': 'Bus 45 · with Bea',
  'burrow.settling.chapter.5': 'Mei’s café',
  'burrow.settling.chapter.6': 'About me',
  'burrow.settling.a11y.list': 'Settling-in list',
  'burrow.settling.a11y.close': 'Close the list',
  'burrow.settling.a11y.progress': '{done} of {total} chapters done',
  'burrow.settling.a11y.box': 'A box still to unpack: {title}',
  'burrow.settling.a11y.chapter': 'Chapter {chapter}: {title}, {about}',
  'burrow.settling.a11y.done': 'done',
  'burrow.settling.a11y.next': 'up next',
  'burrow.settling.a11y.later': 'later, {minutes}',
} as const satisfies EnCatalogue;
