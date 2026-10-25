import { OpaqueId } from '@yapling/contracts';
import { z } from 'zod';

import { addMemory, listMemory } from '../memory/store';
import { anthropicClient } from '../call/llm';
import { judgedLines } from '../call/moment-session';
import type { TranscriptFile } from '../call/transcript';
import type { Bindings } from '../env';
import { judgeMoment, type JudgedLine } from './judge';
import type { MomentPlan } from './moment';
import { followOn, planScene, writeStory, type StoryContext } from './plan';
import {
  countMoments,
  failStalePlans,
  finishPainting,
  finishPlanning,
  followUp,
  insertMoment,
  insertStory,
  listPaintings,
  listStories,
  openMoments,
  paintingByCall,
  readLearner,
  readMoment,
  readStory,
  recentPlans,
  saveLearnerModel,
  setStoryStatus,
  storyScenes,
  type Moment,
} from './store';

/*
 * The director's background work on the `jobs` queue. The next scene is always being written
 * while the learner plays the one before, so a story never waits: when a scene starts, its next
 * scene is planned (or, after a story's last scene, the next story). When a scene ends, the judge
 * reads it, and the next scene's way in is rewritten so it follows on from what really happened.
 */

export const MomentJob = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('moment_after'),
    callId: OpaqueId,
    userId: OpaqueId,
    momentId: OpaqueId,
  }),
  z.object({ type: z.literal('moment_plan'), userId: OpaqueId, momentId: OpaqueId }),
  z.object({
    type: z.literal('scene_plan'),
    userId: OpaqueId,
    momentId: OpaqueId,
    storyId: OpaqueId,
    sceneNo: z.number().int().min(1).max(6),
  }),
]);
export type MomentJob = z.infer<typeof MomentJob>;

/** A plan still "planning" after this long had its job die; another may start. */
export const PLAN_STALE_MS = 4 * 60_000;
/** Minutes ahead a next scene is written for: the scene now playing comes first. */
const AHEAD_MIN = 6;

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;

export async function runMomentJob(env: Bindings, job: MomentJob, now: number): Promise<void> {
  switch (job.type) {
    case 'moment_after':
      await Promise.all([
        judgeAfter(env, job.userId, job.callId, job.momentId, now),
        followAfter(env, job.userId, job.callId, job.momentId),
      ]);
      await ensureAhead(env, job.userId, null, now);
      return;
    case 'moment_plan':
      await writeNewStory(env, job.userId, job.momentId, now);
      return;
    case 'scene_plan':
      await writeScene(env, job.userId, job.momentId, job.storyId, job.sceneNo, now);
      return;
  }
}

/**
 * Makes sure the learner's next scene is ready or being written. `playing` is a moment that has
 * just started (it is still "ready" until it ends): the next one is the scene after it.
 */
export async function ensureAhead(
  env: Bindings,
  userId: string,
  playing: Moment | null,
  now: number,
): Promise<void> {
  await failStalePlans(env.DB, userId, now - PLAN_STALE_MS);
  const open = (await openMoments(env.DB, userId)).filter(
    (m) => m.source === 'director' && m.id !== playing?.id,
  );
  if (open.length > 0) return;
  const [story] = await listStories(env.DB, userId, 1);
  let next: { storyId: string; sceneNo: number } | null = null;
  if (story?.status === 'active' && story.outline) {
    const played = await storyScenes(env.DB, userId, story.id);
    const last = Math.max(
      0,
      ...played.map((m) => m.sceneNo ?? 0),
      playing?.storyId === story.id ? (playing.sceneNo ?? 0) : 0,
    );
    if (last < story.outline.scenes.length) next = { storyId: story.id, sceneNo: last + 1 };
    else await setStoryStatus(env.DB, story.id, 'done', now);
  }
  const id = newId('mo');
  const inserted = await insertMoment(
    env.DB,
    {
      id,
      userId,
      status: 'planning',
      source: 'director',
      plan: null,
      plannedHour: null,
      storyId: next?.storyId ?? null,
      sceneNo: next?.sceneNo ?? null,
    },
    now,
  );
  // Another open started one at the same moment.
  if (!inserted) return;
  const job: MomentJob = next
    ? { type: 'scene_plan', userId, momentId: id, ...next }
    : { type: 'moment_plan', userId, momentId: id };
  await env.JOBS.send(MomentJob.parse(job));
}

async function storyContext(env: Bindings, userId: string, now: number) {
  const learner = await readLearner(env.DB, userId);
  if (learner === null) return null;
  const [paintings, memories, played, recent, stories] = await Promise.all([
    listPaintings(env.DB, userId, 12),
    listMemory(env.DB, userId),
    countMoments(env.DB, userId),
    recentPlans(env.DB, userId, 2),
    listStories(env.DB, userId, 8),
  ]);
  const ctx: StoryContext = {
    learner,
    paintings,
    memories: memories.map((m) => m.text),
    pastStories: stories.flatMap((s) => (s.outline && s.status !== 'failed' ? [s.outline] : [])),
    recent,
    played,
    now,
  };
  return ctx;
}

async function writeNewStory(env: Bindings, userId: string, momentId: string, now: number) {
  const ctx = await storyContext(env, userId, now);
  if (ctx === null) return;
  try {
    const written = await writeStory(anthropicClient(env.ANTHROPIC_API_KEY ?? ''), ctx, AHEAD_MIN);
    if (written === null) {
      await finishPlanning(env.DB, momentId, { failed: true });
      console.warn('story failed the checks', { userId });
      return;
    }
    const storyId = newId('st');
    await insertStory(
      env.DB,
      { id: storyId, userId, outline: written.value.outline, costUsd: written.costUsd },
      now,
    );
    await env.DB.prepare('UPDATE moments SET story_id = ?2, scene_no = 1 WHERE id = ?1')
      .bind(momentId, storyId)
      .run();
    await finishPlanning(env.DB, momentId, {
      plan: written.value.scene,
      plannedHour: written.hour,
      costUsd: written.costUsd,
    });
    console.log('story written', {
      storyId,
      title: written.value.outline.title,
      kind: written.value.outline.kind,
      usd: written.costUsd,
      repaired: written.repaired,
    });
    await followLate(env, userId, momentId, now);
  } catch (error) {
    await finishPlanning(env.DB, momentId, { failed: true });
    throw error;
  }
}

async function writeScene(
  env: Bindings,
  userId: string,
  momentId: string,
  storyId: string,
  sceneNo: number,
  now: number,
) {
  const [ctx, story] = await Promise.all([
    storyContext(env, userId, now),
    readStory(env.DB, userId, storyId),
  ]);
  if (ctx === null || story?.outline == null) {
    await finishPlanning(env.DB, momentId, { failed: true });
    return;
  }
  const scenes = await storyScenes(env.DB, userId, storyId);
  const ids = new Set(scenes.map((m) => m.id));
  const played = ctx.paintings.filter((p) => ids.has(p.momentId)).reverse();
  try {
    const written = await planScene(
      anthropicClient(env.ANTHROPIC_API_KEY ?? ''),
      ctx,
      story.outline,
      sceneNo,
      played,
      AHEAD_MIN,
    );
    if (written === null) {
      await finishPlanning(env.DB, momentId, { failed: true });
      console.warn('scene failed the checks', { userId, storyId, sceneNo });
      return;
    }
    await finishPlanning(env.DB, momentId, {
      plan: written.value,
      plannedHour: written.hour,
      costUsd: written.costUsd,
    });
    console.log('scene planned', {
      momentId,
      sceneNo,
      title: written.value.title_open,
      usd: written.costUsd,
      repaired: written.repaired,
    });
    await followLate(env, userId, momentId, now);
  } catch (error) {
    await finishPlanning(env.DB, momentId, { failed: true });
    throw error;
  }
}

async function transcriptOf(
  env: Bindings,
  userId: string,
  callId: string,
): Promise<JudgedLine[] | null> {
  const row = await env.DB.prepare('SELECT transcript_key FROM calls WHERE id = ? AND user_id = ?')
    .bind(callId, userId)
    .first<{ transcript_key: string }>();
  const object = row ? await env.BLOBS.get(row.transcript_key) : null;
  const file = object ? ((await object.json()) as TranscriptFile) : null;
  return file ? judgedLines(file.lines) : null;
}

/** Rewrites the next ready scene's way in from the scene just played. */
async function followAfter(env: Bindings, userId: string, callId: string, momentId: string) {
  const [last, open] = await Promise.all([
    readMoment(env.DB, userId, momentId),
    openMoments(env.DB, userId),
  ]);
  const next = open.find((m) => m.status === 'ready' && m.source === 'director' && !m.followed);
  if (!last?.plan || !next?.plan) return;
  const lines = await transcriptOf(env, userId, callId);
  await follow(env, userId, last.plan, lines ?? [], next);
}

/**
 * A scene that finished writing after the one before it was already played: it follows on now.
 */
async function followLate(env: Bindings, userId: string, momentId: string, now: number) {
  const next = await readMoment(env.DB, userId, momentId);
  if (!next?.plan || next.followed) return;
  const row = await env.DB.prepare(
    `SELECT id, call_id FROM moments WHERE user_id = ? AND status = 'played' AND played_at > ?
     ORDER BY played_at DESC LIMIT 1`,
  )
    .bind(userId, next.createdAt)
    .first<{ id: string; call_id: string | null }>();
  if (!row?.call_id) return;
  const last = await readMoment(env.DB, userId, row.id);
  if (!last?.plan) return;
  const lines = await transcriptOf(env, userId, row.call_id);
  await follow(env, userId, last.plan, lines ?? [], next);
  void now;
}

async function follow(
  env: Bindings,
  userId: string,
  last: MomentPlan,
  lines: readonly JudgedLine[],
  next: Moment,
) {
  if (!next.plan) return;
  const [learner, story] = await Promise.all([
    readLearner(env.DB, userId),
    next.storyId ? readStory(env.DB, userId, next.storyId) : Promise.resolve(null),
  ]);
  if (!story?.outline) return;
  try {
    const r = await followOn(anthropicClient(env.ANTHROPIC_API_KEY ?? ''), {
      outline: story.outline,
      last,
      lines,
      next: next.plan,
      learnerName: learner?.name ?? null,
    });
    if (r === null) return;
    const kept = await followUp(env.DB, next.id, r.plan);
    console.log('scene follows on', { momentId: next.id, kept, usd: r.costUsd });
  } catch (error) {
    // The scene still plays as written.
    console.warn('follow-on failed', { error: String(error).slice(0, 200) });
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
  const lines = await transcriptOf(env, userId, callId);
  if (lines === null) {
    await finishPainting(env.DB, callId, { failed: true });
    return;
  }
  const judged = await judgeMoment(anthropicClient(env.ANTHROPIC_API_KEY ?? ''), {
    previous: learner.model,
    plan: moment.plan,
    lines,
    firstLanguage: learner.firstLanguage,
    openThreads: learner.openThreads,
    name: learner.name,
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
