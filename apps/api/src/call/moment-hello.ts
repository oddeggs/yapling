import type { HelloFrame } from '@yapling/contracts';
import { WRAP_UP_SECONDS } from '@yapling/domain';
import { localTime, PLACES, weatherAt } from '@yapling/scene';

import { callTime } from '../calls/store';
import { arrivalText } from '../director/craft';
import type { MomentStory } from '../director/actor';
import { ensureAhead } from '../director/jobs';
import { stanceFor, type Stance } from '../curriculum/companion';
import { stageFor } from '../director/plan';
import {
  listPaintings,
  readLearner,
  readMoment,
  readStory,
  storyScenes,
  type Moment,
} from '../director/store';
import type { Bindings } from '../env';
import { userObject } from '../user';
import { newMomentData, type MomentData } from './moment-session';
import { CONTINUOUS_GAP_MS } from './safety';

/*
 * A new call for a planned moment: the moment named in `hello`, ready and the learner's own; the
 * minutes it may use; the town's hour, date and weather on the learner's clock.
 */

export type MomentHello =
  | { readonly error: null; readonly data: MomentData }
  | { readonly error: 'unknown_scene' | 'minutes_exhausted' };

export async function helloMoment(
  env: Bindings,
  frame: HelloFrame,
  userId: string,
  country: string,
): Promise<MomentHello> {
  const [moment, learner] = await Promise.all([
    readMoment(env.DB, userId, frame.sceneId),
    readLearner(env.DB, userId),
  ]);
  if (moment === null || moment.plan === null || moment.status !== 'ready' || learner === null)
    return { error: 'unknown_scene' };
  const user = userObject(env, userId);
  const now = Date.now();
  const [balance, canStart, time] = await Promise.all([
    user.balance(),
    user.canStart('moment'),
    callTime(env.DB, userId, now, CONTINUOUS_GAP_MS),
  ]);
  if (!canStart) return { error: 'minutes_exhausted' };
  const plan = moment.plan;
  const t = localTime(new Date(now), learner.timezone);
  // A fixed moment (the first, a free one) is played at the learner's own stage.
  const stage = moment.source === 'director' ? plan.stage_aimed : stageFor(learner);
  const story = await storyOf(
    env,
    userId,
    moment,
    arrivalText(learner),
    stanceFor(learner.arrival, stage),
  );
  // While this scene plays, the next one is written.
  await ensureAhead(env, userId, moment, now).catch((error: unknown) => {
    console.warn('next scene not started', { error: String(error).slice(0, 200) });
  });
  const data = newMomentData(
    {
      callId: `call_${crypto.randomUUID().replaceAll('-', '')}`,
      userId,
      momentId: moment.id,
      startedAt: now,
      resumeSecret: crypto.randomUUID().replaceAll('-', ''),
      country: learner.country ?? country,
      turnMode: frame.turnMode,
      place: plan.place,
      variant: plan.variant,
      speaker: plan.companion ?? PLACES[plan.place].resident,
      hour: t.hour,
      localDate: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
      weather: weatherAt(t),
      timezone: learner.timezone,
    },
    { ...plan, stage_aimed: stage },
    { name: learner.name, firstLanguage: learner.firstLanguage, stage, country: learner.country },
    // The brief is read on the card before the call: the companion opens the scene directly.
    { story, way: '' },
    {
      secondsLeft: balance.leftSeconds,
      wrapping: balance.leftSeconds <= WRAP_UP_SECONDS,
      priorCallSeconds: time.totalSeconds,
      continuousSince: time.continuousSince,
    },
  );
  return { error: null, data };
}

/** Where this moment sits in its story, for the actor: the outline and the scenes so far. */
async function storyOf(
  env: Bindings,
  userId: string,
  moment: Moment,
  about: string,
  stance: Stance,
): Promise<MomentStory | null> {
  if (!moment.storyId || !moment.sceneNo) return null;
  const [story, scenes, paintings] = await Promise.all([
    readStory(env.DB, userId, moment.storyId),
    storyScenes(env.DB, userId, moment.storyId),
    listPaintings(env.DB, userId, 60),
  ]);
  if (!story?.outline) return null;
  const ids = new Set(scenes.map((m) => m.id));
  const before = paintings
    .filter((p) => ids.has(p.momentId) && p.record?.summary)
    .reverse()
    .map((p) => p.record!.summary);
  return {
    title: story.outline.title,
    logline: story.outline.logline,
    sceneNo: moment.sceneNo,
    scenes: story.outline.scenes.length,
    before,
    about,
    stance,
  };
}
