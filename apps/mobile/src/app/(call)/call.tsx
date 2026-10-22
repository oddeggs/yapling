import { findScene } from '@yapling/story';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { getSessionToken, useProfile, useProgress } from '../../data';
import { apiBase, clientVersion } from '../../data/config';
import { CallScreen } from '../../features/call/call-screen';
import { BURROW_ROUTE, postCallHref, SAFETY_ROUTE } from '../../features/call/routes';
import { onboardingStore } from '../../features/onboarding';
import { phraseForSeed } from '../../features/story';

/** The call socket on the same host as the API: `ws(s)://<api>/calls/socket`. */
const socketUrl = (base: string) =>
  `${base.replace(/^http/, 'ws').replace(/\/$/, '')}/calls/socket`;

/** A route to another feature or one passed in (`next`), which typed routes can't know ahead. */
type AnyHref = string | { pathname: string; params: Record<string, string> };
const navigate = (go: (href: never) => void, href: AnyHref) =>
  (go as (href: AnyHref) => void)(href);

/** How long to wait for the profile from the cache before calling with onboarding's choices. */
const PROFILE_WAIT_MS = 1_500;

export default function CallRoute() {
  const params = useLocalSearchParams<{
    scene?: string;
    turn?: string;
    next?: string;
    fixtures?: string;
  }>();
  const router = useRouter();
  const { profile, status } = useProfile();
  const { meetPhrase } = useProgress();
  const scene = params.scene ? findScene(params.scene) : undefined;
  // No such scene (a stale link): back to the burrow rather than a call that can't run.
  useEffect(() => {
    if (!scene) navigate(router.replace, BURROW_ROUTE);
  }, [scene, router]);

  // Call with the learner's stage and language once the profile is known. The placement call runs
  // before there is one: it uses what onboarding chose (language, roommate) and a newcomer's stage.
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
  const chosen = onboardingStore().store.get();
  const next = params.next;
  return (
    <CallScreen
      scene={scene}
      stage={profile?.stage ?? 'newcomer'}
      firstLanguage={profile?.firstLanguage ?? chosen.firstLanguage}
      pace={profile?.pace ?? chosen.pace}
      roommate={
        profile?.roommate ?? {
          name: chosen.roommateName.trim() || 'Pip',
          species: chosen.species,
        }
      }
      turnMode={params.turn === 'hands' ? 'hands_free' : 'hold_to_talk'}
      url={socketUrl(apiBase())}
      clientVersion={clientVersion()}
      getToken={getSessionToken}
      devFixtures={fixtures}
      onSafety={() => navigate(router.push, SAFETY_ROUTE)}
      onSeed={(seed) => {
        // A phrase opened in the call is met: a seed packet in the burrow.
        const phrase = phraseForSeed(seed, scene.phrases);
        if (phrase) void meetPhrase(phrase).catch(() => undefined);
      }}
      onFinish={({ callId }) => {
        // A call inside a flow (the placement call) goes on to where the flow said.
        if (next) navigate(router.replace, callId ? { pathname: next, params: { callId } } : next);
        else if (callId) navigate(router.replace, postCallHref(callId));
        else if (router.canGoBack()) router.back();
        else navigate(router.replace, BURROW_ROUTE);
      }}
    />
  );
}
