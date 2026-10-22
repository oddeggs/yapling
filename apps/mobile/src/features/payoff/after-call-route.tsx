import type { CallRecord, Progress } from '@yapling/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { useCall, useCalls, useProfile, useProgress } from '../../data';
import { useLocale } from '../../ui';
import { stageRequests } from '../me/stage-request';
import { AfterCallScreen } from './after-call-screen';
import { GraduationScreen } from './graduation-screen';
import { filledRing } from './keepsake-model';
import { buildMinuteCard, isMinuteCall } from './minute-model';
import { BloomScreen, MinuteScreen } from './moment-screens';
import { buildAfterCall, type Celebration } from './model';
import { PREVIEW_CHAPTER_ONE, PREVIEW_HEARD } from './preview';
import {
  previewEpisodeThree,
  previewMinute,
  previewPetition,
  type PreviewAfterCall,
} from './preview-weeks';
import { PAYOFF_ROUTES, useLearner, useSummaryPoll } from './routes';
import { whatWasSaid } from './said-store';
import { ThenNowScreen } from './wrap-screen';
import { VisitorAfterCallScreen, type Feel } from './visitor-after-call-screen';
import { buildVisitorAfterCall, isVisitorCall } from './visitor-model';

/*
 * After the call, on the app's data: the call's record (polled until its feedback lands), progress
 * after the call, the profile for the names, and earlier calls for the fluency trend and then and
 * now. The summary, then each moment the call earned in turn (a bloom, a graduation, then and now),
 * then the keepsake. Pip's minute has its own small card; a Visitor's call, the Visitor's card.
 */

/** The moments shown on this route, after the summary (the keepsake has its own route). */
type Phase = 'summary' | Exclude<Celebration, 'keepsake'>;

/** Development builds only: the sample learners each `?preview=` shows. */
const PREVIEWS = {
  'episode-3': { data: previewEpisodeThree, phase: 'summary' },
  bloom: { data: previewEpisodeThree, phase: 'bloom' },
  graduation: { data: previewEpisodeThree, phase: 'graduation' },
  daily: { data: previewMinute, phase: 'summary' },
  petition: { data: previewPetition, phase: 'summary' },
} as const satisfies Record<string, { data: () => PreviewAfterCall; phase: Phase }>;
type LaterPreview = keyof typeof PREVIEWS;

function usePayoffPreview(): 'visitor' | LaterPreview | null {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  if (!__DEV__ || preview === undefined) return null;
  if (preview === 'visitor') return 'visitor';
  return preview in PREVIEWS ? (preview as LaterPreview) : null;
}

export function AfterCallRoute({ callId }: { callId: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const preview = usePayoffPreview();
  const later = preview !== null && preview !== 'visitor' ? PREVIEWS[preview] : null;
  const sample = useMemo(() => later?.data() ?? null, [later]);
  const { call: liveCall, refresh } = useCall(preview ? '' : callId);
  const { progress: liveProgress, refresh: refreshProgress } = useProgress();
  const { updateProfile } = useProfile();
  const { calls: liveCalls } = useCalls();
  const { learner, species, stage, firstLanguage } = useLearner();
  const [phase, setPhase] = useState<Phase>(later?.phase ?? 'summary');
  const [feel, setFeel] = useState<Feel | null>(null);
  const call: CallRecord | null =
    preview === 'visitor' ? PREVIEW_CHAPTER_ONE : (sample?.call ?? liveCall);
  const progress: Progress | null = sample?.progress ?? liveProgress;
  const calls = sample?.calls ?? liveCalls;
  useSummaryPoll(preview ? PREVIEW_CHAPTER_ONE : call, refresh);

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

  const minute = useMemo(
    () =>
      call !== null && isMinuteCall(call) && !call.summaryPending
        ? buildMinuteCard({ call, progress, learner, firstLanguage }, t)
        : null,
    [call, progress, learner, firstLanguage, t],
  );

  const heard = preview === 'visitor' ? PREVIEW_HEARD : whatWasSaid(callId);
  const visitor = useMemo(
    () =>
      call !== null &&
      !isMinuteCall(call) &&
      isVisitorCall(call, preview === 'visitor' ? 'visitor' : later ? 'newcomer' : stage) &&
      !(call.summaryPending && (heard === null || heard.length === 0))
        ? buildVisitorAfterCall(
            {
              call,
              progress: preview === 'visitor' ? null : progress,
              learner,
              firstLanguage,
              heard,
            },
            t,
          )
        : null,
    [call, preview, later, stage, heard, progress, learner, firstLanguage, t],
  );

  const home = () => router.replace(PAYOFF_ROUTES.home);
  if (minute) return <MinuteScreen card={minute} species={species} onDone={home} />;

  if (visitor) {
    const onFeel = (next: Feel) => {
      setFeel(next);
      if (preview) return;
      if (next === 'slower') void updateProfile({ pace: 'slower' }).catch(() => undefined);
      // A Newcomer replaying a chapter becomes a Visitor; a Visitor is with Linh already.
      if (next === 'practise' && stage !== null && stage !== 'visitor')
        void stageRequests().request({ to: 'visitor', reason: 'too_hard' });
    };
    // A full ring may bring Linh's Newcomer card even before its keepsake is on the phone.
    const ringFull = progress !== null && call !== null && filledRing(progress.weeks, call.id);
    return (
      <VisitorAfterCallScreen
        model={visitor}
        stage={stage ?? 'visitor'}
        feel={feel}
        onFeel={onFeel}
        onContinue={() =>
          (visitor.keepsakes || ringFull) && !preview
            ? router.replace(PAYOFF_ROUTES.keepsake(callId))
            : home()
        }
      />
    );
  }

  const ready = model.state === 'ready' ? model : null;
  /** The moment after `from` that the call earned, or the keepsake, or home. */
  const advance = (from: Phase) => {
    if (!ready) return home();
    const order: readonly Celebration[] = ready.next;
    const after = from === 'summary' ? order : order.slice(order.indexOf(from) + 1);
    const next = after[0];
    if (next === undefined) return home();
    if (next === 'keepsake') {
      if (sample) return home();
      return router.replace(PAYOFF_ROUTES.keepsake(callId));
    }
    return setPhase(next);
  };

  if (ready && phase === 'bloom' && ready.blooms.length > 0)
    return <BloomScreen blooms={ready.blooms} species={species} onDone={() => advance('bloom')} />;
  if (ready && phase === 'graduation' && ready.graduation)
    return (
      <GraduationScreen
        graduation={ready.graduation}
        species={species}
        onDone={() => advance('graduation')}
      />
    );
  if (ready && phase === 'thenNow' && ready.thenNow) {
    const last = ready.next.at(-1) === 'thenNow';
    return (
      <ThenNowScreen
        view={ready.thenNow}
        species={species}
        cta={last ? t('payoff.afterCall.cta') : t('common.continue')}
        onContinue={() => advance('thenNow')}
      />
    );
  }
  return (
    <AfterCallScreen
      model={model}
      species={species}
      onContinue={() => advance('summary')}
      onBack={home}
    />
  );
}
