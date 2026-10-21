import type { FirstLanguage, HelloFrame, Progress, Stage } from '@yapling/contracts';
import { duePhrases, localDateOf, type PhraseRecord } from '@yapling/domain';
import { findPhrase, type ErrorTargetBrief, type Scene } from '@yapling/story';

import type { Bindings } from '../env';
import { readProgress } from '../progress';
import { targetBrief } from './targets';

/*
 * What the call knows about the learner when it starts: their name and timezone (profile), their
 * active error targets and the phrases due a chance (progress). The stage and first language come
 * from `hello`, which the app reads from the same profile.
 */

export interface LearnerContext {
  readonly name: string;
  readonly timezone: string;
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  /** The two active error targets, prompted in the call. */
  readonly targets: readonly ErrorTargetBrief[];
  /** Phrase ids and text to give chances to use. */
  readonly duePhrases: readonly { readonly id: string; readonly text: string }[];
}

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** A progress phrase as the learning model's record (the days it was used are not kept there). */
export function phraseRecordOf(p: Progress['phrases'][number], timezone: string): PhraseRecord {
  return {
    ...p,
    useDays: p.lastUsedAt === null ? [] : [localDateOf(p.lastUsedAt, timezone)],
    contexts: [],
    pipReusedAt: null,
  };
}

export async function loadLearner(
  env: Bindings,
  userId: string,
  hello: Pick<HelloFrame, 'stage' | 'firstLanguage'>,
  scene: Scene,
  now: number,
): Promise<LearnerContext> {
  const profile = await env.DB.prepare(
    'SELECT display_name, timezone FROM profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ display_name: string; timezone: string }>();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const progress = await readProgress(env.DB, userId, now);
  const targets = progress.errorTargets
    .filter((t) => t.status === 'active')
    .slice(0, 2)
    .map((t) => targetBrief(t.id));
  const records = progress.phrases.map((p) => phraseRecordOf(p, timezone));
  const due = duePhrases(records, now, timezone, { always: [...scene.phrases] }).map((p) => ({
    id: p.id,
    text: p.text,
  }));
  // The scene's own phrases are always on offer, met or not.
  const sceneOwn = scene.phrases
    .filter((id) => !due.some((d) => d.id === id))
    .map((id) => findPhrase(id))
    .filter((p) => p !== undefined)
    .map((p) => ({ id: p.id, text: p.en }));
  return {
    name: profile?.display_name ?? '',
    timezone,
    stage: hello.stage,
    firstLanguage: hello.firstLanguage,
    targets,
    duePhrases: [...due, ...sceneOwn].slice(0, 6),
  };
}
