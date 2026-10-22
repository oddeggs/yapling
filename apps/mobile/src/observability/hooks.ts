import type { CallKind } from '@yapling/contracts';
import { dayIndexOf } from '@yapling/domain';
import { useEffect, useRef } from 'react';

import { appData, useAppNow, useProfile, useProgress, useSession } from '../data';
import { deviceTimeZone } from '../data/week';
import { useOnboarding } from '../features/onboarding/use-onboarding';
import { callEventsBetween, type CallSnapshot } from './call-events';
import type { AnalyticsEvent, AnalyticsEvents } from './events';
import { reachedSteps } from './funnel';
import { analytics, track } from './runtime';

/*
 * The hooks that feed analytics from the app: the learner's identity and funnel (mounted once at
 * the root), a screen seen, and a call's life. All of them do nothing without a PostHog key.
 */

/** The learner's identity and the first-week funnel, from the app's data. Mounted once. */
export function useAppAnalytics(): void {
  const userId = useSession().session?.userId ?? null;
  const { profile } = useProfile();
  const { progress } = useProgress();
  const [onboardingStep] = useOnboarding((s) => s.step);
  const timezone = profile?.timezone ?? deviceTimeZone();
  const now = useAppNow(timezone);

  useEffect(() => {
    if (userId !== null) analytics().identify(userId);
  }, [userId]);

  const dayIndex = progress === null ? null : dayIndexOf(progress.installedOn, now, timezone);
  const reached = reachedSteps({ onboardingStep, progress, dayIndex });
  const latest = useRef(reached);
  latest.current = reached;
  const key = reached.join(',');
  useEffect(() => {
    analytics().reachFunnel(latest.current);
  }, [key]);
}

/** Sends an event once, when the screen first shows. */
export function useTrackOnce<E extends AnalyticsEvent>(
  event: E,
  properties: AnalyticsEvents[E],
): void {
  const sent = useRef(false);
  const latest = useRef(properties);
  latest.current = properties;
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, latest.current);
  }, [event]);
}

/**
 * A call's analytics from the call screen's state: answered, each problem the learner met, and
 * the end with the call record's talk time.
 */
export function useCallAnalytics(
  kind: CallKind,
  sceneId: string,
  snapshot: CallSnapshot & {
    readonly callRecordId: string | null;
  },
): void {
  const prev = useRef<CallSnapshot | null>(null);
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    if (!analytics().enabled) return;
    const base = { kind, scene_id: sceneId };
    for (const event of callEventsBetween(prev.current, snapshot, startedAt.current !== null)) {
      if (event.type === 'started') {
        startedAt.current = Date.now();
        track('call_started', base);
      } else if (event.type === 'problem') {
        track('call_error', { ...base, problem: event.problem, code: event.code });
      } else {
        void sendEnded(base, event.reason, startedAt.current, snapshot.callRecordId);
      }
    }
    prev.current = snapshot;
  });
}

async function sendEnded(
  base: { readonly kind: CallKind; readonly scene_id: string },
  reason: AnalyticsEvents['call_ended']['ended_reason'],
  startedAt: number | null,
  callRecordId: string | null,
): Promise<void> {
  const measured = startedAt === null ? 0 : Math.round((Date.now() - startedAt) / 1_000);
  let record = null;
  if (callRecordId !== null) {
    try {
      record = await appData().api.getCall(callRecordId);
    } catch {
      record = null;
    }
  }
  track('call_ended', {
    ...base,
    ended_reason: reason,
    duration_seconds:
      record === null ? measured : Math.round((record.endedAt - record.startedAt) / 1_000),
    learner_seconds: record?.learnerSeconds ?? null,
    character_seconds: record?.characterSeconds ?? null,
  });
}
