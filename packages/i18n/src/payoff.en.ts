import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the payoffs: after a call (two wins, one fix, seeds sprouting, a box unpacked, the ring),
 * the keepsake when the ring fills or a can-do is ticked, a phrase in bloom and an error target
 * graduating. The wins and the fix themselves come from the post-call feedback. `{name}` is the
 * roommate's name.
 */
export const payoffEn = {
  'payoff.afterCall.firstCall': 'Your first call',
  /** The kicker over "Done!" for a call that isn't the learner's first. */
  'payoff.afterCall.kind.placement': 'Getting to know you',
  'payoff.afterCall.kind.episode': 'Episode',
  'payoff.afterCall.kind.real_week': 'Real week',
  'payoff.afterCall.kind.practice': 'Practice',
  'payoff.afterCall.kind.voicemail_reply': 'Voicemail reply',
  'payoff.afterCall.kind.settling': 'Settling in',
  'payoff.afterCall.done': 'Done!',
  /** While the post-call feedback is still being written. */
  'payoff.afterCall.writing': '{name} is writing it down…',
  'payoff.afterCall.writingSub': 'Your wins and phrases will be here in a moment.',
  /** A call with nothing to report (a short one): never a miss. */
  'payoff.afterCall.quiet': '{name} enjoyed the chat',
  'payoff.afterCall.quietSub': 'Every call counts, the short ones too.',
  'payoff.afterCall.winsTitle': 'TWO WINS',
  'payoff.afterCall.winTitle': 'ONE WIN',
  'payoff.afterCall.fixTitle': 'ONE FIX',
  /** Read for the fix row: what was said and the better way. */
  'payoff.afterCall.a11yFix': 'One fix: you said “{from}”. Better: “{to}”.',
  'payoff.afterCall.seedsTitle': 'NEW SEED PACKETS',
  'payoff.afterCall.sproutsTitle': 'SEED TO SPROUT',
  'payoff.afterCall.leavesTitle': 'SPROUT TO LEAF',
  'payoff.afterCall.bloomsTitle': 'IN BLOOM',
  'payoff.afterCall.ring': 'Weekly ring · {done} of {total}',
  'payoff.afterCall.boxUnpacked': 'A box in the burrow got unpacked',
  'payoff.afterCall.newThings': {
    one: 'Something new in the burrow',
    other: '{count} new things in the burrow',
  },
  'payoff.afterCall.cta': 'Back to the burrow',
  /** The fluency receipt: friendly names, trends only. */
  'payoff.receipt.flow': 'FLOW (no stopping)',
  'payoff.receipt.upFrom': 'up from',
  'payoff.receipt.pace': 'PACE',
  'payoff.receipt.pauses': 'PAUSES',
  'payoff.receipt.seconds': '{value}s',
  'payoff.receipt.wordsPerMinute': '{value} wds/min',
  'payoff.receipt.perMinute': '{value} / min',

  /** A phrase used unprompted weeks later. */
  'payoff.bloom.label': 'BLOOM · YOUR OWN',
  'payoff.bloom.sub': 'You used it on your own, weeks later. Now it’s in bloom.',

  /** An error target the learner now owns (5 self-corrections across 3 days). */
  'payoff.graduation.title': '{name} stopped asking about your {target}. It’s yours now.',
  'payoff.graduation.sub': 'You fixed it yourself {count} times, on {days} different days.',
  'payoff.graduation.nextTag': 'NEXT',
  'payoff.graduation.next': '{name} might start asking about {target}. Gently, and not every time.',
  'payoff.graduation.cta': 'Nice',
  /** Each error target as "your …" names it, and on its round badge. */
  'payoff.target.past_ed': '-ed',
  'payoff.target.final_s': '-s',
  'payoff.target.articles': '“a” and “the”',
  'payoff.target.final_consonants': 'final sounds',
  'payoff.target.prepositions': 'little words like “to” and “at”',
  'payoff.target.be_verb': '“am”, “is” and “are”',
  'payoff.target.word_order': 'question order',
  'payoff.badge.past_ed': '-ed',
  'payoff.badge.final_s': '-s',
  'payoff.badge.articles': 'a/the',
  'payoff.badge.final_consonants': '-t -k',
  'payoff.badge.prepositions': 'to/at',
  'payoff.badge.be_verb': 'is',
  'payoff.badge.word_order': 'wh?',

  'payoff.keepsake.title': 'Your ring is full!',
  'payoff.keepsake.week': 'WEEK {week}',
  'payoff.keepsake.roommateSays': 'I drew it myself. {witness} signed it!',
  'payoff.keepsake.canDoTicked': 'New can-do ticked',
  'payoff.keepsake.track.life': 'LIFE',
  'payoff.keepsake.track.work': 'WORK',
  'payoff.keepsake.trackCount': '{done} of {total}',
  'payoff.keepsake.cta': 'Hang it on the wall',
  'payoff.keepsake.hung': 'Hung on the burrow wall',
  /**
   * The keepsake itself, which the roommate draws in English (its own writing): the same in every
   * language. `{learner}` is the learner's name; `{date}` the day it was earned.
   */
  'payoff.keepsake.canNow': '{learner} can now…',
  'payoff.keepsake.witnessed': 'witnessed by {witness} · {date}',
  /** A full week's keepsake when no can-do was ticked that week. */
  'payoff.keepsake.weekCanDo': 'fill a whole week with calls',
  /**
   * The Visitor's after-call card: the learner's own sentences as stickers, the chapter's seed
   * packet and a one-tap "how was it". `{title}` is the chapter's title ("Hello"); `{name}` is the
   * neighbour who guides Settling in (Linh).
   */
  'payoff.visitor.kicker': 'Settling in · {chapter} of {total} · {title}',
  'payoff.visitor.said': 'You said:',
  'payoff.visitor.a11ySaid': 'You said: {lines}',
  'payoff.visitor.seedTag': 'SEED PACKET · CHAPTER {chapter}',
  'payoff.visitor.seedTagCall': 'NEW SEED PACKET',
  'payoff.visitor.seedSub': 'Say it again another day and it sprouts.',
  'payoff.visitor.feelTitle': 'How was this call?',
  'payoff.visitor.justRight': 'Just right',
  'payoff.visitor.tooHard': 'Too hard',
  'payoff.visitor.replyJustRight': 'Great! {name} will keep this pace.',
  'payoff.visitor.replySlower': 'Next time {name} goes slower, one step at a time.',
  'payoff.visitor.replyPractise': '{name} will practise with you first. Mei’s café will wait.',
  'payoff.visitor.box': 'The “{title}” box is unpacked in the burrow',
  /**
   * The "Too hard" sheet after a call and on the Me sheet: slower voices, or practise with Linh
   * first. Never says "level", "down", "fail" or "beginner".
   */
  'payoff.tooHard.title': 'Too hard',
  'payoff.tooHard.sub': 'That’s fine. Pick what suits you.',
  'payoff.tooHard.slower': 'Slower, please',
  'payoff.tooHard.slowerSub': 'From the next call, everyone speaks more slowly.',
  'payoff.tooHard.linh': 'Practise with Linh first',
  'payoff.tooHard.linhSubNewcomer': 'A few short visits with Linh before the story goes on.',
  'payoff.tooHard.linhSubVisitor': 'Play a Settling-in chapter with Linh again.',
  'payoff.tooHard.note':
    'Linh will practise with you in a few short visits. Mei’s café will wait for you.',
  'payoff.tooHard.back': 'Back',
  /**
   * Linh hands a Visitor the Newcomer residency card at the end of a week's ring. The three `line`
   * entries are Linh's words: English in the speech bubble, the learner's language under it.
   */
  'payoff.stageUp.lineOffer': 'Knock knock! You’re not a visitor any more.',
  'payoff.stageUp.lineTaken': 'Welcome to Natterwick, neighbour.',
  'payoff.stageUp.lineStay': 'Of course! Same time tomorrow?',
  'payoff.stageUp.noteOffer': 'A week of settling in, done. The new card opens the story’s calls.',
  'payoff.stageUp.noteTaken':
    'Your Newcomer card is in the burrow. Linh is still next door if you need her.',
  'payoff.stageUp.noteStay': 'You’re still a Visitor. Take the card any time, from Me.',
  'payoff.stageUp.stay': 'Stay a little longer',
  'payoff.stageUp.take': 'Take the card',
  'payoff.stageUp.goodnight': 'Good night',
  'payoff.stageUp.a11yCard': 'Natterwick residency card for {name}: {stage}',
} as const satisfies EnCatalogue;
