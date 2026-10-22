import { dateOfDay, firstDayOfWeek, localTimeOf, seasonEpisodes } from '@yapling/domain';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';

import { useAppNow, useSeen } from '../../data';
import { SEASON_WEEKS } from '../../data/season';
import { useLocale } from '../../ui';
import { BURROW_ROUTES, callRoute } from '../burrow/routes';
import { weekdayOf } from '../season/season-model';
import { EpisodeEndScreen } from './episode-end-screen';
import { useStoryLearner, type StoryLearner } from './learner';
import { episodeEndModel, glossRevealFor, mailboxPlan, recapModel } from './listening';
import { MailboxScreen } from './mailbox-screen';
import { RecapScreen } from './recap-screen';
import { one, postmarkDay, useLeave, type Params } from './route-helpers';

/*
 * The later weeks' recorded voicemail, then the card that closes the episode's week; and Pip's
 * recap for a learner coming back. Dates count from the story's start, as the season map's do.
 */

/** In development the season map keeps the preview's params. */
const seasonHref = (params: Params): Href => {
  if (!__DEV__) return BURROW_ROUTES.seasonMap;
  const keep = ['day', 'after', 'week', 'dow', 'missed', 'stage'].flatMap((k) => {
    const v = one(params, k);
    return v === undefined ? [] : [`${k}=${encodeURIComponent(v)}`];
  });
  return keep.length > 0 ? `/season?${keep.join('&')}` : BURROW_ROUTES.seasonMap;
};

/** When the next week opens, as the closing card says it; null when there's nothing next. */
function useWhen(learner: StoryLearner, next: { open: boolean; opensOn: string } | null) {
  const { t } = useLocale();
  if (next === null) return null;
  if (next.open) return t('story.end.readyNow');
  return t('story.end.outOn', { day: t(`common.weekday.${weekdayOf(next.opensOn)}`) });
}

export function MailboxRoute({ sceneId, params }: { sceneId: string; params: Params }) {
  const router = useRouter();
  const learner = useStoryLearner(params);
  const leave = useLeave();
  const { markScenesSeen } = useSeen();
  const plan = useMemo(
    () => mailboxPlan(sceneId, learner.firstLanguage, learner.name),
    [sceneId, learner.firstLanguage, learner.name],
  );
  const now = useAppNow(learner.timezone);
  const [postmark] = useState(() => `${postmarkDay(now)}\n${localTimeOf(now, learner.timezone)}`);
  const [phase, setPhase] = useState<'mailbox' | 'end'>('mailbox');
  const end = useMemo(() => {
    if (!plan) return null;
    const episodes = seasonEpisodes({
      season: SEASON_WEEKS,
      weeks: learner.weeks,
      dayIndex: learner.day,
      startedOn: learner.startedOn,
    });
    return episodeEndModel(plan.weekNumber, episodes);
  }, [plan, learner]);
  const nextDate = useMemo(() => {
    const next = end?.next;
    if (!next || !plan) return null;
    if (next.kind === 'episode') return { open: next.open, opensOn: next.opensOn };
    // The festival week starts on its week's first day.
    const day = firstDayOfWeek(plan.weekNumber + 1);
    return { open: learner.day >= day, opensOn: dateOfDay(learner.startedOn, day) };
  }, [end, plan, learner]);
  const when = useWhen(learner, nextDate);
  if (!plan) return null;
  if (phase === 'end' && end) {
    return (
      <EpisodeEndScreen
        model={end}
        species={learner.roommate.species}
        when={when}
        onHome={() => router.replace(BURROW_ROUTES.home)}
        onSeasonMap={() => router.replace(seasonHref(params))}
      />
    );
  }
  return (
    <MailboxScreen
      plan={plan}
      learnerName={learner.name}
      species={learner.roommate.species}
      roommateName={learner.roommate.name}
      postmark={postmark}
      glossReveal={glossRevealFor(learner.stage, learner.firstLanguage)}
      onContinue={() => {
        void markScenesSeen(sceneId);
        // An episode's week closes on its card; the festival's boat leads to the season map.
        if (end) setPhase('end');
        else router.replace(seasonHref(params));
      }}
      onLater={leave}
    />
  );
}

export function RecapRoute({ recapId, params }: { recapId: string; params: Params }) {
  const router = useRouter();
  const learner = useStoryLearner(params);
  const leave = useLeave();
  const model = useMemo(
    () => recapModel(recapId, learner.firstLanguage, learner.name),
    [recapId, learner.firstLanguage, learner.name],
  );
  if (!model) return null;
  return (
    <RecapScreen
      model={model}
      roommateName={learner.roommate.name}
      species={learner.roommate.species}
      glossReveal={glossRevealFor(learner.stage, learner.firstLanguage)}
      onGo={() => router.replace(callRoute(model.waiting.id))}
      onBack={leave}
    />
  );
}
