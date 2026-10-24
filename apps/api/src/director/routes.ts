import {
  MomentRequest,
  NextMoment,
  OpaqueId,
  Painting as PaintingWire,
  PaintingLines,
  PaintingList,
  type MomentCard,
} from '@yapling/contracts';
import { localTime, PLACES } from '@yapling/scene';
import { Hono, type Context } from 'hono';

import { errorResponse, parseBody, respond, type SessionEnv } from '../auth';
import type { TranscriptFile } from '../call/transcript';
import { judgedLines } from '../call/moment-session';
import { firstMoment, freeMoment } from './fixed';
import { MomentJob } from './jobs';
import type { MomentPlan } from './moment';
import { playableAt, stageOfModel } from './plan';
import {
  countMoments,
  ensureLearner,
  finishPlanning,
  insertMoment,
  listPaintings,
  openMoments,
  readLearner,
  readPainting,
  paintingByCall,
  type Learner,
  type Moment,
  type Painting,
} from './store';

/**
 * The story director, behind the session guard:
 * - `POST /me/moments/next` (`MomentRequest`): the moment to play now: the first one, a ready plan
 *   whose resident is in at this hour, or none while the director writes (`planning`).
 * - `POST /me/moments/free`: Pip's free moment in the burrow, which needs no plan.
 * - `GET /me/paintings`, `/me/paintings/:id`, `/me/paintings/by-call/:callId`, and
 *   `/me/paintings/:id/lines` for a replay.
 */
export function momentRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.post('/me/moments/next', async (c) => {
    const body = await parseBody(c, MomentRequest);
    if (!body.ok) return body.response;
    const now = Date.now();
    const learner = await seededLearner(c, body.value, now);
    const t = localTime(new Date(now), learner.timezone);
    const open = await openMoments(c.env.DB, learner.userId);

    // The very first open: Pip in the burrow, asking their name.
    const first = open.find((m) => m.source === 'first' && m.status === 'ready');
    if (first?.plan) return next(c, first, learner);
    if (open.length === 0 && (await countMoments(c.env.DB, learner.userId)) === 0) {
      const moment = await newFixed(
        c.env.DB,
        learner,
        'first',
        firstMoment(t.hour, learner.firstLanguage),
        t.hour,
        now,
      );
      return next(c, moment, learner);
    }

    const ready = open.find((m) => m.status === 'ready' && m.source === 'director' && m.plan);
    if (ready?.plan && playableAt(ready.plan, t.hour)) return next(c, ready, learner);
    // A plan whose resident has gone home since: the director writes one for now instead.
    if (ready) await finishPlanning(c.env.DB, ready.id, { failed: true });
    const planning = open.some(
      (m) => m.status === 'planning' && m.source === 'director' && now - m.createdAt < 3 * 60_000,
    );
    if (!planning) {
      const id = `mo_${crypto.randomUUID().replaceAll('-', '')}`;
      await insertMoment(
        c.env.DB,
        {
          id,
          userId: learner.userId,
          status: 'planning',
          source: 'director',
          plan: null,
          plannedHour: null,
        },
        now,
      );
      const job: MomentJob = { type: 'moment_plan', userId: learner.userId, momentId: id };
      await c.env.JOBS.send(MomentJob.parse(job));
    }
    return respond(c, NextMoment, { moment: null, planning: true, name: learner.name });
  });

  routes.post('/me/moments/free', async (c) => {
    const body = await parseBody(c, MomentRequest);
    if (!body.ok) return body.response;
    const now = Date.now();
    const learner = await seededLearner(c, body.value, now);
    const t = localTime(new Date(now), learner.timezone);
    const moment = await newFixed(
      c.env.DB,
      learner,
      'free',
      freeMoment(t.hour, learner.name, learner.firstLanguage),
      t.hour,
      now,
    );
    return next(c, moment, learner);
  });

  routes.get('/me/paintings', async (c) =>
    respond(c, PaintingList, {
      items: (await listPaintings(c.env.DB, c.var.userId)).map(wire),
    }),
  );

  routes.get('/me/paintings/by-call/:callId', async (c) => {
    const id = OpaqueId.safeParse(c.req.param('callId'));
    if (!id.success) return errorResponse(c, 404, 'not_found');
    const p = await paintingByCall(c.env.DB, c.var.userId, id.data);
    if (p === null) return errorResponse(c, 404, 'not_found');
    return respond(c, PaintingWire, wire(p));
  });

  routes.get('/me/paintings/:id', async (c) => {
    const id = OpaqueId.safeParse(c.req.param('id'));
    if (!id.success) return errorResponse(c, 404, 'not_found');
    const p = await readPainting(c.env.DB, c.var.userId, id.data);
    if (p === null) return errorResponse(c, 404, 'not_found');
    return respond(c, PaintingWire, wire(p));
  });

  routes.get('/me/paintings/:id/lines', async (c) => {
    const id = OpaqueId.safeParse(c.req.param('id'));
    if (!id.success) return errorResponse(c, 404, 'not_found');
    const p = await readPainting(c.env.DB, c.var.userId, id.data);
    if (p === null) return errorResponse(c, 404, 'not_found');
    const row = await c.env.DB.prepare(
      'SELECT transcript_key FROM calls WHERE id = ? AND user_id = ?',
    )
      .bind(p.callId, c.var.userId)
      .first<{ transcript_key: string }>();
    const object = row ? await c.env.BLOBS.get(row.transcript_key) : null;
    const file = object ? ((await object.json()) as TranscriptFile) : null;
    const lines = file
      ? judgedLines(file.lines).map((l) => ({ ...l, text: l.text.slice(0, 2000) }))
      : [];
    return respond(c, PaintingLines, { lines });
  });

  return routes;
}

type Ctx = Context<SessionEnv>;

async function seededLearner(c: Ctx, body: MomentRequest, now: number): Promise<Learner> {
  // The phone's region first; the connection's country when the phone has none.
  const country = body.country ?? c.req.header('cf-ipcountry') ?? null;
  return ensureLearner(
    c.env.DB,
    c.var.userId,
    {
      firstLanguage: body.firstLanguage,
      country: country && /^[A-Z]{2}$/.test(country) && country !== 'XX' ? country : null,
      timezone: body.timezone,
    },
    now,
  );
}

async function newFixed(
  db: D1Database,
  learner: Learner,
  source: 'first' | 'free',
  plan: MomentPlan,
  hour: number,
  now: number,
): Promise<Moment> {
  const id = `mo_${crypto.randomUUID().replaceAll('-', '')}`;
  await insertMoment(
    db,
    { id, userId: learner.userId, status: 'ready', source, plan, plannedHour: hour },
    now,
  );
  return {
    id,
    userId: learner.userId,
    status: 'ready',
    source,
    plan,
    plannedHour: hour,
    createdAt: now,
    playedAt: null,
  };
}

function next(c: Ctx, m: Moment, learner: Learner) {
  const plan = m.plan!;
  const card: MomentCard = {
    id: m.id,
    source: m.source,
    place: plan.place,
    variant: plan.variant,
    speaker: PLACES[plan.place].resident,
    titleOpen: plan.title_open,
    stage: plan.stage_aimed,
  };
  // A learner the judge has placed plays at their own stage even in a fixed moment.
  if (m.source !== 'director') card.stage = stageOfModel(learner) ?? card.stage;
  return respond(c, NextMoment, { moment: card, planning: false, name: learner.name });
}

const wire = (p: Painting): PaintingWire => ({
  id: p.id,
  callId: p.callId,
  place: p.place,
  variant: p.variant,
  hour: p.hour,
  localDate: p.localDate,
  weather: p.weather,
  speaker: p.speaker as PaintingWire['speaker'],
  titleOpen: p.titleOpen,
  title: p.title,
  keptAt: p.keptAt,
  status: p.status,
  cut: p.cut,
  canDos: [...p.canDos],
  words: [...p.words],
  learned: p.learned,
});

export { readLearner };
