import type { StageRequest } from '@yapling/contracts';
import { localDateOf } from '@yapling/domain';
import { translator } from '@yapling/i18n';
import { CAST } from '@yapling/story';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
  isDataError,
  useAppNow,
  useCall,
  useCalls,
  useProfile,
  useSeen,
  useSession,
} from '../../data';
import { deviceTimeZone } from '../../data/week';
import { useLanguageOverride, useLocale, useToast } from '../../ui';
import { micPermissionStatus, requestMicPermission } from '../../voice';
import { Face } from '../burrow';
import { requestKnockPermission } from '../knocks';
import { AiExplainer } from '../safety';
import { CardScreen } from './card-screen';
import { AgeScreen, LanguageScreen } from './ferry';
import {
  DEFAULT_ROOMMATE_NAME,
  afterMoveIn,
  canMoveIn,
  canStepOff,
  chromeLanguageOf,
  levelStageRequest,
  notificationsUpdateOf,
  profileInputOf,
  shownStage,
  type Pace,
} from './flow';
import { LEVEL_STEP, LEVEL_STEPS, LevelScreen } from './level-screen';
import { NotificationsScreen } from './notifications-screen';
import { PickScreen } from './pick-screen';
import { previewSummary } from './preview';
import {
  placementSummaryOf,
  residencyView,
  visitorCardView,
  visitorConfirmView,
  type PlacementSummary,
} from './residency';
import { HOME_ROUTE, firstChapterHref, knockHref, placementCallHref, stepHref } from './routes';
import { TooHardSheet } from './too-hard-sheet';
import { UnpackScreen } from './unpack-screen';
import { flushPendingStage, requestStage, useOnboarding } from './use-onboarding';
import { VisitorCardScreen } from './visitor-card-screen';

/*
 * Each onboarding step's screen wired to the learner's data: the onboarding state on the phone,
 * the session, the profile, the placement call's record, and the permission asks.
 */

const en = translator('en');
const vi = translator('vi');

/** The meanings under English lines: written in Vietnamese only, so only for Vietnamese learners. */
const glossFor = (firstLanguage: string) => (firstLanguage === 'vi' ? vi : null);

/** A stage choice goes to the server in the background; the screens already show it. */
const choose = (request: StageRequest) => void requestStage(request).catch(() => undefined);

/** How long the knock waits for a pending stage to reach the server before the call starts. */
const STAGE_WAIT_MS = 3_000;

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
        router.push(stepHref('level'));
      }}
    />
  );
}

export function LevelStep() {
  const router = useRouter();
  const { t } = useLocale();
  const [state, dispatch] = useOnboarding();
  const picked = state.startPath;
  const linhKey =
    picked === 'visitor'
      ? 'onboarding.level.linh.visitor'
      : picked === 'placement'
        ? 'onboarding.level.linh.placement'
        : 'onboarding.level.linh.ask';
  const tGloss = glossFor(state.firstLanguage);
  return (
    <LevelScreen
      picked={picked}
      choices={[
        {
          path: 'visitor',
          title: t('onboarding.level.visitor'),
          sub: t('onboarding.level.visitorSub'),
        },
        {
          path: 'placement',
          title: t('onboarding.level.placement'),
          sub: t('onboarding.level.placementSub'),
        },
      ]}
      kicker={t('onboarding.level.kicker')}
      title={t('onboarding.level.title')}
      sub={t('onboarding.level.sub')}
      note={
        picked === 'visitor'
          ? t('onboarding.level.visitorNote')
          : picked === 'placement'
            ? t('onboarding.level.placementNote')
            : ''
      }
      cta={t('common.continue')}
      stepLabel={t('onboarding.level.step', { step: LEVEL_STEP, steps: LEVEL_STEPS })}
      linh={{
        name: CAST.linh.name,
        aiTag: t('common.aiTag'),
        en: en(linhKey),
        gloss: tGloss ? tGloss(linhKey) : null,
      }}
      onPick={(path) => dispatch({ type: 'chooseStartPath', path })}
      onContinue={() => {
        dispatch({ type: 'levelDone' });
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
  const timezone = deviceTimeZone();
  const today = localDateOf(useAppNow(timezone), timezone);
  const open = canMoveIn(state);
  const onMoveIn = async () => {
    if (!open || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await saveProfile(profileInputOf(state, timezone, today));
      dispatch({ type: 'movedIn' });
      // "Mình mới bắt đầu": the server makes the learner a Visitor (sent again later if it can't).
      const request = levelStageRequest(state.startPath);
      if (request !== null) choose(request);
      router.push(stepHref(afterMoveIn(state)));
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
      onBack={() => (router.canGoBack() ? router.back() : router.replace(stepHref('level')))}
    />
  );
}

/** The roommate step before the level question was answered (a relaunch from an older app). */
export function PickStepOrLevel() {
  const [startPath] = useOnboarding((s) => s.startPath);
  return startPath === null ? <Redirect href={stepHref('level')} /> : <PickStep />;
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
  const { profile, refresh } = useProfile();
  const fromCall = typeof params.callId === 'string' && params.callId !== '' ? params.callId : null;
  const { markSeen } = useSeen();
  useEffect(() => {
    dispatch({ type: 'placed', callId: fromCall });
    // The placement chat (or, for a Visitor, the day-one burrow) is behind the learner.
    void markSeen('placement_chat');
    // The placement call sets the stage when it ends; a stage chosen earlier may still be waiting.
    void refresh().catch(() => undefined);
    void flushPendingStage();
  }, [fromCall, dispatch, markSeen, refresh]);
  const preview = __DEV__ ? previewSummary(params.preview) : null;
  if (__DEV__ && params.preview === 'visitor') return <VisitorCard />;
  if (preview !== null) return <Card summary={preview} />;
  if (shownStage(state, profile?.stage ?? null) === 'visitor') return <VisitorCard />;
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
  const { profile, updateProfile } = useProfile();
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
  const [tooHard, setTooHard] = useState(false);
  const adjust = (pace: Pace) => {
    dispatch({ type: 'adjustPace', pace });
    // On the profile for every call's `hello` (queued while offline).
    void updateProfile({ pace }).catch(() => undefined);
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
    <>
      <CardScreen
        view={view}
        species={species}
        roommateName={roommateName}
        onTooEasy={() => adjust('faster')}
        onTooHard={() => setTooHard(true)}
        onContinue={() => {
          dispatch({ type: 'cardDone' });
          router.push(stepHref('notifications'));
        }}
      />
      {tooHard ? (
        <TooHardSheet
          species={species}
          busy={false}
          onSlower={() => {
            setTooHard(false);
            adjust('slower');
          }}
          onLinh={() => {
            setTooHard(false);
            // Settling in first: a Visitor, and the story waits for the letter. The card turns
            // into the Visitor's.
            choose({ to: 'visitor', reason: 'too_hard' });
            void updateProfile({ storyStartedOn: null }).catch(() => undefined);
          }}
          onClose={() => setTooHard(false)}
        />
      ) : null}
    </>
  );
}

/** The Visitor's card: Settling in with Linh first, or straight to the story. */
function VisitorCard() {
  const router = useRouter();
  const { t, language } = useLocale();
  const { profile, updateProfile } = useProfile();
  const [state, dispatch] = useOnboarding();
  const [confirming, setConfirming] = useState(false);
  const timezone = profile?.timezone ?? deviceTimeZone();
  const now = useAppNow(timezone);
  const species = profile?.roommate.species ?? state.species;
  const learnerName = profile?.displayName ?? state.displayName.trim();
  const firstLanguage = profile?.firstLanguage ?? state.firstLanguage;
  const view = useMemo(
    () =>
      visitorCardView({
        learnerName,
        now,
        timezone,
        t,
        tEn: en,
        tGloss: glossFor(firstLanguage),
      }),
    [learnerName, now, timezone, t, firstLanguage],
  );
  const confirm = useMemo(() => visitorConfirmView(t), [t, language]);
  const next = () => {
    dispatch({ type: 'cardDone' });
    router.push(stepHref('notifications'));
  };
  return (
    <VisitorCardScreen
      view={view}
      confirm={confirm}
      species={species}
      confirming={confirming}
      busy={false}
      onStart={() => {
        // Settling in: the story (and week 1) starts when the letter comes.
        if (profile?.storyStartedOn != null)
          void updateProfile({ storyStartedOn: null }).catch(() => undefined);
        next();
      }}
      onSkip={() => setConfirming(true)}
      onCancelSkip={() => setConfirming(false)}
      onConfirmSkip={() => {
        setConfirming(false);
        // Straight to the story as a Newcomer: it starts today, and Linh knocks with the letter.
        choose({ to: 'newcomer', reason: 'self_select' });
        void updateProfile({ storyStartedOn: localDateOf(now, timezone) }).catch(() => undefined);
        next();
      }}
    />
  );
}

export function NotificationsStep() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const [state, dispatch] = useOnboarding();
  const [busy, setBusy] = useState(false);
  const { markSeen } = useSeen();
  const visitor = shownStage(state, profile?.stage ?? null) === 'visitor';
  const finish = (allowed: boolean) => {
    const update = notificationsUpdateOf(state, allowed);
    // A Visitor's knock is Settling in's first call, not the Newcomer's welcome at the door with
    // the letter at dusk: the burrow skips that scene even if the app closes before the call.
    if (visitor) void markSeen('placement_chat', 'linh_welcome').catch(() => undefined);
    dispatch({ type: 'notificationsAnswered' });
    // Shown at once and queued offline; the evening doesn't wait for the server.
    void updateProfile(update).catch(() => undefined);
    // A Visitor's evening: Linh knocks, and Settling in's first chapter is the call.
    router.replace(visitor ? knockHref() : HOME_ROUTE);
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

/**
 * A Visitor's first evening: Linh knocks. The microphone is asked for first when iOS hasn't asked
 * yet; then Settling in's first chapter runs as a live call. Linh's welcome at the door and the
 * letter at dusk are a Newcomer's evening, so the burrow skips them.
 */
export function KnockStep() {
  const router = useRouter();
  const { t } = useLocale();
  const { profile } = useProfile();
  const { markSeen } = useSeen();
  const [state] = useOnboarding();
  const [askMic, setAskMic] = useState(false);
  const [asking, setAsking] = useState(false);
  const roommate = profile?.roommate ?? {
    species: state.species,
    name: nameOrPip(state.roommateName),
  };
  const startCall = () => {
    void (async () => {
      await markSeen('placement_chat', 'linh_welcome').catch(() => undefined);
      // The call takes the learner's stage from the server: give a waiting choice a moment.
      await Promise.race([
        flushPendingStage(),
        new Promise((resolve) => setTimeout(resolve, STAGE_WAIT_MS)),
      ]);
      router.replace(firstChapterHref());
    })();
  };
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
    // Once, as the door opens.
  }, []);
  return (
    <UnpackScreen
      species={roommate.species}
      roommateName={roommate.name}
      chip={t('onboarding.knock.chip')}
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
