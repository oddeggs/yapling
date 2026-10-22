import type { Profile, Progress, SettlingChapterDone } from '@yapling/contracts';
import { localDateOf, localTimeOf } from '@yapling/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useAppNow, useCalls, useProfile, useProgress, useSession } from '../../data';
import {
  chaptersFromCalls,
  letterDayOf,
  mergeChapters,
  storyClockOf,
  type SettlingDay,
  type StoryClock,
} from './settling';
import { settlingStore, useLocalSettling, type LocalSettling } from './settling-store';

/*
 * Settling in on the learner's data. The chapters done come from the server's progress, this
 * phone's copy and the call records (a Settling-in call that ended complete), in that order of
 * trust; the story's start from the profile, else this phone's copy, else Chapter 6's day. Both
 * are written back: the phone's copy at once, the server's progress and profile once per change,
 * so a server that doesn't keep them yet loses nothing, and one that does gets them.
 */

export interface SettlingLive {
  readonly profile: Profile;
  readonly progress: Progress;
  readonly clock: StoryClock;
  readonly visitorPath: boolean;
  readonly day: SettlingDay;
  readonly hour: number;
  /** "Tomorrow" after two chapters today. */
  readonly rest: () => void;
  /** "Good night" to the letter. */
  readonly goodnight: () => void;
  /** "Start the story" on the list: the letter comes this evening. */
  readonly skipToStory: () => void;
}

/** Changes already sent to the server in this run of the app, so each is sent once. */
const sent = new Set<string>();

const sameChapters = (a: readonly SettlingChapterDone[], b: readonly SettlingChapterDone[]) =>
  a.length === b.length && a.every((d) => b.some((e) => e.chapter === d.chapter));

export function useSettlingLive(): SettlingLive | null {
  const { profile, updateProfile } = useProfile();
  const { progress, updateProgress, refresh: refreshProgress } = useProgress();
  const { calls, refresh: refreshCalls } = useCalls();
  const session = useSession();
  const userId = session.session?.userId ?? null;
  const local = useLocalSettling();
  const timezone = profile?.timezone;
  const now = useAppNow(timezone);

  // Back from a call: its record (and the server's progress) may have a chapter the burrow lacks.
  // The refreshes change identity as their stores change, so the focus effect reads them by ref.
  const refreshes = useRef({ refreshCalls, refreshProgress });
  refreshes.current = { refreshCalls, refreshProgress };
  useFocusEffect(
    useCallback(() => {
      void refreshes.current.refreshCalls().catch(() => undefined);
      void refreshes.current.refreshProgress().catch(() => undefined);
    }, []),
  );

  useEffect(() => {
    if (userId !== null) void settlingStore.load(userId);
  }, [userId]);

  const mine: LocalSettling | null = local.loaded && local.userId === userId ? local.value : null;

  const live = useMemo(() => {
    if (profile === null || progress === null || mine === null || timezone === undefined)
      return null;
    // The test menu's clock may run ahead: a call's day is read on the app's clock.
    const offset = now - Date.now();
    const fromCalls = chaptersFromCalls(calls, (at) => localDateOf(at + offset, timezone));
    const chapters = mergeChapters(progress.settlingChaptersDone, mine.chapters, fromCalls);
    const storyStartedOn = profile.storyStartedOn ?? mine.storyStartedOn;
    const visitorPath =
      profile.startPath === 'visitor' || profile.stage === 'visitor' || mine.visitor;
    const letterOn = visitorPath ? letterDayOf(chapters, storyStartedOn) : storyStartedOn;
    const today = localDateOf(now, timezone);
    const clock = storyClockOf({ installedOn: progress.installedOn, today, letterOn, visitorPath });
    const day: SettlingDay = {
      chapters,
      today,
      letterOn,
      restedOn: mine.restedOn,
      goodnightOn: mine.goodnightOn,
    };
    const hour = Number(localTimeOf(now, timezone).slice(0, 2));
    return { clock, visitorPath, day, hour };
  }, [profile, progress, mine, calls, now, timezone]);

  // Keep the phone's copy, and send the server what it lacks.
  useEffect(() => {
    if (live === null || userId === null || mine === null || profile === null || progress === null)
      return;
    const { chapters, letterOn } = live.day;
    const kept: LocalSettling = {
      ...mine,
      chapters: mergeChapters(mine.chapters, chapters),
      storyStartedOn: mine.storyStartedOn ?? (live.visitorPath ? letterOn : null),
    };
    if (JSON.stringify(kept) !== JSON.stringify(mine)) {
      void settlingStore.update(userId, (s) => ({
        ...s,
        chapters: mergeChapters(s.chapters, kept.chapters),
        storyStartedOn: s.storyStartedOn ?? kept.storyStartedOn,
      }));
    }
    const progressKey = `progress:${userId}:${chapters.map((c) => c.chapter).join(',')}`;
    if (!sameChapters(progress.settlingChaptersDone, chapters) && !sent.has(progressKey)) {
      sent.add(progressKey);
      void updateProgress((p) => ({
        ...p,
        settlingChaptersDone: mergeChapters(p.settlingChaptersDone, chapters),
      })).catch(() => sent.delete(progressKey));
    }
    const profileKey = `profile:${userId}:${letterOn ?? ''}`;
    if (
      live.visitorPath &&
      letterOn !== null &&
      profile.storyStartedOn === null &&
      !sent.has(profileKey)
    ) {
      sent.add(profileKey);
      void updateProfile({ storyStartedOn: letterOn }).catch(() => sent.delete(profileKey));
    }
  }, [live, userId, mine, profile, progress, updateProgress, updateProfile]);

  return useMemo(() => {
    if (live === null || profile === null || progress === null || userId === null) return null;
    const today = live.day.today;
    return {
      profile,
      progress,
      ...live,
      rest: () => void settlingStore.update(userId, (s) => ({ ...s, restedOn: today })),
      goodnight: () => void settlingStore.update(userId, (s) => ({ ...s, goodnightOn: today })),
      skipToStory: () =>
        void settlingStore.update(userId, (s) => ({
          ...s,
          storyStartedOn: s.storyStartedOn ?? today,
        })),
    };
  }, [live, profile, progress, userId]);
}
