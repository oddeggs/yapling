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

  /** Coming back on day 8: the scene's last button goes home to the next episode. */
  'burrow.back.done': 'Back to the burrow',
} as const satisfies EnCatalogue;
