import { RING_SLOT_KINDS } from '@yapling/contracts';
import { callKindOf, findScene } from '@yapling/story';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
  getSessionToken,
  useProfile,
  useProgress,
  useSession,
  useTurnMode,
  useWeek,
} from '../../data';
import { startSettlingIn } from '../../features/burrow/settling-store';
import { apiBase, clientVersion } from '../../data/config';
import { CallScreen } from '../../features/call/call-screen';
import { now } from '../../features/devmenu';
import { BURROW_ROUTE, postCallHref, SAFETY_ROUTE } from '../../features/call/routes';
import { stageRequests } from '../../features/me';
import { onboardingStore } from '../../features/onboarding';
import { keepWhatWasSaid } from '../../features/payoff';
import { phraseForSeed } from '../../features/story';
import { withAppClock } from '../../voice/call-socket';

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
  const { profile, status, updateProfile } = useProfile();
  const { meetPhrase, openRing } = useProgress();
  const userId = useSession().session?.userId ?? null;
  const turnPref = useTurnMode();
  const scene = params.scene ? findScene(params.scene) : undefined;
  // The slot this call fills is open on the server too, before the call's record lands. Only a
  // call that fills a ring slot opens it, on the day as the week counts it (from the story's start).
  const kind = scene ? callKindOf(scene.kind) : null;
  const ringCall = kind !== null && (RING_SLOT_KINDS as readonly string[]).includes(kind);
  const dayIndex = useWeek()?.dayIndex ?? null;
  useEffect(() => {
    if (ringCall && dayIndex !== null) void openRing(dayIndex).catch(() => undefined);
  }, [ringCall, dayIndex, openRing]);
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
  const known =
    (turnPref.loaded && (profile !== null || status === 'ready' || status === 'error')) || waited;
  // Once the call is on screen it stays: a profile refetch never unmounts it (that would hang up
  // and dial a second call).
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (known) setShown(true);
  }, [known]);
  const ready = known || shown;

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
      // The learner's choice; `turn=hands` or `turn=hold` (dev links, the voice lab) override it.
      turnMode={
        params.turn === 'hands'
          ? 'hands_free'
          : params.turn === 'hold'
            ? 'hold_to_talk'
            : turnPref.turnMode
      }
      url={withAppClock(socketUrl(apiBase()), now())}
      clientVersion={clientVersion()}
      getToken={getSessionToken}
      devFixtures={fixtures}
      onSafety={() => navigate(router.push, SAFETY_ROUTE)}
      onSeed={(seed) => {
        // A phrase opened in the call is met: a seed packet in the burrow.
        const phrase = phraseForSeed(seed, scene.phrases);
        if (phrase) void meetPhrase(phrase).catch(() => undefined);
      }}
      onPace={(pace) => void updateProfile({ pace }).catch(() => undefined)}
      onFinish={({ callId, reason, heard }) => {
        // The after-call card gives the learner's own sentences back.
        if (callId) keepWhatWasSaid(callId, heard);
        if (reason === 'too_hard') {
          // "Tập với Linh trước": a Newcomer becomes a Visitor, and Linh's chapters wait in the
          // burrow (a Visitor opens the list to play one again). The scene kept its place.
          const visitor = (profile?.stage ?? 'newcomer') === 'visitor';
          if (!visitor)
            void stageRequests()
              .request({ to: 'visitor', reason: 'too_hard' })
              .catch(() => undefined);
          if (userId !== null) void startSettlingIn(userId).catch(() => undefined);
          navigate(router.replace, visitor ? `${BURROW_ROUTE}?settling=1` : BURROW_ROUTE);
        } else if (next)
          navigate(router.replace, callId ? { pathname: next, params: { callId } } : next);
        else if (callId) navigate(router.replace, postCallHref(callId));
        else if (router.canGoBack()) router.back();
        else navigate(router.replace, BURROW_ROUTE);
      }}
    />
  );
}
