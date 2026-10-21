import { translator } from '@yapling/i18n';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { isDataError, useCall, useCalls, useProfile, useSession } from '../../data';
import { deviceTimeZone } from '../../data/week';
import { useLanguageOverride, useLocale, useToast } from '../../ui';
import { micPermissionStatus, requestMicPermission } from '../../voice';
import { Face } from '../burrow/art';
import { requestKnockPermission } from '../knocks';
import { AiExplainer } from '../safety';
import { CardScreen } from './card-screen';
import { AgeScreen, LanguageScreen } from './ferry';
import {
  DEFAULT_ROOMMATE_NAME,
  canMoveIn,
  canStepOff,
  chromeLanguageOf,
  notificationsUpdateOf,
  profileInputOf,
  type Pace,
} from './flow';
import { NotificationsScreen } from './notifications-screen';
import { PickScreen } from './pick-screen';
import { previewSummary } from './preview';
import { placementSummaryOf, residencyView, type PlacementSummary } from './residency';
import { HOME_ROUTE, placementCallHref, stepHref } from './routes';
import { UnpackScreen } from './unpack-screen';
import { useOnboarding } from './use-onboarding';

/*
 * Each onboarding step's screen wired to the learner's data: the onboarding state on the phone,
 * the session, the profile, the placement call's record, and the permission asks.
 */

const en = translator('en');

/** How long the residency card waits for the call's summary before showing the general strengths. */
const SUMMARY_WAIT_MS = 60_000;
const SUMMARY_POLL_MS = 3_000;

/** The roommate's name as typed, or Pip while the field is empty. */
const nameOrPip = (typed: string) => typed.trim() || DEFAULT_ROOMMATE_NAME;

export function LanguageStep() {
  const router = useRouter();
  const setLanguage = useLanguageOverride();
  const { language } = useLocale();
  const [chosen, dispatch] = useOnboarding((s) => s.firstLanguage);
  // The chrome follows the stored choice (a relaunch on this step).
  useEffect(() => {
    const wanted = chromeLanguageOf(chosen);
    if (wanted !== language) setLanguage(wanted);
  }, [chosen, language, setLanguage]);
  return (
    <LanguageScreen
      chosen={chosen}
      onChoose={(l) => dispatch({ type: 'chooseLanguage', language: l })}
      onContinue={() => {
        dispatch({ type: 'languageDone' });
        router.push(stepHref('age'));
      }}
    />
  );
}

export function AgeStep() {
  const router = useRouter();
  const { t } = useLocale();
  const { startGuest } = useSession();
  const [state, dispatch] = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const open = canStepOff(state);
  const onContinue = async () => {
    if (!open || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await startGuest();
      dispatch({ type: 'guestStarted' });
      router.push(stepHref('ai'));
    } catch (error) {
      setProblem(
        isDataError(error, 'network') ? t('onboarding.age.offline') : t('onboarding.age.failed'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AgeScreen
      name={state.displayName}
      onName={(name) => dispatch({ type: 'setDisplayName', name })}
      confirmed={state.ageConfirmed}
      onToggle={() => dispatch({ type: 'setAgeConfirmed', confirmed: !state.ageConfirmed })}
      canContinue={open}
      busy={busy}
      problem={problem}
      onContinue={() => void onContinue()}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(stepHref('language')))}
    />
  );
}

export function AiStep() {
  const router = useRouter();
  const [state, dispatch] = useOnboarding();
  return (
    <AiExplainer
      look="onboarding"
      roommate={{ species: state.species, name: nameOrPip(state.roommateName) }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(stepHref('age')))}
      onDone={() => {
        dispatch({ type: 'aiUnderstood' });
        router.push(stepHref('pick'));
      }}
    />
  );
}

export function PickStep() {
  const router = useRouter();
  const { t } = useLocale();
  const { saveProfile } = useProfile();
  const [state, dispatch] = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const open = canMoveIn(state);
  const onMoveIn = async () => {
    if (!open || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await saveProfile(profileInputOf(state, deviceTimeZone()));
      dispatch({ type: 'movedIn' });
      router.push(stepHref('unpack'));
    } catch {
      setProblem(t('onboarding.pick.saveFailed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <PickScreen
      species={state.species}
      onSpecies={(species) => dispatch({ type: 'chooseSpecies', species })}
      name={state.roommateName}
      onName={(name) => dispatch({ type: 'setRoommateName', name })}
      canMoveIn={open}
      busy={busy}
      problem={problem}
      onMoveIn={() => void onMoveIn()}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(stepHref('ai')))}
    />
  );
}

export function UnpackStep() {
  const router = useRouter();
  const { profile } = useProfile();
  const [state] = useOnboarding();
  const [askMic, setAskMic] = useState(false);
  const [asking, setAsking] = useState(false);
  const roommate = profile?.roommate ?? {
    species: state.species,
    name: nameOrPip(state.roommateName),
  };
  // The call screen takes over from here; it comes back to the residency card when it ends.
  const startCall = () => router.replace(placementCallHref());
  useEffect(() => {
    let alive = true;
    void micPermissionStatus().then((status) => {
      if (!alive) return;
      if (status === 'undetermined') setAskMic(true);
      else startCall();
    });
    return () => {
      alive = false;
    };
    // Once, as the burrow opens.
  }, []);
  return (
    <UnpackScreen
      species={roommate.species}
      roommateName={roommate.name}
      askMic={askMic}
      asking={asking}
      onAllowMic={() => {
        setAsking(true);
        // Whatever the answer, the call goes on: it explains a microphone that is off.
        void requestMicPermission().finally(startCall);
      }}
    />
  );
}

export function CardStep() {
  const params = useLocalSearchParams<{ callId?: string; preview?: string }>();
  const [state, dispatch] = useOnboarding();
  const fromCall = typeof params.callId === 'string' && params.callId !== '' ? params.callId : null;
  useEffect(() => {
    dispatch({ type: 'placed', callId: fromCall });
  }, [fromCall, dispatch]);
  const preview = __DEV__ ? previewSummary(params.preview) : null;
  if (preview !== null) return <Card summary={preview} />;
  const callId = fromCall ?? state.placementCallId;
  return callId !== null ? <CardForCall id={callId} /> : <CardFromList />;
}

/** No call id came back: the newest placement call on the server, if there is one. */
function CardFromList() {
  const { calls, status } = useCalls();
  const placement = calls.find((c) => c.kind === 'placement') ?? null;
  if (placement !== null) return <CardForCall id={placement.id} />;
  const settled = status === 'ready' || status === 'error';
  return <Card summary={placementSummaryOf(null, !settled, settled)} />;
}

function CardForCall({ id }: { id: string }) {
  const { call, refresh, status } = useCall(id);
  const [waitedOut, setWaitedOut] = useState(false);
  useEffect(() => {
    setWaitedOut(false);
    const timer = setTimeout(() => setWaitedOut(true), SUMMARY_WAIT_MS);
    return () => clearTimeout(timer);
  }, [id]);
  const pending = call === null || call.summaryPending;
  useEffect(() => {
    if (!pending || waitedOut) return undefined;
    const poll = setInterval(() => void refresh().catch(() => undefined), SUMMARY_POLL_MS);
    return () => clearInterval(poll);
  }, [pending, waitedOut, refresh]);
  const gaveUp = waitedOut || (status === 'error' && call === null);
  return <Card summary={placementSummaryOf(call, true, gaveUp)} />;
}

function Card({ summary }: { summary: PlacementSummary }) {
  const router = useRouter();
  const { t } = useLocale();
  const toast = useToast();
  const { profile } = useProfile();
  const [state, dispatch] = useOnboarding();
  const species = profile?.roommate.species ?? state.species;
  const roommateName = profile?.roommate.name ?? nameOrPip(state.roommateName);
  const view = useMemo(
    () =>
      residencyView({
        summary,
        stage: profile?.stage ?? 'newcomer',
        now: Date.now(),
        timezone: profile?.timezone ?? deviceTimeZone(),
        t,
        tEn: en,
      }),
    [summary.kind, summary.kind === 'ready' ? summary.wins.join('\n') : '', profile, t],
  );
  const adjust = (pace: Pace) => {
    dispatch({ type: 'adjustPace', pace });
    toast({
      text: t(
        pace === 'faster' ? 'onboarding.card.adjustedFaster' : 'onboarding.card.adjustedSlower',
      ),
      art: (
        <Face
          character="pip"
          species={species}
          size={34}
          mood={pace === 'faster' ? 'happy' : 'warm'}
        />
      ),
    });
  };
  return (
    <CardScreen
      view={view}
      species={species}
      roommateName={roommateName}
      onTooEasy={() => adjust('faster')}
      onTooHard={() => adjust('slower')}
      onContinue={() => {
        dispatch({ type: 'cardDone' });
        router.push(stepHref('notifications'));
      }}
    />
  );
}

export function NotificationsStep() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const [state, dispatch] = useOnboarding();
  const [busy, setBusy] = useState(false);
  const finish = (allowed: boolean) => {
    const update = notificationsUpdateOf(state, allowed);
    dispatch({ type: 'notificationsAnswered' });
    // Shown at once and queued offline; the evening doesn't wait for the server.
    void updateProfile(update).catch(() => undefined);
    router.replace(HOME_ROUTE);
  };
  return (
    <NotificationsScreen
      species={profile?.roommate.species ?? state.species}
      roommateName={profile?.roommate.name ?? nameOrPip(state.roommateName)}
      quietOn={state.quietOn}
      quietHours={state.quietHours}
      onQuietOn={(on) => dispatch({ type: 'setQuietOn', on })}
      onQuietHours={(hours) => dispatch({ type: 'setQuietHours', hours })}
      busy={busy}
      onAllow={() => {
        setBusy(true);
        void requestKnockPermission()
          .catch(() => false)
          .then((granted) => finish(granted));
      }}
      onLater={() => finish(false)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(stepHref('card')))}
    />
  );
}
