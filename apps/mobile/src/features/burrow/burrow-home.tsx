import type { Profile, Progress } from '@yapling/contracts';
import { localTimeOf, type Welcome, type WeekOneUnlock } from '@yapling/domain';
import { CAST } from '@yapling/story';
import { colours } from '@yapling/theme';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  useAppNow,
  useLastOpen,
  useProfile,
  useProgress,
  useSeen,
  useWeek,
  type SeenMoment,
} from '../../data';
import { useReturnState, type ReturnState } from '../knocks';
import { BurrowHomeScreen } from './home-screen';
import { useLinePlayer } from './line-player';
import { burrowHomeModel, burrowVariant, type BurrowInput } from './model';
import { previewModel, previewOptionsFrom } from './preview';
import { BURROW_ROUTES } from './routes';
import { backModel, doorModel } from './scenes';
import { BackScreen, DoorScreen, type DoorPhase } from './talk-screens';

/*
 * The burrow route: picks the screen for this open (Linh's knock, coming back, or the home) and
 * maps the learner's data to its view model: the profile, progress, the day and hour on the app's
 * clock, the moments already seen on this phone, and the welcome for this open.
 *
 * Development: `?day=N&after=1&away=1&hour=H` (and `door=1`, `phase=`, `peek=1` for the scenes)
 * shows the preview learner on any day instead.
 */

type Params = Readonly<Record<string, string | string[] | undefined>>;

const one = (params: Params, key: string) => {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
};

const DOOR_PHASES: readonly DoorPhase[] = ['knock', 'welcome', 'reply', 'dusk'];

/** Linh's knock sounds this long before she speaks. */
const KNOCK_MS = 1_200;

/** The welcomes back already given, by the open they greeted (until the app's next open). */
const welcomed = new Set<number | null>();

const welcomeOf = (state: ReturnState): Welcome =>
  state.away
    ? { kind: 'back_after_away', daysAway: state.days, recapKey: state.recapKey }
    : { kind: 'normal', daysAway: state.days };

/**
 * Moments the learner's own progress shows they are past: a call already taken means they moved
 * in and met Linh, and Linh knocks only on the first evening.
 */
function impliedSeen(day: number, progress: Progress): WeekOneUnlock[] {
  const called = progress.weeks.some((w) => w.slots.some((s) => s.status === 'done'));
  return called || day >= 2 ? ['placement_chat', 'linh_welcome'] : [];
}

function liveInput(
  profile: Profile,
  progress: Progress,
  day: number,
  hour: number,
  seen: ReadonlySet<WeekOneUnlock>,
  welcome: Welcome,
): BurrowInput {
  return {
    day,
    hour,
    roommate: profile.roommate,
    learnerName: profile.displayName,
    firstLanguage: profile.firstLanguage,
    progress,
    seen: new Set([...seen, ...impliedSeen(day, progress)]),
    welcome,
  };
}

/** The learner's burrow input from the app's data; null while it loads. */
function useLiveInput(): BurrowInput | null {
  const { profile } = useProfile();
  const { progress } = useProgress();
  const week = useWeek();
  const seen = useSeen();
  const now = useAppNow(profile?.timezone);
  const returnState = useReturnState();
  const { previousAt } = useLastOpen();
  return useMemo(() => {
    if (profile === null || progress === null || week === null || !seen.loaded) return null;
    const hour = Number(localTimeOf(now, profile.timezone).slice(0, 2));
    const welcome = welcomed.has(previousAt) ? welcomeOf({ ...returnState, away: false }) : null;
    return liveInput(
      profile,
      progress,
      week.dayIndex,
      hour,
      seen.seen,
      welcome ?? welcomeOf(returnState),
    );
  }, [profile, progress, week, seen, now, returnState, previousAt]);
}

/** Development only: the preview learner the route's params ask for, or null. */
function usePreviewInput(params: Params): BurrowInput | null {
  const wanted = __DEV__ && one(params, 'day') !== undefined;
  const dev = wanted ? previewOptionsFrom(params) : null;
  const key = JSON.stringify(dev);
  return useMemo(() => {
    if (dev === null) return null;
    const hour = dev.options.hour ?? new Date().getHours();
    return previewModel(dev.day, { ...dev.options, hour }).input;
    // `key` holds the params' content.
  }, [key]);
}

export function BurrowHome() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const live = useLiveInput();
  const preview = usePreviewInput(params);
  const { markSeen } = useSeen();
  const { previousAt } = useLastOpen();
  // Scenes finished in this session, for the preview (the live ones are marked in the data).
  const [finished, setFinished] = useState<readonly WeekOneUnlock[]>([]);
  const base = preview ?? live;
  const input = useMemo<BurrowInput | null>(
    () =>
      base === null
        ? null
        : {
            ...base,
            seen: new Set([...base.seen, ...finished]),
            welcome: finished.includes('next_episode_peek')
              ? { kind: 'normal', daysAway: base.welcome.daysAway }
              : base.welcome,
          },
    [base, finished],
  );
  const finish = (moment: SeenMoment) => {
    setFinished((f) => [...f, moment]);
    if (moment === 'next_episode_peek') welcomed.add(previousAt);
    if (preview === null) void markSeen(moment);
  };
  const go = (to: Href) => router.push(to);
  const back = () => (router.canGoBack() ? router.back() : undefined);

  if (input === null) return <View style={{ flex: 1, backgroundColor: colours.background }} />;
  const variant = burrowVariant(input);
  if (variant === 'door') {
    const phase = one(params, 'phase') as DoorPhase | undefined;
    return (
      <LinhAtTheDoor
        input={input}
        devPhase={__DEV__ && phase && DOOR_PHASES.includes(phase) ? phase : null}
        onDone={() => finish('linh_welcome')}
        onBack={back}
      />
    );
  }
  if (variant === 'back')
    return (
      <ComingBack
        input={input}
        devPeek={__DEV__ && one(params, 'peek') === '1'}
        onDone={() => finish('next_episode_peek')}
        onBack={back}
      />
    );
  return (
    <BurrowHomeScreen
      model={burrowHomeModel(input)}
      onOpenMe={() => go(BURROW_ROUTES.me)}
      onOpenWeek={() => go(BURROW_ROUTES.week)}
      onNavigate={go}
    />
  );
}

/**
 * Linh knocks on the first evening: the knock, her recorded welcome with its caption, then the
 * café across the way at dusk with the letter slipping under its door, and goodnight.
 */
function LinhAtTheDoor({
  input,
  devPhase,
  onDone,
  onBack,
}: {
  input: BurrowInput;
  devPhase: DoorPhase | null;
  onDone: () => void;
  onBack: () => void;
}) {
  const model = useMemo(() => doorModel(input), [input]);
  const player = useLinePlayer();
  const [knocked, setKnocked] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setKnocked(true), KNOCK_MS);
    return () => clearTimeout(timer);
  }, []);
  const phase: DoorPhase =
    devPhase ?? (!knocked ? 'knock' : player.playback === 'ended' ? 'dusk' : 'welcome');
  const speaking = phase === 'welcome' && player.playback !== 'ended';
  return (
    <DoorScreen
      model={model}
      phase={phase}
      {...(player.playback === 'ended' ? {} : { lineSeconds: player.seconds })}
      onPlayLine={player.play}
      controls={{
        mic: speaking ? 'speaking' : 'idle',
        speaker: CAST.linh.name,
        sceneDone: phase === 'dusk',
        onDone,
        onBack,
      }}
    />
  );
}

/**
 * Coming back on day 8, or after days away: Pip's line (the recap, recorded, after days away),
 * then the next episode waiting where the learner left it, and back to the burrow.
 */
function ComingBack({
  input,
  devPeek,
  onDone,
  onBack,
}: {
  input: BurrowInput;
  devPeek: boolean;
  onDone: () => void;
  onBack: () => void;
}) {
  const model = useMemo(() => backModel(input), [input]);
  const player = useLinePlayer();
  const recorded = model.line.lineId !== null;
  const done = !recorded || player.playback === 'ended';
  return (
    <BackScreen
      model={model}
      showPeek={devPeek || model.peekFirst || done}
      {...(recorded && !done ? { lineSeconds: player.seconds } : {})}
      onPlayLine={player.play}
      controls={{
        mic: recorded && !done ? 'speaking' : 'idle',
        speaker: input.roommate.name,
        sceneDone: done,
        onDone,
        onBack,
      }}
    />
  );
}
