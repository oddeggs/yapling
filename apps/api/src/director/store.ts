import type { Arrival } from '@yapling/contracts';
import type { PlaceId } from '@yapling/scene';

import { isCompanion, type CompanionId } from '../curriculum/companion';
import { START, type Progress } from '../curriculum/progress';
import type { MomentPlan } from './moment';

/** Reads and writes on `learners`, `moments` and `paintings`, always within one learner's rows. */

// ---------- learners ----------

export interface Learner {
  readonly userId: string;
  readonly name: string | null;
  readonly firstLanguage: string;
  readonly country: string | null;
  readonly timezone: string;
  /** The judge's learner model, or null before the first conversation. */
  readonly model: LearnerModel | null;
  readonly openThreads: readonly string[];
  /** What they told the town on arrival; null until they have arrived. */
  readonly arrival: Arrival | null;
  readonly arrivedAt: number | null;
  /** The companion they chose; null until they have. */
  readonly companion: CompanionId | null;
  /** Where they are in the syllabus. */
  readonly progress: Progress;
  readonly createdAt: number;
}

export interface LearnerModel {
  readonly cefr: string;
  readonly stage: string;
  readonly confidence: string;
  readonly level_evidence: readonly string[];
  readonly errors: readonly { pattern: string; example: string }[];
  readonly interests: readonly { topic: string; evidence: string }[];
  readonly life_context: string;
  readonly culture: string;
  readonly personality: string;
  readonly what_engages: string;
}

interface LearnerRow {
  user_id: string;
  name: string | null;
  first_language: string;
  country: string | null;
  timezone: string;
  model: string | null;
  open_threads: string;
  arrival: string | null;
  arrived_at: number | null;
  companion: string | null;
  curriculum: string | null;
  created_at: number;
}

const parse = <T>(text: string | null, fallback: T): T => {
  if (text === null) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

const learnerOf = (row: LearnerRow): Learner => ({
  userId: row.user_id,
  name: row.name,
  firstLanguage: row.first_language,
  country: row.country,
  timezone: row.timezone,
  model: parse<LearnerModel | null>(row.model, null),
  openThreads: parse<string[]>(row.open_threads, []),
  arrival: parse<Arrival | null>(row.arrival, null),
  arrivedAt: row.arrived_at,
  companion: isCompanion(row.companion) ? row.companion : null,
  progress: parse<Progress>(row.curriculum, START),
  createdAt: row.created_at,
});

export async function readLearner(db: D1Database, userId: string): Promise<Learner | null> {
  const row = await db
    .prepare('SELECT * FROM learners WHERE user_id = ?')
    .bind(userId)
    .first<LearnerRow>();
  return row === null ? null : learnerOf(row);
}

export interface LearnerSeed {
  readonly firstLanguage: string;
  readonly country: string | null;
  readonly timezone: string;
}

/**
 * The learner's record, made on their first open from what the phone and request say (language,
 * region, timezone); later opens refresh the timezone and fill a missing country.
 */
export async function ensureLearner(
  db: D1Database,
  userId: string,
  seed: LearnerSeed,
  now: number,
): Promise<Learner> {
  const row = await db
    .prepare(
      `INSERT INTO learners (user_id, first_language, country, timezone, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)
       ON CONFLICT (user_id) DO UPDATE SET
         timezone = excluded.timezone,
         country = COALESCE(learners.country, excluded.country),
         updated_at = excluded.updated_at
       RETURNING *`,
    )
    .bind(userId, seed.firstLanguage, seed.country, seed.timezone, now)
    .first<LearnerRow>();
  if (row === null) throw new Error('learner upsert returned nothing');
  return learnerOf(row);
}

/**
 * After a moment: the learner model and threads. The judge's name only fills an empty one: a
 * misheard line must not rename the learner.
 */
export async function saveLearnerModel(
  db: D1Database,
  userId: string,
  update: { model: LearnerModel; openThreads: readonly string[]; name: string | null },
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE learners SET model = ?2, open_threads = ?3, name = COALESCE(name, ?4), updated_at = ?5
       WHERE user_id = ?1`,
    )
    .bind(
      userId,
      JSON.stringify(update.model),
      JSON.stringify(update.openThreads.slice(0, 2)),
      update.name,
      now,
    )
    .run();
}

/** The learner arrived: what they told the town, and the name they typed (never misheard). */
export async function saveArrival(
  db: D1Database,
  userId: string,
  arrival: Arrival,
  now: number,
): Promise<void> {
  await db
    .prepare(
      'UPDATE learners SET arrival = ?2, name = ?3, arrived_at = ?4, updated_at = ?4 WHERE user_id = ?1',
    )
    .bind(userId, JSON.stringify(arrival), arrival.name, now)
    .run();
}

/** The companion the learner chose at the end of arriving (or switched to later). */
export async function saveCompanion(
  db: D1Database,
  userId: string,
  companion: CompanionId,
  now: number,
): Promise<void> {
  await db
    .prepare('UPDATE learners SET companion = ?2, updated_at = ?3 WHERE user_id = ?1')
    .bind(userId, companion, now)
    .run();
}

export async function saveProgress(
  db: D1Database,
  userId: string,
  progress: Progress,
  now: number,
): Promise<void> {
  await db
    .prepare('UPDATE learners SET curriculum = ?2, updated_at = ?3 WHERE user_id = ?1')
    .bind(userId, JSON.stringify(progress), now)
    .run();
}

/** The learner's own edit: "call me…" from settings. */
export async function setLearnerName(
  db: D1Database,
  userId: string,
  name: string | null,
  now: number,
): Promise<void> {
  await db
    .prepare('UPDATE learners SET name = ?2, updated_at = ?3 WHERE user_id = ?1')
    .bind(userId, name, now)
    .run();
}

// ---------- moments ----------

export type MomentStatus = 'planning' | 'ready' | 'played' | 'failed';
export type MomentSource = 'director' | 'first' | 'free';

export interface Moment {
  readonly id: string;
  readonly userId: string;
  readonly status: MomentStatus;
  readonly source: MomentSource;
  readonly plan: MomentPlan | null;
  readonly plannedHour: number | null;
  readonly createdAt: number;
  readonly playedAt: number | null;
  /** The story and scene (1-based) a director moment tells; null for fixed moments. */
  readonly storyId: string | null;
  readonly sceneNo: number | null;
  /** Rewritten after the scene before it was played, so it follows on from what happened. */
  readonly followed: boolean;
}

interface MomentRow {
  id: string;
  user_id: string;
  status: string;
  source: string;
  plan: string | null;
  planned_hour: number | null;
  created_at: number;
  played_at: number | null;
  story_id: string | null;
  scene_no: number | null;
  followed: number;
}

const momentOf = (row: MomentRow): Moment => ({
  id: row.id,
  userId: row.user_id,
  status: row.status as MomentStatus,
  source: row.source as MomentSource,
  plan: parse<MomentPlan | null>(row.plan, null),
  plannedHour: row.planned_hour,
  createdAt: row.created_at,
  playedAt: row.played_at,
  storyId: row.story_id,
  sceneNo: row.scene_no,
  followed: row.followed === 1,
});

export async function insertMoment(
  db: D1Database,
  m: {
    id: string;
    userId: string;
    status: MomentStatus;
    source: MomentSource;
    plan: MomentPlan | null;
    plannedHour: number | null;
    costUsd?: number;
    storyId?: string | null;
    sceneNo?: number | null;
  },
  now: number,
): Promise<boolean> {
  // A second plan for the same learner while one is being written is dropped (a unique index).
  const r = await db
    .prepare(
      `INSERT INTO moments (id, user_id, status, source, place, variant, plan, planned_hour, created_at, cost_usd, story_id, scene_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING`,
    )
    .bind(
      m.id,
      m.userId,
      m.status,
      m.source,
      m.plan?.place ?? null,
      m.plan?.variant ?? null,
      m.plan === null ? null : JSON.stringify(m.plan),
      m.plannedHour,
      now,
      m.costUsd ?? 0,
      m.storyId ?? null,
      m.sceneNo ?? null,
    )
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/** Plans still "planning" long after they should have finished: their job died. */
export async function failStalePlans(
  db: D1Database,
  userId: string,
  olderThan: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE moments SET status = 'failed'
       WHERE user_id = ? AND status = 'planning' AND created_at < ?`,
    )
    .bind(userId, olderThan)
    .run();
}

/** A ready scene rewritten to follow on from the one just played (only while still unplayed). */
export async function followUp(db: D1Database, id: string, plan: MomentPlan): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE moments SET plan = ?2, followed = 1 WHERE id = ?1 AND status = 'ready' AND followed = 0`,
    )
    .bind(id, JSON.stringify(plan))
    .run();
  return (r.meta.changes ?? 0) > 0;
}

/** When the learner last finished a moment (epoch ms), or null. */
export async function lastPlayedAt(db: D1Database, userId: string): Promise<number | null> {
  const row = await db
    .prepare(`SELECT MAX(played_at) AS t FROM moments WHERE user_id = ? AND status = 'played'`)
    .bind(userId)
    .first<{ t: number | null }>();
  return row?.t ?? null;
}

/** The scenes of a story played so far, in order. */
export async function storyScenes(
  db: D1Database,
  userId: string,
  storyId: string,
): Promise<Moment[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM moments WHERE user_id = ? AND story_id = ? AND status = 'played'
       ORDER BY scene_no ASC, played_at ASC`,
    )
    .bind(userId, storyId)
    .all<MomentRow>();
  return results.map(momentOf);
}

export async function finishPlanning(
  db: D1Database,
  id: string,
  result: { plan: MomentPlan; plannedHour: number; costUsd: number } | { failed: true },
): Promise<void> {
  if ('failed' in result) {
    await db
      .prepare(`UPDATE moments SET status = 'failed' WHERE id = ? AND status = 'planning'`)
      .bind(id)
      .run();
    return;
  }
  await db
    .prepare(
      `UPDATE moments SET status = 'ready', plan = ?2, place = ?3, variant = ?4, planned_hour = ?5, cost_usd = ?6
       WHERE id = ?1 AND status = 'planning'`,
    )
    .bind(
      id,
      JSON.stringify(result.plan),
      result.plan.place,
      result.plan.variant,
      result.plannedHour,
      result.costUsd,
    )
    .run();
}

export async function readMoment(
  db: D1Database,
  userId: string,
  id: string,
): Promise<Moment | null> {
  const row = await db
    .prepare('SELECT * FROM moments WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<MomentRow>();
  return row === null ? null : momentOf(row);
}

/** The newest moments not yet played (ready or still planning), newest first. */
export async function openMoments(db: D1Database, userId: string): Promise<Moment[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM moments WHERE user_id = ? AND status IN ('ready', 'planning')
       ORDER BY created_at DESC LIMIT 5`,
    )
    .bind(userId)
    .all<MomentRow>();
  return results.map(momentOf);
}

/** The plans of the last `limit` moments played, newest first: what the director just told. */
export async function recentPlans(
  db: D1Database,
  userId: string,
  limit: number,
): Promise<MomentPlan[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM moments WHERE user_id = ? AND status = 'played' AND plan IS NOT NULL
       ORDER BY played_at DESC LIMIT ?`,
    )
    .bind(userId, limit)
    .all<MomentRow>();
  return results.map(momentOf).flatMap((m) => (m.plan ? [m.plan] : []));
}

export async function markPlayed(
  db: D1Database,
  id: string,
  callId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(`UPDATE moments SET status = 'played', played_at = ?2, call_id = ?3 WHERE id = ?1`)
    .bind(id, now, callId)
    .run();
}

/** Whether the first conversation with Pip was made since the learner arrived. */
export async function firstSince(db: D1Database, userId: string, since: number): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS x FROM moments WHERE user_id = ? AND source = 'first' AND created_at >= ?`,
    )
    .bind(userId, since)
    .first<{ x: number }>();
  return row !== null;
}

export async function countMoments(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM moments WHERE user_id = ? AND status = 'played'`)
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// ---------- paintings ----------

export interface Painting {
  readonly id: string;
  readonly momentId: string;
  readonly callId: string;
  readonly place: PlaceId;
  readonly variant: number;
  readonly hour: number;
  readonly localDate: string;
  readonly weather: string;
  readonly speaker: string;
  readonly titleOpen: string;
  readonly title: string;
  readonly keptAt: number;
  readonly status: 'judging' | 'done' | 'failed';
  readonly cut: boolean;
  readonly canDos: readonly string[];
  readonly words: readonly PaintingWord[];
  readonly learned: string | null;
  readonly record: SessionRecord | null;
  /** The look-back's one thing to fix: what they said, and a better way. */
  readonly fix: { said: string; better: string } | null;
}

export interface PaintingWord {
  readonly phrase: string;
  readonly line: string;
}

/** What the judge keeps of one conversation for the director's story memory. */
export interface SessionRecord {
  readonly summary: string;
  readonly remember: readonly string[];
  readonly threads_open: readonly string[];
  readonly level_this_session: string;
  readonly engagement: number;
}

interface PaintingRow {
  id: string;
  moment_id: string;
  call_id: string;
  place: string;
  variant: number;
  hour: number;
  local_date: string;
  weather: string;
  speaker: string;
  title_open: string;
  title: string;
  kept_at: number;
  status: string;
  cut: number;
  can_dos: string;
  words: string;
  learned: string | null;
  record: string | null;
  fix: string | null;
}

const paintingOf = (row: PaintingRow): Painting => ({
  id: row.id,
  momentId: row.moment_id,
  callId: row.call_id,
  place: row.place as PlaceId,
  variant: row.variant,
  hour: row.hour,
  localDate: row.local_date,
  weather: row.weather,
  speaker: row.speaker,
  titleOpen: row.title_open,
  title: row.title,
  keptAt: row.kept_at,
  status: row.status as Painting['status'],
  cut: row.cut === 1,
  canDos: parse<string[]>(row.can_dos, []),
  words: parse<PaintingWord[]>(row.words, []),
  learned: row.learned,
  record: parse<SessionRecord | null>(row.record, null),
  fix: parse<{ said: string; better: string } | null>(row.fix, null),
});

export type NewPainting = Omit<
  Painting,
  'status' | 'canDos' | 'words' | 'learned' | 'record' | 'fix'
>;

/** Keeps a painting when its conversation ends; the judge fills in the rest. Idempotent per call. */
export async function insertPainting(
  db: D1Database,
  userId: string,
  p: NewPainting,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO paintings (id, user_id, moment_id, call_id, place, variant, hour, local_date, weather,
         speaker, title_open, title, kept_at, status, cut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'judging', ?)
       ON CONFLICT (call_id) DO NOTHING`,
    )
    .bind(
      p.id,
      userId,
      p.momentId,
      p.callId,
      p.place,
      p.variant,
      p.hour,
      p.localDate,
      p.weather,
      p.speaker,
      p.titleOpen,
      p.title,
      p.keptAt,
      p.cut ? 1 : 0,
    )
    .run();
}

export async function finishPainting(
  db: D1Database,
  callId: string,
  judged:
    | {
        canDos: readonly string[];
        words: readonly PaintingWord[];
        learned: string | null;
        record: SessionRecord;
        fix?: { said: string; better: string } | null;
      }
    | { failed: true },
): Promise<void> {
  if ('failed' in judged) {
    await db.prepare(`UPDATE paintings SET status = 'failed' WHERE call_id = ?`).bind(callId).run();
    return;
  }
  await db
    .prepare(
      `UPDATE paintings SET status = 'done', can_dos = ?2, words = ?3, learned = ?4, record = ?5, fix = ?6
       WHERE call_id = ?1`,
    )
    .bind(
      callId,
      JSON.stringify(judged.canDos),
      JSON.stringify(judged.words),
      judged.learned,
      JSON.stringify(judged.record),
      judged.fix ? JSON.stringify(judged.fix) : null,
    )
    .run();
}

export async function paintingByCall(
  db: D1Database,
  userId: string,
  callId: string,
): Promise<Painting | null> {
  const row = await db
    .prepare('SELECT * FROM paintings WHERE call_id = ? AND user_id = ?')
    .bind(callId, userId)
    .first<PaintingRow>();
  return row === null ? null : paintingOf(row);
}

export async function readPainting(
  db: D1Database,
  userId: string,
  id: string,
): Promise<Painting | null> {
  const row = await db
    .prepare('SELECT * FROM paintings WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<PaintingRow>();
  return row === null ? null : paintingOf(row);
}

/** The wall, newest first. */
export async function listPaintings(
  db: D1Database,
  userId: string,
  limit = 200,
): Promise<Painting[]> {
  const { results } = await db
    .prepare('SELECT * FROM paintings WHERE user_id = ? ORDER BY kept_at DESC LIMIT ?')
    .bind(userId, limit)
    .all<PaintingRow>();
  return results.map(paintingOf);
}

export * from './stories-store';
