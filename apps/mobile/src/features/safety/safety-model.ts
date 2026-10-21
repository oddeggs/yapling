import type { Translate } from '@yapling/i18n';

import type { EmergencyContact } from './emergency';

export interface SafetyView {
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly emergency: {
    readonly title: string;
    readonly sub: string;
    /** "Call 115", or null where no number is listed for the country. */
    readonly call: {
      readonly label: string;
      readonly number: string;
      readonly a11y: string;
    } | null;
  };
  readonly support: { readonly title: string; readonly sub: string };
  readonly trusted: { readonly title: string; readonly sub: string };
  readonly later: string;
}

/** The safety sheet as data: out of character, the country's number, real people. */
export function safetyView(
  contact: EmergencyContact | null,
  roommateName: string,
  copy: Translate,
): SafetyView {
  return {
    kicker: copy('safety.kicker'),
    title: copy('safety.title'),
    body: copy('safety.body', { name: roommateName }),
    emergency: {
      title: copy('safety.emergency'),
      sub:
        contact === null
          ? copy('safety.emergencyLocal')
          : copy('safety.emergencySub', { country: copy(contact.countryKey) }),
      call:
        contact === null
          ? null
          : {
              label: copy('safety.call', { number: contact.number }),
              number: contact.number,
              a11y: copy('safety.a11y.call', { number: contact.number }),
            },
    },
    support: { title: copy('safety.supportLine'), sub: copy('safety.supportLineSub') },
    trusted: { title: copy('safety.trusted'), sub: copy('safety.trustedSub') },
    later: copy('safety.later'),
  };
}
