import type { HelloFrame } from '@yapling/contracts';
import { WRAP_UP_SECONDS } from '@yapling/domain';
import { localTime, PLACES, weatherAt } from '@yapling/scene';

import { callTime } from '../calls/store';
import { stageOfModel } from '../director/plan';
import { readLearner, readMoment } from '../director/store';
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
  // A fixed moment (the first, a free one) is played at the stage the judge has placed them.
  const stage =
    moment.source === 'director' ? plan.stage_aimed : (stageOfModel(learner) ?? plan.stage_aimed);
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
      speaker: PLACES[plan.place].resident,
      hour: t.hour,
      localDate: `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`,
      weather: weatherAt(t),
      timezone: learner.timezone,
    },
    { ...plan, stage_aimed: stage },
    { name: learner.name, firstLanguage: learner.firstLanguage, stage, country: learner.country },
    {
      secondsLeft: balance.leftSeconds,
      wrapping: balance.leftSeconds <= WRAP_UP_SECONDS,
      priorCallSeconds: time.totalSeconds,
      continuousSince: time.continuousSince,
    },
  );
  return { error: null, data };
}
