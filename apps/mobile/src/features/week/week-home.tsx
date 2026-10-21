import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';

import { BurrowArtProvider } from '../burrow/art-fonts';
import { previewModel, previewOptionsFrom } from '../burrow/preview';
import { BURROW_ROUTES } from '../burrow/routes';
import { weekModel, type WeekInput } from './model';
import { WeekScreen } from './week-screen';

/*
 * The week route. Until the app's data hooks land (profile, progress), it reads `previewModel`:
 * in development `?day=N&after=1` picks the day of the first week.
 */

function useWeekInput(params: Readonly<Record<string, string | string[] | undefined>>): WeekInput {
  const dev = __DEV__ ? previewOptionsFrom(params) : { day: 2, options: {} };
  const key = JSON.stringify(dev);
  return useMemo(() => {
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

export function WeekHome() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const input = useWeekInput(params);
  const model = useMemo(() => weekModel(input), [input]);
  return (
    <BurrowArtProvider>
      <WeekScreen
        model={model}
        onBack={() => (router.canGoBack() ? router.back() : router.replace(BURROW_ROUTES.home))}
        onNavigate={(to: Href) => router.push(to)}
      />
    </BurrowArtProvider>
  );
}
