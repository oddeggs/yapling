import type { WeekOneUnlock } from '@yapling/domain';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';

import { BurrowArtProvider } from './art-fonts';
import { BurrowHomeScreen } from './home-screen';
import { burrowHomeModel, burrowVariant, type BurrowInput } from './model';
import { previewModel, previewOptionsFrom } from './preview';
import { BURROW_ROUTES } from './routes';
import { backModel, doorModel } from './scenes';
import { BackScreen, DoorScreen, type DoorPhase } from './talk-screens';

/*
 * The burrow route: picks the screen for this open (Linh's knock, coming back, or the home) and
 * maps the learner's data to its view model.
 *
 * The app's data hooks (profile, progress, what has been seen, the welcome) are being built in
 * parallel; until they land this container reads `previewModel`, a learner who has done the
 * whole first week up to a day. In development the route takes `?day=N&after=1&away=1&hour=H`
 * (and `door=1`, `phase=`, `peek=1` for the scenes) to look at any day.
 */

type Params = Readonly<Record<string, string | string[] | undefined>>;

const one = (params: Params, key: string) => {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
};

const DOOR_PHASES: readonly DoorPhase[] = ['knock', 'welcome', 'reply', 'dusk'];

/** The learner's burrow input: the preview until the data hooks are wired in. */
function useBurrowInput(params: Params): BurrowInput {
  const dev = __DEV__ ? previewOptionsFrom(params) : { day: 1, options: {} };
  const key = JSON.stringify(dev);
  return useMemo(() => {
    const hour = dev.options.hour ?? new Date().getHours();
    return previewModel(dev.day, { ...dev.options, hour }).input;
    // `key` holds the params' content.
  }, [key]);
}

export function BurrowHome() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const base = useBurrowInput(params);
  // Scenes the learner finishes in this session (the data layer will remember them).
  const [finished, setFinished] = useState<readonly WeekOneUnlock[]>([]);
  const input = useMemo<BurrowInput>(
    () => ({
      ...base,
      seen: new Set([...base.seen, ...finished]),
      welcome: finished.includes('next_episode_peek')
        ? { kind: 'normal', daysAway: 0 }
        : base.welcome,
    }),
    [base, finished],
  );
  const finish = (u: WeekOneUnlock) => setFinished((f) => [...f, u]);
  const go = (to: Href) => router.push(to);
  const back = () => (router.canGoBack() ? router.back() : undefined);

  const variant = burrowVariant(input);
  let screen;
  if (variant === 'door') {
    const phase = one(params, 'phase') as DoorPhase | undefined;
    screen = (
      <DoorScreen
        model={doorModel(input)}
        phase={__DEV__ && phase && DOOR_PHASES.includes(phase) ? phase : 'reply'}
        controls={{
          mic: 'yourTurn',
          onDone: () => finish('linh_welcome'),
          onBack: back,
        }}
      />
    );
  } else if (variant === 'back') {
    screen = (
      <BackScreen
        model={backModel(input)}
        {...(__DEV__ && one(params, 'peek') === '1' ? { showPeek: true } : {})}
        controls={{
          mic: 'yourTurn',
          onDone: () => finish('next_episode_peek'),
          onBack: back,
        }}
      />
    );
  } else {
    screen = (
      <BurrowHomeScreen
        model={burrowHomeModel(input)}
        onOpenMe={() => go(BURROW_ROUTES.me)}
        onOpenWeek={() => go(BURROW_ROUTES.week)}
        onNavigate={go}
      />
    );
  }
  return <BurrowArtProvider>{screen}</BurrowArtProvider>;
}
