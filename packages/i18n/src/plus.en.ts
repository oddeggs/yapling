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
  /** The yearly card when App Store Connect offers no paid first-year price. */
  'plus.plan.yearly': 'Yearly',
  /** Over the plan cards in a development build with no RevenueCat key: the design's prices. */
  'plus.devOnly': 'Dev only: sample prices, no App Store. Purchases are off.',
  /** The store couldn't load the products (offline, or the products aren't set up). */
  'plus.storeUnavailable': 'The App Store isn’t answering right now. Try again in a little while.',
  /** A price that hasn't loaded yet. */
  'plus.priceLoading': '…',
  /** After a purchase the server will confirm. Nothing about care, only minutes and depth. */
  'plus.welcome': 'Plus is on. More live minutes start now.',
  /** Ask to Buy, or a payment that clears later. */
  'plus.pending': 'Waiting for the App Store to confirm your payment.',
  'plus.failed': 'That didn’t go through. You haven’t been charged.',
  'plus.restored': 'Plus is back on this phone.',
  'plus.nothingToRestore': 'No Plus purchase to restore on this Apple ID.',
  'plus.unavailable': 'Purchases aren’t available in this build.',
  /** Read for the plan cards. */
  'plus.a11y.plan': '{plan}, {price}. {detail}',
} as const satisfies EnCatalogue;
