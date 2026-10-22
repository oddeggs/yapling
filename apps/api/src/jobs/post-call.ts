import {
  CALL_SUMMARY_VERSION,
  CallSummary,
  type CallCanDoEvidence,
  type PhraseEvent,
} from '@yapling/contracts';
import { LocalDate } from '@yapling/contracts';
import { fluencyMetrics, storyDayIndexOf } from '@yapling/domain';
import { findScene } from '@yapling/story';

import { anthropicClient, type Usage } from '../call/llm';
import { isLearnerLine, type TranscriptFile } from '../call/transcript';
import { getCallRow, storeSummary } from '../calls/store';
import type { Bindings } from '../env';
import { addMemory } from '../memory';
import { progressChange, readProgress, updateProgressOnce } from '../progress';
import type { PostCallJob } from './messages';
import { isDailyTranscript, recordDailyCall } from './daily-call';
import { applyCall } from './progress-apply';
import { summarise, type Draft } from './summary';

/*
 * The post-call job: Sonnet reads the transcript; the learning model updates progress (phrases,
 * error targets, can-dos and keepsakes, the ring); new memory items are added; Flow, Pace and
 * Pauses come from the learner's word timings. The summary goes on the call record and the record
 * stops being pending. A record already summarised is left alone, so a redelivered job is a no-op.
 * Pip's minute is never read by a model: a job for one only writes its phrase uses
 * (`daily-call.ts`), when the call couldn't.
 *
 * A job that fails after progress was updated is retried without applying anything twice: the
 * progress update records the call (with the summary draft and what the change produced) in the
 * same batch, a retry reuses that record instead of asking Sonnet again, and memory items get ids
 * made from the call id, so adding one again changes nothing.
 */

/** What the post-call job keeps with its progress change, for a retry to finish from. */
interface AppliedCall {
  readonly draft: Draft | null;
  readonly usage: Usage;
  readonly usd: number;
  readonly phraseEvents: PhraseEvent[];
  readonly canDoEvidence: CallCanDoEvidence[];
}

/** A memory item's id from its call and place in the draft: the same on every run. */
async function memoryIdOf(callId: string, index: number): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${callId}:memory:${index}`),
  );
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `m_${hex.slice(0, 32)}`;
}

/**
 * The story day an instant falls on: counted from the profile's story start (never before the
 * install day), or from the install day when none is kept (a Newcomer from before it was, or a
 * Visitor still settling in).
 */
export async function storyDayOn(
  db: D1Database,
  userId: string,
  installedOn: string,
  at: number,
  timezone: string,
): Promise<number> {
  const row = await db
    .prepare('SELECT story_started_on FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first<{ story_started_on: string | null }>();
  const started = LocalDate.safeParse(row?.story_started_on);
  const storyStartedOn = started.success && started.data >= installedOn ? started.data : null;
  return storyDayIndexOf({ installedOn, storyStartedOn }, at, timezone);
}

export async function runPostCall(env: Bindings, job: PostCallJob, now: number): Promise<void> {
  const row = await getCallRow(env.DB, job.userId, job.callId);
  if (row === null || row.summary_pending === 0) return;
  const object = await env.BLOBS.get(row.transcript_key);
  const file = object === null ? null : await object.json<TranscriptFile>();
  // Pip's minute: its phrase uses, with no model (the call writes them; this is its retry).
  if (file !== null && isDailyTranscript(file)) {
    await recordDailyCall(env.DB, job.userId, file, now);
    return;
  }
  const scene = findScene(row.scene_id);
  if (file === null || !scene) {
    await storeSummary(env.DB, job.userId, job.callId, null, null);
    return;
  }
  const learnerLines = file.lines.filter(isLearnerLine);
  const metrics = fluencyMetrics(learnerLines.map((l) => l.words));
  let applied = await progressChange<AppliedCall>(env.DB, job.userId, job.callId);
  if (applied === null) {
    const progressBefore = await readProgress(env.DB, job.userId, now);
    const activeTargets = progressBefore.errorTargets
      .filter((t) => t.status === 'active')
      .map((t) => t.id);
    const storyDay = await storyDayOn(
      env.DB,
      job.userId,
      progressBefore.installedOn,
      file.endedAt,
      file.timezone,
    );
    const { draft, usd, usage } = await summarise(
      anthropicClient(env.ANTHROPIC_API_KEY ?? ''),
      file,
      scene,
      activeTargets,
    );
    const outcome = await updateProgressOnce<AppliedCall>(
      env.DB,
      job.userId,
      job.callId,
      (current) => {
        const change = applyCall(current, {
          callId: job.callId,
          sceneId: scene.id,
          kind: file.kind as Parameters<typeof applyCall>[1]['kind'],
          endedAt: file.endedAt,
          timezone: file.timezone,
          storyDay,
          scenePhrases: scene.phrases,
          sceneCast: scene.cast,
          learnerLines,
          draft,
        });
        return {
          lists: change.lists,
          data: {
            draft,
            usage,
            usd,
            phraseEvents: change.phraseEvents,
            canDoEvidence: change.canDoEvidence,
          },
        };
      },
      now,
    );
    applied = outcome.data;
  }
  const { draft, usage, usd } = applied;

  const memoryItemIds: string[] = [];
  for (const [index, memory] of (draft?.memories ?? []).entries()) {
    const item = await addMemory(
      env.DB,
      job.userId,
      { ...memory, sourceCallId: job.callId },
      now,
      await memoryIdOf(job.callId, index),
    );
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
            explanation: draft.fix.explanation || null,
          },
    phraseEvents: applied.phraseEvents,
    canDoEvidence: applied.canDoEvidence,
    metrics,
    memoryItemIds: memoryItemIds.slice(0, 20),
  });
  await storeSummary(env.DB, job.userId, job.callId, summary, {
    model: 'claude-sonnet-5-5',
    usage,
    usd,
  });
}
