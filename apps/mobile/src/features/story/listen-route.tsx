import { findScene } from '@yapling/story';
import { translator } from '@yapling/i18n';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { BurrowArtProvider } from '../burrow/art-fonts';
import { BURROW_ROUTES } from '../burrow/routes';
import { useLocale } from '../../ui';
import { useStoryLearner } from './learner';
import { listenPlan } from './plan';
import { markSeen } from './seen-store';
import type { SeedEvent } from './story-model';
import { StoryScreen } from './story-screen';

/*
 * `/listen/<sceneId>`: a scene with nothing to fail. Pip's story and the postcards that come with
 * it play on the phone.
 *
 * Development: `?day=N` reads the burrow's preview learner.
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
      {scene ? <StoryRoute sceneId={sceneId} params={params} /> : null}
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
