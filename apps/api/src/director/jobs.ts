import { OpaqueId } from '@yapling/contracts';
import { z } from 'zod';

import { addMemory, listMemory } from '../memory/store';
import { anthropicClient } from '../call/llm';
import { judgedLines } from '../call/moment-session';
import type { TranscriptFile } from '../call/transcript';
import type { Bindings } from '../env';
import { judgeMoment } from './judge';
import { planMoment } from './plan';
import {
  countMoments,
  finishPainting,
  finishPlanning,
  insertMoment,
  listPaintings,
  openMoments,
  paintingByCall,
  readLearner,
  readMoment,
  saveLearnerModel,
} from './store';

/*
 * The director's background work on the `jobs` queue: after a moment, judge it (the painting's
 * notes, the learner model, what to remember) and plan the next one; or plan one on its own when
 * the learner opens the app and nothing is ready.
 */

export const MomentJob = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('moment_after'),
    callId: OpaqueId,
    userId: OpaqueId,
    momentId: OpaqueId,
  }),
  z.object({ type: z.literal('moment_plan'), userId: OpaqueId, momentId: OpaqueId }),
]);
export type MomentJob = z.infer<typeof MomentJob>;

export async function runMomentJob(env: Bindings, job: MomentJob, now: number): Promise<void> {
  if (job.type === 'moment_after') {
    await judgeAfter(env, job.userId, job.callId, job.momentId, now);
    await planNext(env, job.userId, null, now);
  } else {
    await planNext(env, job.userId, job.momentId, now);
  }
}

async function judgeAfter(
  env: Bindings,
  userId: string,
  callId: string,
  momentId: string,
  now: number,
): Promise<void> {
  const [painting, moment, learner] = await Promise.all([
    paintingByCall(env.DB, userId, callId),
    readMoment(env.DB, userId, momentId),
    readLearner(env.DB, userId),
  ]);
  if (painting === null || painting.status === 'done' || moment?.plan == null || learner === null) {
    if (painting?.status !== 'done') {
      console.warn('moment not judged', {
        callId,
        painting: painting?.status ?? null,
        plan: moment?.plan != null,
        learner: learner !== null,
      });
    }
    return;
  }
  const row = await env.DB.prepare('SELECT transcript_key FROM calls WHERE id = ? AND user_id = ?')
    .bind(callId, userId)
    .first<{ transcript_key: string }>();
  const object = row ? await env.BLOBS.get(row.transcript_key) : null;
  const file = object ? ((await object.json()) as TranscriptFile) : null;
  if (file === null) {
    await finishPainting(env.DB, callId, { failed: true });
    return;
  }
  const judged = await judgeMoment(anthropicClient(env.ANTHROPIC_API_KEY ?? ''), {
    previous: learner.model,
    plan: moment.plan,
    lines: judgedLines(file.lines),
    firstLanguage: learner.firstLanguage,
    openThreads: learner.openThreads,
  });
  if (judged === null) throw new Error('judge returned nothing');
  await saveLearnerModel(
    env.DB,
    userId,
    {
      model: judged.model,
      // The plan's threads stand unless the judge saw the story move on.
      openThreads: judged.record.threads_open.length
        ? judged.record.threads_open
        : moment.plan.open_threads_after,
      name: judged.name,
    },
    now,
  );
  await finishPainting(env.DB, callId, {
    canDos: judged.canDos,
    words: judged.words,
    learned: judged.learned,
    record: judged.record,
  });
  await Promise.all(
    judged.facts.map((f, i) =>
      addMemory(
        env.DB,
        userId,
        { text: f.text.slice(0, 200), category: f.category, sourceCallId: callId },
        now,
        `m_${callId}_${i}`,
      ).catch((error: unknown) => {
        console.warn('memory item not kept', { error: String(error).slice(0, 200) });
      }),
    ),
  );
  console.log('moment judged', { callId, cefr: judged.model.cefr, usd: judged.costUsd });
}

/**
 * Plans the learner's next moment, unless one is already ready or being written. `momentId` names
 * a row the route made for the plan; with null, this makes its own.
 */
export async function planNext(
  env: Bindings,
  userId: string,
  momentId: string | null,
  now: number,
): Promise<void> {
  const open = await openMoments(env.DB, userId);
  const others = open.filter((m) => m.id !== momentId && m.source === 'director');
  if (others.some((m) => m.status === 'ready' || now - m.createdAt < 3 * 60_000)) return;
  const id = momentId ?? `mo_${crypto.randomUUID().replaceAll('-', '')}`;
  if (momentId === null) {
    await insertMoment(
      env.DB,
      { id, userId, status: 'planning', source: 'director', plan: null, plannedHour: null },
      now,
    );
  }
  const learner = await readLearner(env.DB, userId);
  if (learner === null) return;
  const [paintings, memories, played] = await Promise.all([
    listPaintings(env.DB, userId, 12),
    listMemory(env.DB, userId),
    countMoments(env.DB, userId),
  ]);
  try {
    const planned = await planMoment(anthropicClient(env.ANTHROPIC_API_KEY ?? ''), {
      learner,
      paintings,
      memories: memories.map((m) => m.text),
      played,
      now,
    });
    if (planned === null) {
      await finishPlanning(env.DB, id, { failed: true });
      console.warn('moment plan failed the checks', { userId });
      return;
    }
    await finishPlanning(env.DB, id, {
      plan: planned.plan,
      plannedHour: planned.hour,
      costUsd: planned.costUsd,
    });
    console.log('moment planned', {
      momentId: id,
      place: planned.plan.place,
      title: planned.plan.title_open,
      usd: planned.costUsd,
      repaired: planned.repaired,
    });
  } catch (error) {
    await finishPlanning(env.DB, id, { failed: true });
    throw error;
  }
}
