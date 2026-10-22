import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the call frame, shared by every call and listening scene: the speaker pill's place line,
 * the bubble's meaning tap, the learner's caption, hints, the bottom bar (Hold on, the mic, the
 * scene's last button), correction stickers and the fluency mirror. Character lines come from
 * `@yapling/story`. `{name}` is the roommate's name.
 */
export const callEn = {
  'call.place.cafe': 'Lantern Café · behind the counter',
  'call.place.fromBurrow': 'calling from the burrow',
  'call.place.busStop': 'Bus 45 stop',
  'call.place.onCall': 'on a call',
  /** The phone pill while the learner calls someone for a character. */
  'call.calling': 'Calling {who}',
  'call.callee.harbourLaneOffice': 'Harbour Lane Office',

  'call.tapForMeaning': 'Tap for Vietnamese',
  /**
   * The meaning chip. It stays in English in every language: it is the question the learner
   * learns to ask.
   */
  'call.whatDoesThatMean': 'What does that mean?',
  'call.whisper': '{name} whispers',
  'call.showTranslation': 'Show translation',
  'call.hideTranslation': 'Hide translation',
  'call.you': 'YOU',
  'call.youHeard': 'YOU · heard',
  'call.hint': 'HINT',
  'call.seconds': '{count}s',

  'call.holdOn': 'Hold on',
  'call.ready': 'Ready',
  'call.mic.paused': 'Paused · take your time',
  'call.mic.listening': 'Listening… let go when done',
  'call.mic.yourTurn': 'Your turn · hold to talk',
  'call.mic.talking': '{who} is talking',
  'call.mic.sceneComplete': 'Scene complete',
  /** Read for the mic button. */
  'call.a11y.mic': 'Hold to talk',
  /** Read for a character's bubble while the reply is on its way. */
  'call.a11y.thinking': '{name} is thinking',
  /** Read for a timer and a Pass it on round (shown as "60s"). */
  'call.a11y.seconds': '{count} seconds',
  /** Read for the letter tucked into the corner of the counter. */
  'call.a11y.letter': 'The letter. Tap to read it again',

  /** The last button of each scene. */
  'call.done.wrapUp': 'Wrap up',
  'call.done.hopOff': 'Hop off',
  'call.done.seasonMap': 'See the season map',

  /**
   * The character's bubble when a turn got no answer (nothing heard, or the reply failed). Said in
   * English in every language, as the character says it.
   */
  'call.didntCatch': "Sorry, I didn't catch that. Say it another way?",
  /** The pill while the line drops and the phone dials back in. */
  'call.reconnecting': 'Reconnecting…',
  /** The pill while a phone call or Siri has the audio. */
  'call.interrupted': 'Paused while you take that call',

  'call.fixedIt': 'You fixed it yourself',
  'call.nowALeaf': 'Now a leaf',
  'call.seedDropped': 'Dropped into the burrow as a seed packet',
  'call.wordAdded': 'Added “{word}” to the burrow',

  'call.mirror.title': 'Fluency mirror',
  'call.mirror.round': 'Round {round}',
  'call.mirror.flow': 'Flow {seconds}s',
  'call.mirror.pace': '{wpm} wpm',
  'call.mirror.pauses': 'Pauses {pauses}/min',
  'call.mirror.smoother': 'Round three is visibly smoother!',
  'call.mirror.flowMeans': 'Flow = seconds without stopping.',
} as const satisfies EnCatalogue;
