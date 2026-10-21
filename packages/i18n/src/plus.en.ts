import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the Yapling Plus paywall. Honest: the first week was the trial, "Not now" is as big as
 * the upgrade, and Pip, the burrow and the story stay either way. Prices come from StoreKit,
 * never from here. `{name}` is the roommate's name.
 */
export const plusEn = {
  'plus.kicker': 'YOUR FIRST WEEK WAS ON US',
  'plus.title': 'Yapling Plus',
  'plus.body':
    'From today, Free has about {minutes} live minutes a week, plus every story, postcard and voicemail.',
  'plus.table.free': 'Free',
  'plus.table.plus': 'Plus',
  'plus.table.liveMinutes': 'Live call minutes',
  'plus.table.freeMinutes': '~{minutes}/week',
  'plus.table.plusMinutes': '~{minutes}/month*',
  'plus.table.stories': 'Stories, postcards, voicemails',
  'plus.table.homework': 'Bring your homework',
  'plus.table.feedback': 'Deep feedback & drills',
  'plus.table.camera': 'Camera calls',
  'plus.plan.firstYear': 'First year',
  'plus.plan.thenYearly': 'then {price}/year',
  'plus.plan.intro': 'Intro',
  'plus.plan.monthly': 'Monthly',
  'plus.plan.cancelAnyTime': 'Cancel any time',
  'plus.students': 'Students: special price with a school email.',
  'plus.studentsLink': 'Contact support',
  'plus.fairUse': '*Fair use.',
  'plus.stayEitherWay': '{name}, the burrow and the story stay either way.',
  /** The upgrade button. The first week is the trial, so no free trial is promised. */
  'plus.cta': 'Get Plus',
  /** The upgrade button only when App Store Connect offers an introductory free trial. */
  'plus.ctaTrial': { one: 'Try {count} day free', other: 'Try {count} days free' },
  'plus.notNow': 'Not now',
  'plus.restore': 'Restore purchases',
  'plus.terms': 'Terms',
  'plus.privacy': 'Privacy',
  'plus.autoRenew':
    'Renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your Apple ID settings.',
} as const satisfies EnCatalogue;
