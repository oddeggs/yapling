import { colours } from '@yapling/theme';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useProfile, useProgress, useWeek } from '../../data';
import { previewModel, previewOptionsFrom } from '../burrow/preview';
import { BURROW_ROUTES } from '../burrow/routes';
import { weekModel, type WeekInput } from './model';
import { WeekScreen } from './week-screen';

/*
 * The week route, on the learner's profile and progress, on the day the app's clock says.
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
      installedOn: preview.installedOn,
      roommate: preview.input.roommate,
      firstLanguage: preview.input.firstLanguage,
      progress: preview.progress,
    };
    // `key` holds the params' content.
  }, [key]);
}

function useLiveInput(): WeekInput | null {
  const { profile } = useProfile();
  const { progress } = useProgress();
  const week = useWeek();
  return useMemo(
    () =>
      profile === null || progress === null || week === null
        ? null
        : {
            day: week.dayIndex,
            installedOn: progress.installedOn,
            roommate: profile.roommate,
            firstLanguage: profile.firstLanguage,
            progress: { ...progress, weeks: week.weeks },
          },
    [profile, progress, week],
  );
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
