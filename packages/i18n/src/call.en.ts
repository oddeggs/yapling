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
  'call.place.inn': 'Lantern Inn',
  'call.place.square': 'the town square',
  /** Dex's calls: the interview room at the Hollowbrook office. */
  'call.place.interviewRoom': 'Hollowbrook office · interview room',
  /** Pip's minute, in the burrow. */
  'call.place.pipsMinute': 'a minute in the burrow',
  /** The phone pill while the learner calls someone for a character. */
  'call.calling': 'Calling {who}',
  'call.callee.harbourLaneOffice': 'Harbour Lane Office',

  'call.tapForMeaning': 'Tap for Vietnamese',
  /**
   * The meaning chip. It stays in English in every language: it is the question the learner
   * learns to ask.
   */
  'call.whatDoesThatMean': 'What does that mean?',
  /** A tapped line while its translation is on its way. */
  'call.translating': 'Translating…',
  /** A tapped line whose translation didn't come; a tap asks again. */
  'call.translateFailed': "Couldn't translate it. Tap to try again",
  /** A tapped line with no translation to give. */
  'call.noTranslation': 'No translation for this line',
  /** Where a line sits among its turn's lines, in the bubble ("1/3"). */
  'call.page': '{index}/{count}',
  /** Read for that place. */
  'call.a11y.page': 'Line {index} of {count}',
  /** Read for the arrows that page through a turn's lines. */
  'call.a11y.earlierLine': 'Earlier line',
  'call.a11y.laterLine': 'Next line',
  /** The sheet listing the call's lines so far, and its button. */
  'call.history.title': 'What was said',
  'call.history.a11y.open': 'What was said. Read the call again',
  /** Read for a listed line's play button. */
  'call.history.replay': 'Play again',
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
  /** Hands-free: the mic is tapped once the learner is done, never held. */
  'call.a11y.micHandsFree': "Tap when you're done",
  /** The in-call switch between holding the mic and hands-free. */
  'call.handsFree': 'Hands-free',
  'call.a11y.handsFree': 'Hands-free: just talk, no holding. I answer when you pause.',
  'call.handsFree.on': 'Hands-free: just talk, I answer when you pause',
  'call.handsFree.off': 'Hold the mic while you talk',
  /** Hands-free, the learner's turn: the call waits however long they think. */
  'call.mic.handsFree': "Listening… I'll answer when you pause",
  /** Hands-free, while the learner talks: the tap that ends the turn now. */
  'call.mic.handsFreeTalking': "Listening… tap when you're done",
  /** Hands-free, a turn with no words (a cough, an "um"): said quietly under the mic. */
  'call.mic.handsFreeNotHeard': "Didn't catch that · say it again",
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
  /** The tip over the mic after a tap too short to be a turn (nothing was sent). */
  'call.tip.holdLonger': 'Hold the button while you talk',
  /** The tip over the mic after a hold with no words in it (nothing was answered). */
  'call.tip.notHeard': "I didn't catch that. Hold and try again.",
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
  'call.place.settling': 'Settling in · {chapter}/{total} · {title}',
  'call.card.read': 'READ ALOUD',
  'call.card.choose': 'PICK · READ ALOUD',
  'call.card.said': 'YOU SAID',
  'call.card.hear': 'Hear this line',
  'call.task.tag': 'HOW TO PLAY',
  'call.task.ok': 'OK',
  'call.task.a11yOk': 'Got it',
  'call.replay.again': 'Say again',
  'call.replay.slower': 'Slower',
  'call.replay.slowerOn': 'Slower · on',
  'call.replay.a11yAgain': 'Hear the last line again',
  'call.replay.a11ySlower': 'Hear the last line again, more slowly',
  'call.skip': 'Skip',
  'call.a11y.skip': 'Skip this turn',
  'call.hintPill': 'Hint',
  'call.a11y.hintPill': 'Ask for a hint',
  'call.paceSlower': 'Everyone will speak more slowly',
  'call.leave': 'Leave',
  'call.exit.title': 'Leave the call?',
  'call.exit.where': '{place} · {time}.',
  'call.exit.tooHard': 'Too hard?',
  'call.exit.tooHardSub': 'Slower voices, or practise with Linh first',
  /** In a Settling-in chapter, already with Linh: only slower voices. */
  'call.exit.tooHardSubSlower': 'Everyone will speak more slowly',
  'call.exit.stay': 'Keep calling',
  'call.exit.leave': 'Leave',
  'call.tooHard.slowerSub': 'Stay in the call. Everyone will speak more slowly.',
  'call.tooHard.linhSub': 'This scene keeps its place, right where you stopped.',
  'call.tooHard.back': 'Back to the call',
} as const satisfies EnCatalogue;
