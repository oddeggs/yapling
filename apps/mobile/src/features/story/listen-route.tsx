import { findPhrase, findScene, type Scene } from '@yapling/story';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { BURROW_ROUTES } from '../burrow/routes';
import { useAppNow, useProgress, useSeen } from '../../data';
import { useLocale } from '../../ui';
import { useStoryLearner } from './learner';
import { glossRevealFor, isFirstWeekScene, isRecapId, mailboxPlan } from './listening';
import { listenPlan } from './plan';
import { momentsOfScenes } from './moments';
import { MailboxRoute, RecapRoute } from './mailbox-route';
import { one, postmarkDay, useLeave, type Params } from './route-helpers';
import { WeekListenScreen } from './week-listen-screen';
import { phraseForSeed } from './seeds';
import type { SeedEvent } from './story-model';
import { StoryScreen } from './story-screen';
import { useVoicemailCall } from './voicemail-call';
import { growthOfFix } from './voicemail-model';
import { VoicemailScreen } from './voicemail-screen';
import { now as appNow } from '../devmenu';

/*
 * `/listen/<sceneId>`: a scene with nothing to fail. Pip's story and the postcards that come with
 * it play on the phone; a voicemail with a phrase to fix opens a short live turn, and one that is
 * only a message plays as a postcard in the mailbox, then the episode's closing card.
 * `/listen/<episode>.recap` is Pip's recap for a learner coming back (the learning model's key).
 *
 * Development: `?day=N` reads the burrow's preview learner; `?fixture=<url>` plays fixture audio
 * into the mic on the voicemail's turn (a simulator without a microphone).
 */

/** Gifts a story leaves in the burrow, toasted when it ends. */
const GIFTS: Readonly<Record<string, 'story.gift.seagullFeather'>> = {
  's1-e1-story': 'story.gift.seagullFeather',
};

export function ListenRoute() {
  const params: Params = useLocalSearchParams();
  const sceneId = one(params, 'sceneId') ?? '';
  const scene = findScene(sceneId);
  if (isRecapId(sceneId)) return <RecapRoute recapId={sceneId} params={params} />;
  if (scene?.kind === 'voicemail') {
    // A message alone plays on the phone; a voicemail with a fix in it is a short call.
    return mailboxPlan(sceneId, 'vi') ? (
      <MailboxRoute sceneId={sceneId} params={params} />
    ) : (
      <VoicemailRoute scene={scene} params={params} />
    );
  }
  return isFirstWeekScene(sceneId) ? (
    <StoryRoute sceneId={sceneId} params={params} />
  ) : (
    <WeekStoryRoute sceneId={sceneId} params={params} />
  );
}

function StoryRoute({ sceneId, params }: { sceneId: string; params: Params }) {
  const { t } = useLocale();
  const learner = useStoryLearner(params);
  const leave = useLeave();
  const plan = useMemo(
    () => listenPlan(sceneId, learner.firstLanguage),
    [sceneId, learner.firstLanguage],
  );
  // Stamped on the app's day (the test menu's, in the test builds).
  const now = useAppNow(learner.timezone);
  const [postmark] = useState(() => postmarkDay(now));
  const { markSeen } = useSeen();
  const { meetPhrase } = useProgress();
  const onSeed = useCallback(
    (event: SeedEvent) => {
      const phrase = phraseForSeed({ phraseId: event.phraseId, text: event.phrase ?? event.text });
      if (phrase) void meetPhrase(phrase).catch(() => undefined);
    },
    [meetPhrase],
  );
  if (!plan) return null;
  const gift = GIFTS[sceneId];
  return (
    <StoryScreen
      plan={plan}
      roommateName={learner.roommate.name}
      species={learner.roommate.species}
      postmarkDate={postmark}
      gift={gift ? t(gift) : null}
      onSeed={onSeed}
      onFinish={() => {
        void markSeen(...momentsOfScenes(plan.scenes.map((s) => s.id)));
        leave();
      }}
      onBack={leave}
    />
  );
}

/** A later week's story and postcards: lines glossed as the learner's stage gives help. */
function WeekStoryRoute({ sceneId, params }: { sceneId: string; params: Params }) {
  const learner = useStoryLearner(params);
  const leave = useLeave();
  const plan = useMemo(
    () => listenPlan(sceneId, learner.firstLanguage, learner.name),
    [sceneId, learner.firstLanguage, learner.name],
  );
  const now = useAppNow(learner.timezone);
  const [postmark] = useState(() => postmarkDay(now));
  const { markScenesSeen } = useSeen();
  const { meetPhrase } = useProgress();
  const onSeed = useCallback(
    (event: SeedEvent) => {
      const phrase = phraseForSeed({ phraseId: event.phraseId, text: event.phrase ?? event.text });
      if (phrase) void meetPhrase(phrase).catch(() => undefined);
    },
    [meetPhrase],
  );
  if (!plan) return null;
  return (
    <WeekListenScreen
      plan={plan}
      roommateName={learner.roommate.name}
      species={learner.roommate.species}
      postmarkDate={postmark}
      glossReveal={glossRevealFor(learner.stage, learner.firstLanguage)}
      onSeed={onSeed}
      onFinish={() => {
        void markScenesSeen(...plan.scenes.map((s) => s.id));
        leave();
      }}
      onBack={leave}
    />
  );
}

function VoicemailRoute({ scene, params }: { scene: Scene; params: Params }) {
  const router = useRouter();
  const learner = useStoryLearner(params);
  const leave = useLeave();
  const { markSeen } = useSeen();
  const sceneId = scene.id;
  const [attempt, setAttempt] = useState(0);
  const call = useVoicemailCall({
    scene,
    stage: learner.stage,
    firstLanguage: learner.firstLanguage,
    attempt,
    fixture: __DEV__ ? one(params, 'fixture') : undefined,
  });
  const target = findPhrase(scene.phrases[0] ?? '');
  // The app's day: the test menu's time travel moves it in test builds.
  const [now] = useState(() => appNow());
  const growth = useMemo(
    () =>
      target
        ? growthOfFix(
            learner.phrases.find((p) => p.id === target.id),
            { id: target.id, text: target.en },
            sceneId,
            now,
            learner.timezone,
          )
        : { from: 'sprout' as const, to: 'leaf' as const },
    [target, learner.phrases, learner.timezone, sceneId, now],
  );
  return (
    <VoicemailScreen
      scene={scene}
      roommateName={learner.roommate.name}
      species={learner.roommate.species}
      firstLanguage={learner.firstLanguage}
      call={call}
      growth={growth}
      phrase={target?.en ?? ''}
      onSeasonMap={() => {
        void markSeen(...momentsOfScenes([sceneId]));
        // In development the season map keeps the preview's day.
        const day = __DEV__ ? one(params, 'day') : undefined;
        router.replace(day ? (`/season?day=${day}&after=1` as Href) : BURROW_ROUTES.seasonMap);
      }}
      onRetry={() => setAttempt((a) => a + 1)}
      onBack={leave}
    />
  );
}
