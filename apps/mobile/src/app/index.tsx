import { palette } from '@yapling/theme';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useProfile, useSession } from '../data';
import {
  HOME_ROUTE,
  chromeLanguageOf,
  launchTarget,
  stepHref,
  useOnboarding,
} from '../features/onboarding';
import { useLanguageOverride, useLocale } from '../ui';

/**
 * `/`: only a redirect. A learner without a profile goes to onboarding (or back to the step they
 * left), one with a profile to the burrow (`/(home)`). The chrome takes the learner's language
 * first: the profile's, or the one chosen on the ferry.
 */
export default function Index() {
  const session = useSession();
  const { profile, status, source } = useProfile();
  const [state] = useOnboarding();
  const setLanguage = useLanguageOverride();
  const { language } = useLocale();
  const wanted = chromeLanguageOf(profile?.firstLanguage ?? state.firstLanguage);
  useEffect(() => {
    if (wanted !== language) setLanguage(wanted);
  }, [wanted, language, setLanguage]);

  const target = launchTarget({
    sessionStatus: session.status,
    hasSession: session.session !== null,
    profile,
    profileSettled: source === 'server' || status === 'error',
    step: state.step,
  });
  if (target.kind === 'wait' || wanted !== language)
    return <View style={{ flex: 1, backgroundColor: palette.harbourSky }} />;
  return <Redirect href={target.kind === 'home' ? HOME_ROUTE : stepHref(target.step)} />;
}
