import type { CallRecord, FirstLanguage, Stage, WeekRing } from '@yapling/contracts';
import { localDateOf, localTimeOf, type TurnPass } from '@yapling/domain';
import { colours } from '@yapling/theme';
import { CAST } from '@yapling/story';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAppNow, useCalls, useProfile, useProgress } from '../../data';
import { track } from '../../observability';
import { useLocale, useToast } from '../../ui';
import { Face } from '../burrow/art';
import { stageRequests, usePendingStage } from '../me/stage-request';
import { earnedKeepsakes, keepsakeScreenCopy, type EarnedKeepsakes } from './keepsake-model';
import { KeepsakeScreen } from './keepsake-screen';
import type { PayoffLearner } from './model';
import { PREVIEW_LEARNER, PREVIEW_RING_FULL, PREVIEW_WEEK_TURNS } from './preview';
import { STAGE_UP_REQUESTS, stageUpOffer, stageUpView, type StageUpPhase } from './stage-up-model';
import { StageUpScreen } from './stage-up-screen';
import { useAnsweredStageUps } from './stage-up-store';

/*
 * The payoff screens on the app's data: the call's record (polled until its feedback lands),
 * progress after the call, the profile for the names, and earlier calls for the fluency trend.
 */

const href = (path: string): Href => path;

export const PAYOFF_ROUTES = {
  home: href('/(home)'),
  keepsake: (callId: string, step = 0) =>
    href(`/(home)/keepsake?callId=${encodeURIComponent(callId)}&step=${step}`),
  /** The week's wrap, on the last day of week `week` (the burrow routes here on day 7). */
  wrap: (week: number) => href(`/(home)/wrap?week=${week}`),
} as const;

/** How often to ask for a summary still being written: soon at first, then less often. */
const POLL_FIRST_MS = 1500;
const POLL_MAX_MS = 8000;

interface LearnerContext {
  readonly learner: PayoffLearner;
  readonly species: 'redpanda' | 'capybara' | 'cat';
  /** The stage, with a choice still waiting for the server counted; null before the profile. */
  readonly stage: Stage | null;
  readonly firstLanguage: FirstLanguage;
  readonly timezone: string | null;
}

export function useLearner(): LearnerContext {
  const { profile } = useProfile();
  const pending = usePendingStage();
  return useMemo(
    () => ({
      learner: {
        name: profile?.displayName ?? '',
        roommateName: profile?.roommate.name ?? CAST.pip.name,
      },
      species: profile?.roommate.species ?? 'redpanda',
      stage: pending?.request.to ?? profile?.stage ?? null,
      firstLanguage: profile?.firstLanguage ?? 'vi',
      timezone: profile?.timezone ?? null,
    }),
    [profile, pending],
  );
}

/** Development builds only: `?preview=visitor` or `?preview=stage-up` shows a sample learner. */
export function usePreview(kind: 'visitor' | 'stage-up'): boolean {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  return __DEV__ && preview === kind;
}

/**
 * How each learner turn of a ring's week passed (the turn log's pass kinds), from the counts on the
 * records of the calls that filled its slots. Null (Linh waits) until every one of those records is
 * on the phone; a call from before the counts were kept adds no turns.
 */
function weekTurnsFor(
  week: number,
  weeks: readonly WeekRing[],
  calls: readonly CallRecord[],
): readonly TurnPass[] | null {
  const ring = weeks.find((w) => w.week === week);
  if (!ring) return null;
  const records = ring.slots.flatMap((s) =>
    s.callRecordId === null ? [] : [calls.find((c) => c.id === s.callRecordId)],
  );
  if (records.some((r) => r === undefined)) return null;
  const kinds: readonly TurnPass[] = ['match', 'generous', 'skip', 'fallback'];
  return records.flatMap((r) =>
    r?.turnPasses
      ? kinds.flatMap((kind) => Array.from({ length: r.turnPasses?.[kind] ?? 0 }, () => kind))
      : [],
  );
}

/**
 * Asks the server again while the call's summary is still being written, backing off gently. The
 * screen shows only what the server has: nothing stands in for the feedback meanwhile.
 */
export function useSummaryPoll(call: CallRecord | null, refresh: () => Promise<unknown>) {
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

/** Linh's Newcomer card, when the call filled a ring and the week earned it. */
function useStageUp(callId: string, earned: EarnedKeepsakes | null, preview: boolean) {
  const { progress } = useProgress();
  const { stage, firstLanguage, timezone, learner } = useLearner();
  const { t } = useLocale();
  const answered = useAnsweredStageUps();
  const { calls } = useCalls();
  const now = useAppNow(timezone ?? undefined);
  const [phase, setPhase] = useState<StageUpPhase | 'done' | null>(null);
  const offer = useMemo(() => {
    if (preview)
      return stageUpOffer({
        call: { id: callId },
        stage: 'visitor',
        weeks: PREVIEW_RING_FULL.weeks,
        weekTurns: PREVIEW_WEEK_TURNS,
        answeredWeeks: [],
      });
    if (!progress || stage === null || answered.weeks === null) return null;
    const ring = earned?.ringFull?.week ?? null;
    return stageUpOffer({
      call: { id: callId },
      stage,
      weeks: progress.weeks,
      weekTurns: ring === null ? null : weekTurnsFor(ring, progress.weeks, calls),
      answeredWeeks: answered.weeks,
    });
  }, [preview, progress, stage, answered.weeks, earned, callId, calls]);
  // Offered once: an answer keeps the screen on its phase even after the stage moves.
  useEffect(() => {
    if (offer !== null && phase === null) {
      setPhase('offer');
      if (!preview) track('stage_up_offered', { week: offer.week });
    }
  }, [offer, phase, preview]);
  const zone = timezone ?? 'Asia/Ho_Chi_Minh';
  const view =
    phase === null || phase === 'done'
      ? null
      : stageUpView(
          {
            phase,
            week: offer?.week ?? 1,
            learnerName: preview ? PREVIEW_LEARNER : learner.name,
            firstLanguage,
            today: localDateOf(now, zone),
            hour: Number(localTimeOf(now, zone).slice(0, 2)),
          },
          t,
        );
  const answer = (choice: 'take' | 'stay') => {
    if (offer === null) return;
    setPhase(choice === 'take' ? 'taken' : 'stay');
    if (preview) return;
    track('stage_up_answered', { week: offer.week, accepted: choice === 'take' });
    answered.answer(offer.week);
    void stageRequests().request(STAGE_UP_REQUESTS[choice]);
  };
  return {
    view,
    /** Still deciding whether Linh comes (progress or the answered weeks loading). */
    deciding: !preview && (progress === null || answered.weeks === null),
    done: phase === 'done',
    take: () => answer('take'),
    stay: () => answer('stay'),
    finish: () => setPhase('done'),
  };
}

/**
 * The keepsake the call earned, drawn and hung; one after another when there are several. When a
 * Visitor's week earns it, Linh's Newcomer card comes first, in place of the week's keepsake.
 */
export function KeepsakeRoute({ callId, step }: { callId: string; step: number }) {
  const router = useRouter();
  const { t } = useLocale();
  const toast = useToast();
  const preview = usePreview('stage-up');
  const { progress: liveProgress, refresh } = useProgress();
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

  const progress = preview ? PREVIEW_RING_FULL : liveProgress;
  const earned = useMemo(
    () => (progress ? earnedKeepsakes({ id: callId }, progress, learner) : null),
    [progress, callId, learner],
  );
  const stageUp = useStageUp(callId, earned, preview);
  // After Linh's card, the week's own keepsake is left out: the card was the week's keepsake.
  const shown = useMemo(
    () =>
      earned && stageUp.done
        ? {
            ...earned,
            ringFull: null,
            certificates: earned.certificates.filter((c) => !c.id.startsWith('week-')),
          }
        : earned,
    [earned, stageUp.done],
  );
  const certificate = shown?.certificates[step] ?? null;
  const copy = shown ? keepsakeScreenCopy(shown, step, t) : null;

  const home = () => router.replace(PAYOFF_ROUTES.home);
  // Nothing to draw once progress is read again: there is no keepsake for this call.
  useEffect(() => {
    if (preview && stageUp.done) router.replace(PAYOFF_ROUTES.home);
    else if (
      !preview &&
      checked &&
      !stageUp.deciding &&
      stageUp.view === null &&
      certificate === null
    )
      router.replace(PAYOFF_ROUTES.home);
  }, [preview, checked, stageUp.deciding, stageUp.view, stageUp.done, certificate, router]);

  if (stageUp.view)
    return (
      <StageUpScreen
        view={stageUp.view}
        learnerName={preview ? PREVIEW_LEARNER : learner.name}
        species={species}
        onTake={stageUp.take}
        onStay={stageUp.stay}
        onDone={stageUp.finish}
      />
    );
  if (!certificate || !copy || !shown) return null;
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
    if (step + 1 < shown.certificates.length)
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
