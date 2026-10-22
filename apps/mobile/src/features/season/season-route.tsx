import { SEASON_1 } from '@yapling/story';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { useSeen } from '../../data';
import { BURROW_ROUTES, callRoute } from '../burrow/routes';
import { useStoryLearner } from '../story/learner';
import { replayOf, seasonMapModel, type SeasonPin } from './season-model';
import { SeasonScreen } from './season-screen';

/*
 * `/season`: the season map. "Tiếp tục" opens the next episode's call when it is ready, and goes
 * back to the burrow while it is still days away. A finished episode's pin offers it again, at the
 * learner's stage today. Development: `?day=N&after=1` reads the burrow's preview learner, and
 * `?week=N` (with `dow`, `missed`, `stage`) a learner later in the season.
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
        dayIndex: learner.day,
        startedOn: learner.startedOn,
      }),
    [learner],
  );
  const { markSeen } = useSeen();
  useEffect(() => void markSeen('season_map'), [markSeen]);
  const [pickedEpisode, setPickedEpisode] = useState<number | null>(null);
  const picked = model.pins.find((p) => p.episode === pickedEpisode && p.action === 'replay');
  const home = () => router.replace(BURROW_ROUTES.home);
  const onPin = (pin: SeasonPin) => {
    if (pin.action === 'replay') setPickedEpisode((e) => (e === pin.episode ? null : pin.episode));
    else if (pin.action === 'play') router.push(callRoute(pin.sceneId));
  };
  return (
    <>
      <SeasonScreen
        model={model}
        picked={picked ?? null}
        pickedFace={picked ? (SEASON_1.episodes[picked.episode - 1]?.cast[0] ?? 'pip') : null}
        onBack={() => (router.canGoBack() ? router.back() : home())}
        onContinue={() => {
          const next = model.next;
          if (next?.open) router.push(callRoute(next.sceneId));
          else home();
        }}
        onPin={onPin}
        onReplay={(pin) => {
          // The call takes the learner's stage today, whatever it was the first time.
          const replay = replayOf(pin, learner.stage);
          if (replay) router.push(callRoute(replay.sceneId));
        }}
      />
    </>
  );
}
