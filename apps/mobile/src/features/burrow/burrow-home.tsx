import type { Progress } from '@yapling/contracts';
import {
  settlingSceneId,
  type SettlingChapter,
  type Welcome,
  type WeekOneUnlock,
} from '@yapling/domain';
import { CAST } from '@yapling/story';
import { colours } from '@yapling/theme';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppNow, useLastOpen, useSeen, useSession, type SeenMoment } from '../../data';
import { useReturnState, type ReturnState } from '../knocks';
import { stepHref } from '../onboarding/routes';
import { useCardLog } from './card-log';
import { BurrowHomeScreen } from './home-screen';
import { useLinePlayer } from './line-player';
import { burrowHomeModel, burrowVariant, LATER_WEEKS_FROM_DAY, type BurrowInput } from './model';
import { pipsMinuteSceneOf } from './pips-minute';
import { previewModel, previewOptionsFrom, settlingPreviewFrom } from './preview';
import { BURROW_ROUTES, callRoute } from './routes';
import { backModel, doorModel } from './scenes';
import type { SettlingDay } from './settling';
import { SettlingList } from './settling-list';
import { useSettlingLive, type SettlingLive } from './settling-live';
import { settlingHomeModel, settlingListModel, type SettlingInput } from './settling-model';
import { SettlingScreen } from './settling-screen';
import { devSeedSettling } from './settling-store';
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
 * in and met Linh, and Linh knocks only on the first evening. A learner who settled in with Linh
 * met her in Chapter 1, so she doesn't knock again.
 */
function impliedSeen(day: number, progress: Progress, visitorPath: boolean): WeekOneUnlock[] {
  const called = progress.weeks.some((w) => w.slots.some((s) => s.status === 'done'));
  return called || day >= 2 || visitorPath ? ['placement_chat', 'linh_welcome'] : [];
}

/** The learner's burrow input from the app's data, on the story's day; null while it loads. */
function useLiveInput(
  live: SettlingLive | null,
  previousCard: string | null | undefined,
): BurrowInput | null {
  const seen = useSeen();
  const returnState = useReturnState();
  const { previousAt } = useLastOpen();
  const now = useAppNow(live?.profile.timezone);
  return useMemo(() => {
    if (live === null || !seen.loaded || previousCard === undefined) return null;
    const { profile, progress, clock } = live;
    const welcome = welcomed.has(previousAt) ? welcomeOf({ ...returnState, away: false }) : null;
    const later = clock.storyDay >= LATER_WEEKS_FROM_DAY;
    return {
      day: clock.storyDay,
      hour: live.hour,
      roommate: profile.roommate,
      learnerName: profile.displayName,
      firstLanguage: profile.firstLanguage,
      progress,
      seen: new Set([...seen.seen, ...impliedSeen(clock.storyDay, progress, live.visitorPath)]),
      welcome: welcome ?? welcomeOf(returnState),
      settledIn: live.visitorPath && live.day.letterOn !== null,
      startedOn: clock.startedOn,
      scenes: seen.scenes,
      pipsMinute: later
        ? pipsMinuteSceneOf({
            phrases: progress.phrases,
            now,
            timezone: profile.timezone,
            day: clock.storyDay,
            stage: profile.stage,
          })
        : null,
      previousCard,
    };
  }, [live, seen, returnState, previousAt, now, previousCard]);
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

/** Development only: a Visitor settling in, as the route's params ask (`?settle=N`), or null. */
function useSettlingPreview(params: Params): SettlingInput | null {
  const key = JSON.stringify(params);
  // `key` holds the params' content.
  return useMemo(() => (__DEV__ ? settlingPreviewFrom(params) : null), [key]);
}

/** Settling in on the learner's data: their chapters, the day's rest and goodnight. */
function liveSettling(live: SettlingLive): SettlingInput {
  return {
    roommate: live.profile.roommate,
    firstLanguage: live.profile.firstLanguage,
    hour: live.hour,
    installDay: live.clock.installDay,
    day: live.day,
  };
}

export function BurrowHome() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const settling = useSettlingLive();
  const session = useSession();
  const userId = session.session?.userId ?? null;
  const today = settling?.day.today ?? null;
  const cards = useCardLog(userId, today);
  const live = useLiveInput(settling, cards.previous);
  const preview = usePreviewInput(params);
  const settlingPreview = useSettlingPreview(params);
  // Development only: `?visitor=1&chapters=N` starts the live learner with Linh, chapters done.
  const seedKey = __DEV__
    ? `${one(params, 'visitor') ?? ''}:${one(params, 'chapters') ?? ''}`
    : ':';
  useEffect(() => {
    if (seedKey === ':' || userId === null || today === null) return;
    const [visitor, chapters] = seedKey.split(':');
    void devSeedSettling(userId, {
      visitor: visitor === '1',
      upTo: Number(chapters) || 0,
      today,
    });
  }, [seedKey, userId, today]);
  // The Settling-in list, opened from the card, or by a link (`?settling=1`, the Me sheet's).
  // A new link decides afresh: open with `settling=1`, closed without.
  const linkKey = JSON.stringify(params);
  const [listOpen, setListOpen] = useState(one(params, 'settling') === '1');
  useEffect(() => {
    setListOpen(one(params, 'settling') === '1');
    // `linkKey` holds the params' content.
  }, [linkKey]);
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

  const playChapter = (chapter: SettlingChapter) => {
    setListOpen(false);
    go(callRoute(settlingSceneId(chapter)));
  };

  // Settling in: the preview's Visitor, or a learner before the story (or on the letter's day).
  const settlingInput =
    settlingPreview ??
    (preview === null && settling !== null && settling.clock.phase !== 'story'
      ? liveSettling(settling)
      : null);
  const list = (day: Pick<SettlingDay, 'chapters' | 'letterOn'>) =>
    listOpen ? (
      <SettlingList
        model={settlingListModel(day)}
        onClose={() => setListOpen(false)}
        onPlay={playChapter}
        onSkip={() => {
          setListOpen(false);
          if (settlingPreview === null) settling?.skipToStory();
        }}
      />
    ) : null;
  if (settlingInput !== null) {
    return (
      <SettlingScreen
        model={settlingHomeModel(settlingInput)}
        onOpenMe={() => go(BURROW_ROUTES.me)}
        onOpenList={() => setListOpen(true)}
        onStartChapter={playChapter}
        onRest={() => settling?.rest()}
        onGoodnight={() => settling?.goodnight()}
        list={list(settlingInput.day)}
      />
    );
  }

  // No learner on this phone any more (the test menu's reset): the first run again. Straight to
  // its first step: "/" is this screen's own path too (the home group's index), so redirecting
  // there sent the burrow to itself, over and over.
  if (input === null && (session.status === 'signed_out' || session.status === 'awaiting_age'))
    return <Redirect href={stepHref('language')} />;
  if (input === null) return <View style={{ flex: 1, backgroundColor: colours.background }} />;
  // In the story, the Settling-in list still opens from a link, to replay a chapter.
  const storyList = settling !== null && preview === null ? list(settling.day) : null;
  const withList = (screen: ReactNode) =>
    storyList === null ? (
      screen
    ) : (
      <View style={StyleSheet.absoluteFill}>
        {screen}
        {storyList}
      </View>
    );
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
  return withList(
    <BurrowHomeScreen
      model={burrowHomeModel(input)}
      {...(preview === null ? { onShown: cards.shown } : {})}
      onOpenMe={() => go(BURROW_ROUTES.me)}
      onOpenWeek={() => go(BURROW_ROUTES.week)}
      onNavigate={go}
    />,
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
