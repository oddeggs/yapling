import { findPhrase, findScene, type Scene } from '@yapling/story';
import { translator } from '@yapling/i18n';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { BurrowArtProvider } from '../burrow/art-fonts';
import { BURROW_ROUTES } from '../burrow/routes';
import { useLocale } from '../../ui';
import { useStoryLearner } from './learner';
import { listenPlan } from './plan';
import { markSeen } from './seen-store';
import type { SeedEvent } from './story-model';
import { StoryScreen } from './story-screen';
import { useVoicemailCall } from './voicemail-call';
import { growthOfFix } from './voicemail-model';
import { VoicemailScreen } from './voicemail-screen';

/*
 * `/listen/<sceneId>`: a scene with nothing to fail. Pip's story and the postcards that come with
 * it play on the phone; a voicemail with a phrase to fix opens a short live turn.
 *
 * Development: `?day=N` reads the burrow's preview learner; `?fixture=<url>` plays fixture audio
 * into the mic on the voicemail's turn (a simulator without a microphone).
 */

type Params = Readonly<Record<string, string | string[] | undefined>>;

const one = (params: Params, key: string): string | undefined => {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
};

/** Gifts a story leaves in the burrow, toasted when it ends. */
const GIFTS: Readonly<Record<string, 'story.gift.seagullFeather'>> = {
  's1-e1-story': 'story.gift.seagullFeather',
};

const en = translator('en');

/** A postmark's day in the town's own style: `SEP 23`. */
function postmarkDay(now: number): string {
  const d = new Date(now);
  const month = en(`common.monthShort.${d.getMonth() + 1}` as 'common.monthShort.1');
  return `${month.toUpperCase()} ${d.getDate()}`;
}

export function ListenRoute() {
  const params: Params = useLocalSearchParams();
  const sceneId = one(params, 'sceneId') ?? '';
  const scene = findScene(sceneId);
  return (
    <BurrowArtProvider>
      {scene?.kind === 'voicemail' ? (
        <VoicemailRoute scene={scene} params={params} />
      ) : (
        <StoryRoute sceneId={sceneId} params={params} />
      )}
    </BurrowArtProvider>
  );
}

function useLeave() {
  const router = useRouter();
  return useCallback(
    () => (router.canGoBack() ? router.back() : router.replace(BURROW_ROUTES.home)),
    [router],
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
  const [postmark] = useState(() => postmarkDay(Date.now()));
  const onSeed = useCallback((event: SeedEvent) => {
    // The data layer has no phrase-met write for the phone yet: the integration records the seed
    // (meetPhrase) here. Until then the event is the hand-off.
    void event;
  }, []);
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
        markSeen(plan.scenes.map((s) => s.id));
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
  const [now] = useState(() => Date.now());
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
        markSeen([sceneId]);
        // In development the season map keeps the preview's day.
        const day = __DEV__ ? one(params, 'day') : undefined;
        router.replace(day ? (`/season?day=${day}&after=1` as Href) : BURROW_ROUTES.seasonMap);
      }}
      onRetry={() => setAttempt((a) => a + 1)}
      onBack={leave}
    />
  );
}
