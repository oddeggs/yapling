import type {
  FirstLanguage,
  Keepsake,
  LocalDate,
  PhraseProgress,
  Roommate,
  Stage,
  TimeZone,
  WeekRing,
} from '@yapling/contracts';
import { STAGES } from '@yapling/contracts';
import { addDays, DAY_MS, firstDayOfWeek, localDateOf, seasonRingWeeks } from '@yapling/domain';
import { useMemo } from 'react';

import { useProfile, useProgress, useWeek } from '../../data';
import { SEASON_WEEKS } from '../../data/season';
import { previewModel, previewOptionsFrom } from '../burrow/preview';

/*
 * The learner as the story and season screens need them: the roommate, the language, the stage,
 * their name, the story's days (counted from the story's start, as the week counts them) and the
 * progress (phrases, the weekly rings, keepsakes), from the app's data.
 *
 * Development only: a route given `?day=N` (and `after=1`) reads the burrow's preview learner, to
 * look at any day of the first week; `?week=N` (with `dow=D`, `missed=W`, `stage=visitor`) reads a
 * learner in week N who has played every episode before it but week W's.
 */

export interface StoryLearner {
  readonly roommate: Roommate;
  readonly firstLanguage: FirstLanguage;
  readonly stage: Stage;
  readonly timezone: TimeZone;
  /** The learner's own name, for the lines that say it. */
  readonly name: string | null;
  /** The install day, when known. */
  readonly installedOn: LocalDate | null;
  /** Today's story day (day 1 is the story's first day). */
  readonly day: number;
  /** The story's first day. */
  readonly startedOn: LocalDate;
  readonly phrases: readonly PhraseProgress[];
  readonly weeks: readonly WeekRing[];
  readonly keepsakes: readonly Keepsake[];
}

type Params = Readonly<Record<string, string | string[] | undefined>>;

const DEFAULT_ROOMMATE: Roommate = { species: 'redpanda', name: 'Pip' };
const PREVIEW_TIMEZONE: TimeZone = 'Asia/Ho_Chi_Minh';

const deviceZone = (): TimeZone => Intl.DateTimeFormat().resolvedOptions().timeZone;

const one = (params: Params, key: string): string | undefined => {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
};

/**
 * Development only: a learner on day `dow` of week `week` who played every episode before it,
 * except week `missed`'s (which waits), with no other calls done.
 */
export function laterWeekPreview(
  week: number,
  dow: number,
  missed: number | null,
  stage: Stage,
  now = Date.now(),
): StoryLearner {
  const day = firstDayOfWeek(week) + dow - 1;
  const today = localDateOf(now, PREVIEW_TIMEZONE);
  const startedOn = addDays(today, 1 - day);
  const opened = seasonRingWeeks([], day, SEASON_WEEKS);
  const doneAt = now - DAY_MS;
  const weeks = opened.map((ring): WeekRing =>
    ring.week < week && ring.week !== missed
      ? {
          ...ring,
          slots: ring.slots.map((s) =>
            s.kind === 'episode'
              ? { ...s, status: 'done', callRecordId: `preview-${ring.week}`, doneAt }
              : s,
          ),
        }
      : ring,
  );
  return {
    roommate: DEFAULT_ROOMMATE,
    firstLanguage: 'vi',
    stage,
    timezone: PREVIEW_TIMEZONE,
    name: 'Lan',
    installedOn: startedOn,
    day,
    startedOn,
    phrases: [],
    weeks,
    keepsakes: [],
  };
}

export function useStoryLearner(params: Params): StoryLearner {
  const later = __DEV__ && params['week'] !== undefined;
  const preview =
    __DEV__ && !later && params['day'] !== undefined ? previewOptionsFrom(params) : null;
  const previewKey = JSON.stringify(later ? params : preview);
  const { profile } = useProfile();
  const { progress } = useProgress();
  const week = useWeek();
  return useMemo(() => {
    if (later) {
      const stageParam = one(params, 'stage');
      const stage = (STAGES as readonly string[]).includes(stageParam ?? '')
        ? (stageParam as Stage)
        : 'newcomer';
      const missed = Number(one(params, 'missed'));
      return laterWeekPreview(
        Math.max(1, Number(one(params, 'week')) || 1),
        Math.min(7, Math.max(1, Number(one(params, 'dow')) || 1)),
        Number.isFinite(missed) && missed > 0 ? missed : null,
        stage,
      );
    }
    if (preview !== null) {
      const p = previewModel(preview.day, preview.options);
      return {
        roommate: p.input.roommate,
        firstLanguage: p.input.firstLanguage,
        stage: 'newcomer',
        timezone: PREVIEW_TIMEZONE,
        name: null,
        installedOn: p.installedOn,
        day: preview.day,
        startedOn: p.installedOn,
        phrases: p.progress.phrases,
        weeks: p.progress.weeks,
        keepsakes: p.progress.keepsakes,
      };
    }
    const timezone = profile?.timezone ?? deviceZone();
    const day = week?.dayIndex ?? progress?.dayIndex ?? 1;
    return {
      roommate: profile?.roommate ?? DEFAULT_ROOMMATE,
      firstLanguage: profile?.firstLanguage ?? 'vi',
      stage: profile?.stage ?? 'newcomer',
      timezone,
      name: profile?.displayName ?? null,
      installedOn: progress?.installedOn ?? null,
      day,
      startedOn:
        week?.startedOn ??
        profile?.storyStartedOn ??
        progress?.installedOn ??
        addDays(localDateOf(Date.now(), timezone), 1 - day),
      phrases: progress?.phrases ?? [],
      weeks: week?.weeks ?? progress?.weeks ?? [],
      keepsakes: progress?.keepsakes ?? [],
    };
    // `previewKey` holds the preview params' content.
  }, [previewKey, profile, progress, week]);
}
