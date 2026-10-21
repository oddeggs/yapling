import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Linking } from 'react-native';

import { useLocale } from '../../ui';
import { safetyCopy } from './copy';
import { deviceCountry, emergencyFor, SUPPORT_LINES_URL } from './emergency';
import { safetyView } from './safety-model';
import { SafetyScreen } from './safety-screen';

export interface SafetyContainerProps {
  readonly roommateName: string;
  /** ISO 3166-1 alpha-2; the phone's own when not given (settings will confirm it). */
  readonly country?: string;
}

/** The safety sheet wired to the phone: dialling, the helpline directory, Messages, the burrow. */
export function SafetyContainer({ roommateName, country }: SafetyContainerProps) {
  const router = useRouter();
  const { language } = useLocale();
  const copy = useMemo(() => safetyCopy(language), [language]);
  const view = useMemo(
    () => safetyView(emergencyFor(country ?? deviceCountry()), roommateName, copy),
    [country, roommateName, copy],
  );
  return (
    <SafetyScreen
      view={view}
      onCall={(number) => void Linking.openURL(`tel:${number}`)}
      onSupportLine={() => void Linking.openURL(SUPPORT_LINES_URL)}
      // A new message: the learner picks who from their contacts.
      onTrusted={() => void Linking.openURL('sms:')}
      onLater={() => {
        // Back to the burrow, past whatever sheet opened this one.
        if (router.canDismiss()) router.dismissAll();
        else router.replace('/');
      }}
    />
  );
}
