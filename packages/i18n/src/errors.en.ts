import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the error states, each in the roommate's world: a crackly line instead of "no
 * connection", a roommate who can't hear you yet instead of "permission denied". `{name}` is the
 * roommate's name.
 */
export const errorsEn = {
  'errors.offline.kicker': 'NO CONNECTION',
  'errors.offline.title': '{name}’s line is crackly. Try a voice note?',
  'errors.offline.body': 'It sends when you’re back online.',
  'errors.offline.voiceNote': 'Record a voice note',
  'errors.offline.retry': 'Try the call again',
  'errors.mic.kicker': 'MICROPHONE OFF',
  'errors.mic.title': '{name} can’t hear you yet',
  'errors.mic.body':
    'The microphone is off for Yapling. Turn it on in Settings so {name} can hear you.',
  'errors.mic.openSettings': 'Open Settings',
  'errors.mic.type': 'Type instead',
} as const satisfies EnCatalogue;
