import { ringWeeks } from '@yapling/domain';
import { colours } from '@yapling/theme';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { previewModel, previewOptionsFrom } from '../burrow/preview';
import { BURROW_ROUTES } from '../burrow/routes';
import { useSettlingLive } from '../burrow/settling-live';
import { weekModel, type WeekInput } from './model';
import { WeekScreen } from './week-screen';

/*
 * The week route, on the learner's profile and progress, on the story's day the app's clock says
 * (week 1 starts the day the story does: for a Visitor, the letter's day after Settling in).
 * Development: `?day=N&after=1` shows the preview learner on any day of the first week instead.
 */

type Params = Readonly<Record<string, string | string[] | undefined>>;

function usePreviewInput(params: Params): WeekInput | null {
  const dev = __DEV__ && params['day'] !== undefined ? previewOptionsFrom(params) : null;
  const key = JSON.stringify(dev);
  return useMemo(() => {
    if (dev === null) return null;
    const preview = previewModel(dev.day, dev.options);
    return {
      day: dev.day,
      startedOn: preview.installedOn,
      roommate: preview.input.roommate,
      firstLanguage: preview.input.firstLanguage,
      progress: preview.progress,
    };
    // `key` holds the params' content.
  }, [key]);
}

/** The week on the story's clock: its days count from the letter's day, not the install day. */
function useLiveInput(): WeekInput | null {
  const live = useSettlingLive();
  return useMemo(() => {
    if (live === null) return null;
    const { profile, progress, clock } = live;
    return {
      day: clock.storyDay,
      startedOn: clock.startedOn,
      roommate: profile.roommate,
      firstLanguage: profile.firstLanguage,
      progress: { ...progress, weeks: ringWeeks(progress.weeks, clock.storyDay) },
    };
  }, [live]);
}

export function WeekHome() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const preview = usePreviewInput(params);
  const live = useLiveInput();
  const input = preview ?? live;
  const model = useMemo(() => (input === null ? null : weekModel(input)), [input]);
  if (model === null) return <View style={{ flex: 1, backgroundColor: colours.background }} />;
  return (
    <WeekScreen
      model={model}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(BURROW_ROUTES.home))}
      onNavigate={(to: Href) => router.push(to)}
    />
  );
}
