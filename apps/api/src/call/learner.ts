import type { FirstLanguage, HelloFrame, Pace, Stage } from '@yapling/contracts';
import { duePhrases, errorTargetsApply, fromPhraseProgress } from '@yapling/domain';
import { findPhrase, type ErrorTargetBrief, type Scene } from '@yapling/story';

import type { Bindings } from '../env';
import { learnerTimeZone, readProgress } from '../progress';
import { targetBrief } from './targets';

/*
 * What the call knows about the learner when it starts: their name and timezone (profile), their
 * active error targets and the phrases due a chance (progress). The stage, first language and pace
 * come from `hello`, which the app reads from the same profile.
 */

export interface LearnerContext {
  readonly name: string;
  readonly timezone: string;
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  /** The pace the learner asked for; null (or missing in a call saved before) for the stage's. */
  readonly pace?: Pace | null;
  /** The two active error targets, prompted in the call. */
  readonly targets: readonly ErrorTargetBrief[];
  /** Phrase ids and text to give chances to use. */
  readonly duePhrases: readonly { readonly id: string; readonly text: string }[];
}

export async function loadLearner(
  env: Bindings,
  userId: string,
  hello: Pick<HelloFrame, 'stage' | 'firstLanguage' | 'pace'>,
  scene: Scene,
  now: number,
): Promise<LearnerContext> {
  const profile = await env.DB.prepare('SELECT display_name FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first<{ display_name: string }>();
  const timezone = await learnerTimeZone(env.DB, userId);
  const progress = await readProgress(env.DB, userId, now);
  // No corrections at Visitor, nor in a Settling-in chapter: everything there is recast.
  const corrects = errorTargetsApply(hello.stage) && scene.kind !== 'settling';
  const targets = progress.errorTargets
    .filter((t) => corrects && t.status === 'active')
    .slice(0, 2)
    .map((t) => targetBrief(t.id));
  const records = progress.phrases.map(fromPhraseProgress);
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
    pace: hello.pace ?? null,
    targets,
    duePhrases: [...due, ...sceneOwn].slice(0, 6),
  };
}
