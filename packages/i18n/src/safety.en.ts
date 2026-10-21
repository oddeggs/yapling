import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the safety sheet: the story pauses, the character steps out of the scene, and real help
 * is one tap away. The emergency number follows the learner's country. `{name}` is the roommate's
 * name.
 */
export const safetyEn = {
  'safety.kicker': 'The story is paused',
  'safety.title': 'It sounds like things are really hard right now.',
  'safety.body':
    '{name} is an AI and can’t help with this, but a person can. You don’t have to explain anything.',
  'safety.emergency': 'Emergency',
  'safety.emergencySub': 'If you are in danger now · {country}',
  'safety.country.vn': 'Vietnam',
  /** Read for the button that calls the emergency number. */
  'safety.a11y.call': 'Call {number}',
  'safety.supportLine': 'Find a support line',
  'safety.supportLineSub': 'Free and confidential, near you',
  'safety.trusted': 'Message someone you trust',
  'safety.trustedSub': 'Opens your contacts',
  'safety.later': 'Back to Natterwick later',
  /** The emergency row where no number is listed for the learner's country yet. */
  'safety.emergencyLocal': 'If you are in danger now, call your local emergency number.',
  /** The call button's label: the number itself, ready to dial. */
  'safety.call': 'Call {number}',
} as const satisfies EnCatalogue;
