import type { CallKind, CallRecord } from '@yapling/contracts';
import { dayIndexOf } from '@yapling/domain';
import { useEffect, useRef } from 'react';

import { appData, useAppNow, useProfile, useProgress, useSession } from '../data';
import { deviceTimeZone } from '../data/week';
import { isVisitorPath, storyDayOneOf } from '../features/knocks/settling';
import { useOnboarding } from '../features/onboarding/use-onboarding';
import {
  callPropertiesOf,
  chapterEndedOf,
  chapterStartedOf,
  pathChosenOf,
  placementResultOf,
} from './beginner-events';
import { callEventsBetween, type CallSnapshot } from './call-events';
import type { AnalyticsEvent, AnalyticsEvents, CallProperties } from './events';
import { reachedSteps } from './funnel';
import { analytics, identifyLearner, track } from './runtime';

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
    if (userId !== null) identifyLearner(userId);
  }, [userId]);

  // The level question's answer, once the profile carries it.
  const path = pathChosenOf(profile);
  useEffect(() => {
    if (path !== null) analytics().trackOnce('path_chosen', path);
  }, [path?.path]);

  // Day 8 of the story: week 1's days count from the letter's day for a Visitor (none yet while
  // settling in).
  const dayOne =
    progress === null || profile === null
      ? null
      : storyDayOneOf(
          {
            visitorPath: isVisitorPath(profile),
            chapters: progress.settlingChaptersDone,
            storyStartedOn: profile.storyStartedOn,
          },
          progress.installedOn,
        );
  const dayIndex = dayOne === null ? null : dayIndexOf(dayOne, now, timezone);
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
 * A call's analytics from the call screen's state: answered, each problem the learner met, a turn
 * mode switch, and the end with the call record's talk time. A Settling-in call is also a
 * chapter's start and end; the placement call's end reads the stage it left.
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
  const chapter = useRef<AnalyticsEvents['chapter_started'] | null>(null);
  useEffect(() => {
    if (!analytics().enabled) return;
    const base = callPropertiesOf(kind, sceneId, snapshot.turnMode);
    for (const event of callEventsBetween(prev.current, snapshot, startedAt.current !== null)) {
      if (event.type === 'started') {
        startedAt.current = Date.now();
        track('call_started', base);
        const done = appData().progress.resource.data?.settlingChaptersDone ?? [];
        chapter.current = chapterStartedOf(base, done);
        if (chapter.current !== null) track('chapter_started', chapter.current);
      } else if (event.type === 'problem') {
        track('call_error', { ...base, problem: event.problem, code: event.code });
      } else if (event.type === 'turn_mode') {
        track('turn_mode_switched', { ...base, to: event.to });
      } else {
        void sendEnded(
          base,
          event.reason,
          startedAt.current,
          snapshot.callRecordId,
          chapter.current,
        );
      }
    }
    prev.current = snapshot;
  });
}

async function readRecord(callRecordId: string | null): Promise<CallRecord | null> {
  if (callRecordId === null) return null;
  try {
    return await appData().api.getCall(callRecordId);
  } catch {
    return null;
  }
}

async function sendEnded(
  base: CallProperties,
  reason: AnalyticsEvents['call_ended']['ended_reason'],
  startedAt: number | null,
  callRecordId: string | null,
  chapter: AnalyticsEvents['chapter_started'] | null,
): Promise<void> {
  const measured = startedAt === null ? 0 : Math.round((Date.now() - startedAt) / 1_000);
  const record = await readRecord(callRecordId);
  track('call_ended', {
    ...base,
    ended_reason: reason,
    duration_seconds:
      record === null ? measured : Math.round((record.endedAt - record.startedAt) / 1_000),
    learner_seconds: record?.learnerSeconds ?? null,
    character_seconds: record?.characterSeconds ?? null,
  });
  if (chapter !== null) {
    track('chapter_ended', chapterEndedOf(chapter, { reason, measuredSeconds: measured, record }));
  }
  // The server sets the stage when the placement call ends: read the profile it left.
  if (base.kind === 'placement' && reason === 'scene_complete') {
    const profile = await appData()
      .profile.refresh()
      .catch(() => null);
    if (profile !== null) analytics().trackOnce('placement_result', placementResultOf(profile));
  }
}
