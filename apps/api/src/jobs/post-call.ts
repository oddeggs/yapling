import { CALL_SUMMARY_VERSION, CallSummary } from '@yapling/contracts';
import { fluencyMetrics } from '@yapling/domain';
import { findScene } from '@yapling/story';

import { anthropicClient } from '../call/llm';
import { isLearnerLine, type TranscriptFile } from '../call/transcript';
import { getCallRow, storeSummary } from '../calls/store';
import type { Bindings } from '../env';
import { addMemory } from '../memory';
import { readProgress, updateProgress } from '../progress';
import type { PostCallJob } from './messages';
import { applyCall, type ProgressChange } from './progress-apply';
import { summarise } from './summary';

/*
 * The post-call job: Sonnet reads the transcript; the learning model updates progress (phrases,
 * error targets, can-dos and keepsakes, the ring); new memory items are added; Flow, Pace and
 * Pauses come from the learner's word timings. The summary goes on the call record and the record
 * stops being pending. A record already summarised is left alone, so a redelivered job is a no-op.
 */

export async function runPostCall(env: Bindings, job: PostCallJob, now: number): Promise<void> {
  const row = await getCallRow(env.DB, job.userId, job.callId);
  if (row === null || row.summary_pending === 0) return;
  const object = await env.BLOBS.get(row.transcript_key);
  const scene = findScene(row.scene_id);
  if (object === null || !scene) {
    await storeSummary(env.DB, job.userId, job.callId, null, null);
    return;
  }
  const file = await object.json<TranscriptFile>();
  const learnerLines = file.lines.filter(isLearnerLine);
  const metrics = fluencyMetrics(learnerLines.map((l) => l.words));
  const progressBefore = await readProgress(env.DB, job.userId, now);
  const activeTargets = progressBefore.errorTargets
    .filter((t) => t.status === 'active')
    .map((t) => t.id);

  const { draft, usd, usage } = await summarise(
    anthropicClient(env.ANTHROPIC_API_KEY ?? ''),
    file,
    scene,
    activeTargets,
  );

  let change: ProgressChange | null = null;
  await updateProgress(
    env.DB,
    job.userId,
    (current) => {
      change = applyCall(current, {
        callId: job.callId,
        sceneId: scene.id,
        kind: file.kind as Parameters<typeof applyCall>[1]['kind'],
        endedAt: file.endedAt,
        timezone: file.timezone,
        scenePhrases: scene.phrases,
        sceneCast: scene.cast,
        learnerLines,
        draft,
      });
      return change.lists;
    },
    now,
  );
  const applied = change as ProgressChange | null;

  const memoryItemIds: string[] = [];
  for (const memory of draft?.memories ?? []) {
    const item = await addMemory(env.DB, job.userId, { ...memory, sourceCallId: job.callId }, now);
    if (item) memoryItemIds.push(item.id);
  }

  const summary = CallSummary.parse({
    version: CALL_SUMMARY_VERSION,
    wins: draft?.wins.slice(0, 2) ?? [],
    fix:
      draft?.fix === null || draft?.fix === undefined
        ? null
        : {
            from: draft.fix.from,
            to: draft.fix.to,
            targetId:
              draft.fix.targetId && /^[a-z0-9][a-z0-9_.-]*$/.test(draft.fix.targetId)
                ? draft.fix.targetId
                : null,
            explanation:
              file.firstLanguage === 'other' && !['regular', 'local', 'voice'].includes(file.stage)
                ? null
                : draft.fix.explanation || null,
          },
    phraseEvents: applied?.phraseEvents ?? [],
    canDoEvidence: applied?.canDoEvidence ?? [],
    metrics,
    memoryItemIds: memoryItemIds.slice(0, 20),
  });
  await storeSummary(env.DB, job.userId, job.callId, summary, {
    model: 'claude-sonnet-5-5',
    usage,
    usd,
  });
}
