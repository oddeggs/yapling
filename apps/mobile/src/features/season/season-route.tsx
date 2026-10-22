import { SEASON_1 } from '@yapling/story';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { useSeen } from '../../data';
import { BURROW_ROUTES, callRoute } from '../burrow/routes';
import { useStoryLearner } from '../story/learner';
import { seasonMapModel } from './season-model';
import { SeasonScreen } from './season-screen';

/*
 * `/season`: the season map. "Tiếp tục" opens the next episode's call when it is ready, and goes
 * back to the burrow while it is still days away. Development: `?day=N&after=1` reads the
 * burrow's preview learner.
 */
export function SeasonRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const learner = useStoryLearner(params);
  const model = useMemo(
    () =>
      seasonMapModel({
        season: SEASON_1,
        weeks: learner.weeks,
        day: learner.day,
        installedOn: learner.installedOn,
      }),
    [learner],
  );
  const { markSeen } = useSeen();
  useEffect(() => void markSeen('season_map'), [markSeen]);
  const home = () => router.replace(BURROW_ROUTES.home);
  return (
    <>
      <SeasonScreen
        model={model}
        onBack={() => (router.canGoBack() ? router.back() : home())}
        onContinue={() => {
          const next = model.next;
          if (next?.open) router.push(callRoute(next.id));
          else home();
        }}
      />
    </>
  );
}
