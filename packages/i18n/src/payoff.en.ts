import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the payoffs: after a call (two wins, one fix, seeds sprouting, a box unpacked, the ring)
 * and the keepsake when the ring fills. The wins and the fix themselves come from the post-call
 * feedback. `{name}` is the roommate's name.
 */
export const payoffEn = {
  'payoff.afterCall.firstCall': 'Your first call',
  'payoff.afterCall.done': 'Done!',
  'payoff.afterCall.winsTitle': 'TWO WINS',
  'payoff.afterCall.fixTitle': 'ONE FIX',
  'payoff.afterCall.sproutsTitle': 'SEED TO SPROUT',
  'payoff.afterCall.ring': 'Weekly ring · {done} of {total}',
  'payoff.afterCall.boxUnpacked': 'A box in the burrow got unpacked',
  'payoff.afterCall.cta': 'Back to the burrow',

  'payoff.keepsake.title': 'Your ring is full!',
  'payoff.keepsake.week': 'WEEK {week}',
  'payoff.keepsake.roommateSays': 'I drew it myself. {witness} signed it!',
  'payoff.keepsake.cta': 'Hang it on the wall',
  'payoff.keepsake.hung': 'Hung on the burrow wall',
  /**
   * The keepsake itself, which the roommate draws in English (its own writing): the same in every
   * language. `{learner}` is the learner's name; `{date}` the day it was earned.
   */
  'payoff.keepsake.canNow': '{learner} can now…',
  'payoff.keepsake.witnessed': 'witnessed by {witness} · {date}',
} as const satisfies EnCatalogue;
