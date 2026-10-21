import type { CallRecord } from '@yapling/contracts';
import { colours } from '@yapling/theme';
import { CAST } from '@yapling/story';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useCall, useCalls, useProfile, useProgress } from '../../data';
import { useLocale, useToast } from '../../ui';
import { AfterCallScreen } from './after-call-screen';
import { Face } from '../burrow/art';
import { GraduationScreen } from './graduation-screen';
import { earnedKeepsakes, keepsakeScreenCopy } from './keepsake-model';
import { KeepsakeScreen } from './keepsake-screen';
import { buildAfterCall, type PayoffLearner } from './model';

/*
 * The payoff screens on the app's data: the call's record (polled until its feedback lands),
 * progress after the call, the profile for the names, and earlier calls for the fluency trend.
 */

const href = (path: string): Href => path;

export const PAYOFF_ROUTES = {
  home: href('/(home)'),
  keepsake: (callId: string, step = 0) =>
    href(`/(home)/keepsake?callId=${encodeURIComponent(callId)}&step=${step}`),
} as const;

/** How often to ask for a summary still being written: soon at first, then less often. */
const POLL_FIRST_MS = 1500;
const POLL_MAX_MS = 8000;

function useLearner(): { learner: PayoffLearner; species: 'redpanda' | 'capybara' | 'cat' } {
  const { profile } = useProfile();
  return useMemo(
    () => ({
      learner: {
        name: profile?.displayName ?? '',
        roommateName: profile?.roommate.name ?? CAST.pip.name,
      },
      species: profile?.roommate.species ?? 'redpanda',
    }),
    [profile],
  );
}

/**
 * Asks the server again while the call's summary is still being written, backing off gently. The
 * screen shows only what the server has: nothing stands in for the feedback meanwhile.
 */
function useSummaryPoll(call: CallRecord | null, refresh: () => Promise<unknown>) {
  const latest = useRef(refresh);
  latest.current = refresh;
  const waiting = call === null || call.summaryPending;
  useEffect(() => {
    if (!waiting) return undefined;
    let delay = POLL_FIRST_MS;
    let timer: ReturnType<typeof setTimeout>;
    const ask = () => {
      void latest.current().catch(() => undefined);
      delay = Math.min(POLL_MAX_MS, Math.round(delay * 1.5));
      timer = setTimeout(ask, delay);
    };
    timer = setTimeout(ask, delay);
    return () => clearTimeout(timer);
  }, [waiting]);
}

/** After the call, then a graduation if one happened, then the keepsake if one was earned. */
export function AfterCallRoute({ callId }: { callId: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const { call, refresh } = useCall(callId);
  const { progress, refresh: refreshProgress } = useProgress();
  const { calls } = useCalls();
  const { learner, species } = useLearner();
  const [phase, setPhase] = useState<'summary' | 'graduation'>('summary');
  useSummaryPoll(call, refresh);

  // Progress changes with the summary (phrases, ring, keepsakes): read it again once it lands.
  const landed = call !== null && !call.summaryPending;
  useEffect(() => {
    void refreshProgress().catch(() => undefined);
    // Only when the summary lands, not on every progress change.
  }, [landed]);

  const model = useMemo(
    () =>
      call === null
        ? ({
            state: 'writing',
            title: t('payoff.afterCall.writing', { name: learner.roommateName }),
            sub: t('payoff.afterCall.writingSub'),
          } as const)
        : buildAfterCall({ call, progress, learner, earlierCalls: calls }, t),
    [call, progress, learner, calls, t],
  );

  const home = () => router.replace(PAYOFF_ROUTES.home);
  const afterGraduation = () => {
    if (model.state === 'ready' && model.keepsakes) router.replace(PAYOFF_ROUTES.keepsake(callId));
    else home();
  };
  const onContinue = () => {
    if (model.state !== 'ready') return home();
    if (model.graduation) return setPhase('graduation');
    return afterGraduation();
  };

  if (phase === 'graduation' && model.state === 'ready' && model.graduation)
    return (
      <GraduationScreen graduation={model.graduation} species={species} onDone={afterGraduation} />
    );
  return <AfterCallScreen model={model} species={species} onContinue={onContinue} onBack={home} />;
}

/** The keepsake the call earned, drawn and hung; one after another when there are several. */
export function KeepsakeRoute({ callId, step }: { callId: string; step: number }) {
  const router = useRouter();
  const { t } = useLocale();
  const toast = useToast();
  const { progress, refresh } = useProgress();
  const { learner, species } = useLearner();
  // Whether this screen's own read of progress has come back: the cached copy may predate the call.
  const [checked, setChecked] = useState(false);

  const read = useRef(refresh);
  useEffect(() => {
    let live = true;
    void read
      .current()
      .catch(() => undefined)
      .finally(() => {
        if (live) setChecked(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const earned = useMemo(
    () => (progress ? earnedKeepsakes({ id: callId }, progress, learner) : null),
    [progress, callId, learner],
  );
  const certificate = earned?.certificates[step] ?? null;
  const copy = earned ? keepsakeScreenCopy(earned, step, t) : null;

  const home = () => router.replace(PAYOFF_ROUTES.home);
  // Nothing to draw once progress is read again: there is no keepsake for this call.
  useEffect(() => {
    if (checked && certificate === null) router.replace(PAYOFF_ROUTES.home);
  }, [checked, certificate, router]);

  if (!certificate || !copy || !earned) return null;
  const onHang = () => {
    toast({
      text: copy.hungToast,
      art: (
        <Face
          character="pip"
          species={species}
          mood="proud"
          size={34}
          background={colours.accentSoft}
        />
      ),
    });
    if (step + 1 < earned.certificates.length)
      router.replace(PAYOFF_ROUTES.keepsake(callId, step + 1));
    else home();
  };
  return (
    <KeepsakeScreen
      key={certificate.id}
      certificate={certificate}
      copy={copy}
      species={species}
      onHang={onHang}
      onBack={home}
    />
  );
}
