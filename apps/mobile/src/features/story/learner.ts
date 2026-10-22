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
import { useMemo } from 'react';

import { useProfile, useProgress, useWeek } from '../../data';
import { previewModel, previewOptionsFrom } from '../burrow/preview';

/*
 * The learner as the story and season screens need them: the roommate, the language, the stage,
 * and the progress (phrases, the weekly rings, keepsakes), from the app's data. In development a
 * route given `?day=N` (and `after=1`) reads the burrow's preview learner instead, to look at any
 * day of the first week.
 */

export interface StoryLearner {
  readonly roommate: Roommate;
  readonly firstLanguage: FirstLanguage;
  readonly stage: Stage;
  readonly timezone: TimeZone;
  /** The install day, when known. */
  readonly installedOn: LocalDate | null;
  readonly day: number;
  readonly phrases: readonly PhraseProgress[];
  readonly weeks: readonly WeekRing[];
  readonly keepsakes: readonly Keepsake[];
}

type Params = Readonly<Record<string, string | string[] | undefined>>;

const DEFAULT_ROOMMATE: Roommate = { species: 'redpanda', name: 'Pip' };
const PREVIEW_TIMEZONE: TimeZone = 'Asia/Ho_Chi_Minh';

const deviceZone = (): TimeZone => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useStoryLearner(params: Params): StoryLearner {
  const preview = __DEV__ && params['day'] !== undefined ? previewOptionsFrom(params) : null;
  const previewKey = JSON.stringify(preview);
  const { profile } = useProfile();
  const { progress } = useProgress();
  const week = useWeek();
  return useMemo(() => {
    if (preview !== null) {
      const p = previewModel(preview.day, preview.options);
      return {
        roommate: p.input.roommate,
        firstLanguage: p.input.firstLanguage,
        stage: 'newcomer',
        timezone: PREVIEW_TIMEZONE,
        installedOn: p.installedOn,
        day: preview.day,
        phrases: p.progress.phrases,
        weeks: p.progress.weeks,
        keepsakes: p.progress.keepsakes,
      };
    }
    return {
      roommate: profile?.roommate ?? DEFAULT_ROOMMATE,
      firstLanguage: profile?.firstLanguage ?? 'vi',
      stage: profile?.stage ?? 'newcomer',
      timezone: profile?.timezone ?? deviceZone(),
      installedOn: progress?.installedOn ?? null,
      day: week?.dayIndex ?? progress?.dayIndex ?? 1,
      phrases: progress?.phrases ?? [],
      weeks: week?.weeks ?? progress?.weeks ?? [],
      keepsakes: progress?.keepsakes ?? [],
    };
    // `previewKey` holds the preview params' content.
  }, [previewKey, profile, progress, week]);
}
