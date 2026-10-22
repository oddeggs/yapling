import { findScene } from '@yapling/story';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { getSessionToken, useProfile } from '../../data';
import { apiBase, clientVersion } from '../../data/config';
import { CallScreen } from '../../features/call/call-screen';
import { BURROW_ROUTE, postCallHref, SAFETY_ROUTE } from '../../features/call/routes';
import { useLocale } from '../../ui/locale';

/** The call socket on the same host as the API: `ws(s)://<api>/calls/socket`. */
const socketUrl = (base: string) =>
  `${base.replace(/^http/, 'ws').replace(/\/$/, '')}/calls/socket`;

/** How long to wait for the profile from the cache before calling with the defaults. */
const PROFILE_WAIT_MS = 1_500;

export default function CallRoute() {
  const params = useLocalSearchParams<{ scene?: string; turn?: string; fixtures?: string }>();
  const router = useRouter();
  const { language } = useLocale();
  const { profile, status } = useProfile();
  const scene = findScene(params.scene ?? 's1-e1') ?? findScene('s1-e1');

  // Call with the learner's stage and language once the profile is known (a placement call runs
  // before there is one, with a newcomer's defaults).
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), PROFILE_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);
  const ready = profile !== null || status === 'ready' || status === 'error' || waited;

  const fixtures = useMemo(
    () => (__DEV__ && params.fixtures ? params.fixtures.split(',').filter(Boolean) : null),
    [params.fixtures],
  );

  if (!scene || !ready) return null;
  return (
    <CallScreen
      scene={scene}
      stage={profile?.stage ?? 'newcomer'}
      firstLanguage={profile?.firstLanguage ?? (language === 'vi' ? 'vi' : 'other')}
      roommate={profile?.roommate ?? { name: 'Pip', species: 'redpanda' }}
      turnMode={params.turn === 'hands' ? 'hands_free' : 'hold_to_talk'}
      url={socketUrl(apiBase())}
      clientVersion={clientVersion()}
      getToken={getSessionToken}
      devFixtures={fixtures}
      onSafety={() => router.push(SAFETY_ROUTE)}
      onFinish={({ callId }) => {
        if (callId) router.replace(postCallHref(callId));
        else if (router.canGoBack()) router.back();
        else router.replace(BURROW_ROUTE);
      }}
    />
  );
}
