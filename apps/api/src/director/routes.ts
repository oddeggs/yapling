import {
  Arrival,
  MomentRequest,
  NextMoment,
  type MomentBridge,
  OpaqueId,
  Painting as PaintingWire,
  PaintingLines,
  PaintingList,
  VisitRequest,
  type MomentCard,
} from '@yapling/contracts';
import { isPlaceId, localTime, openVariants, PLACES, residentIn } from '@yapling/scene';
import { Hono, type Context } from 'hono';

import { errorResponse, parseBody, respond, type SessionEnv } from '../auth';
import type { TranscriptFile } from '../call/transcript';
import { judgedLines } from '../call/moment-session';
import { firstMoment, freeMoment, visitMoment } from './fixed';
import { ensureAhead } from './jobs';
import type { MomentPlan } from './moment';
import { playableAt, stageFor } from './plan';
import { chapterLine } from './story';
import {
  countMoments,
  ensureLearner,
  firstSince,
  finishPlanning,
  insertMoment,
  listPaintings,
  listStories,
  openMoments,
  readLearner,
  readPainting,
  readStory,
  saveArrival,
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

  routes.put('/me/arrival', async (c) => {
    const body = await parseBody(c, Arrival);
    if (!body.ok) return body.response;
    const now = Date.now();
    const learner = await seededLearner(c, body.value, now);
    await saveArrival(c.env.DB, learner.userId, body.value, now);
    // The first story is written while the learner plays the first conversation with Pip.
    await ensureAhead(c.env, learner.userId, null, now);
    return c.body(null, 204);
  });

  routes.post('/me/moments/next', async (c) => {
    const body = await parseBody(c, MomentRequest);
    if (!body.ok) return body.response;
    const now = Date.now();
    const learner = await seededLearner(c, body.value, now);
    if (learner.arrival === null) {
      return respond(c, NextMoment, { moment: null, planning: false, name: null, arrived: false });
    }
    const t = localTime(new Date(now), learner.timezone);
    const open = await openMoments(c.env.DB, learner.userId);

    // The very first conversation: Pip in the burrow.
    const first = open.find((m) => m.source === 'first' && m.status === 'ready');
    if (first?.plan) return next(c, first, learner, now);
    if (!(await firstSince(c.env.DB, learner.userId, learner.arrivedAt ?? 0))) {
      const moment = await newFixed(
        c.env.DB,
        learner,
        'first',
        firstMoment(t.hour, learner.firstLanguage, learner.name, stageFor(learner)),
        t.hour,
        now,
      );
      await ensureAhead(c.env, learner.userId, null, now);
      return next(c, moment, learner, now);
    }

    const ready = open.find((m) => m.status === 'ready' && m.source === 'director' && m.plan);
    if (ready?.plan) {
      const playable = atThisHour(ready.plan, t.hour);
      if (playable) {
        if (playable !== ready.plan) await updatePlan(c.env.DB, ready.id, playable);
        return next(c, { ...ready, plan: playable }, learner, now);
      }
      // Its neighbour has gone home since: the director writes one for now instead.
      await finishPlanning(c.env.DB, ready.id, { failed: true });
      await c.env.DB.prepare(`UPDATE moments SET status = 'failed' WHERE id = ?`)
        .bind(ready.id)
        .run();
    }
    await ensureAhead(c.env, learner.userId, null, now);
    return respond(c, NextMoment, {
      moment: null,
      planning: true,
      name: learner.name,
      arrived: true,
    });
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
      freeMoment(
        t.hour,
        learner.name,
        learner.firstLanguage,
        await countMoments(c.env.DB, learner.userId),
        stageFor(learner),
      ),
      t.hour,
      now,
    );
    return next(c, moment, learner, now);
  });

  routes.post('/me/moments/visit', async (c) => {
    const body = await parseBody(c, VisitRequest);
    if (!body.ok) return body.response;
    const { place, variant } = body.value;
    if (!isPlaceId(place)) return errorResponse(c, 404, 'not_found');
    const now = Date.now();
    const learner = await seededLearner(c, body.value, now);
    const t = localTime(new Date(now), learner.timezone);
    if (!residentIn(place, variant, t.hour)) return errorResponse(c, 409, 'not_found');
    const [story] = await listStories(c.env.DB, learner.userId, 1);
    const moment = await newFixed(
      c.env.DB,
      learner,
      'free',
      visitMoment(
        place,
        variant,
        t.hour,
        learner.name,
        story?.status === 'active' ? story.outline : null,
        stageFor(learner),
      ),
      t.hour,
      now,
    );
    return next(c, moment, learner, now);
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

async function seededLearner(
  c: Ctx,
  body: Pick<MomentRequest, 'country' | 'firstLanguage' | 'timezone'>,
  now: number,
): Promise<Learner> {
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
    storyId: null,
    sceneNo: null,
    followed: false,
  };
}

/**
 * A ready plan at this hour: as written, or moved to another variant of the same place whose
 * neighbour is in now; null when nobody there is in.
 */
function atThisHour(plan: MomentPlan, hour: number): MomentPlan | null {
  if (playableAt(plan, hour)) return plan;
  const variant = openVariants(plan.place, hour)[0];
  return variant === undefined ? null : { ...plan, variant };
}

async function updatePlan(db: D1Database, id: string, plan: MomentPlan): Promise<void> {
  await db
    .prepare('UPDATE moments SET plan = ?2, variant = ?3 WHERE id = ?1')
    .bind(id, JSON.stringify(plan), plan.variant)
    .run();
}

async function next(c: Ctx, m: Moment, learner: Learner, now: number) {
  const plan = m.plan!;
  let bridge: MomentBridge | null = null;
  if (m.storyId && m.sceneNo && plan.bridge_card) {
    const story = await readStory(c.env.DB, learner.userId, m.storyId);
    bridge = {
      card: plan.bridge_card.slice(0, 80),
      chapter: story?.outline ? chapterLine(story.outline, m.sceneNo) : null,
      lines: plan.card.map((l) => l.slice(0, 200)).slice(0, 4),
      gloss: plan.card_gloss ? plan.card_gloss.slice(0, 800) : null,
    };
  }
  const card: MomentCard = {
    id: m.id,
    source: m.source,
    place: plan.place,
    variant: plan.variant,
    speaker: PLACES[plan.place].resident,
    titleOpen: plan.title_open,
    stage: m.source === 'director' ? plan.stage_aimed : stageFor(learner),
    bridge,
  };
  void now;
  return respond(c, NextMoment, {
    moment: card,
    planning: false,
    name: learner.name,
    arrived: true,
  });
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
