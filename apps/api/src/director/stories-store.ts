import type { StoryOutline } from './story';

/** Reads and writes on `stories`, always within one learner's rows. */

const parse = <T>(text: string | null, fallback: T): T => {
  if (text === null) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

export type StoryStatus = 'planning' | 'active' | 'done' | 'failed';

export interface Story {
  readonly id: string;
  readonly userId: string;
  readonly status: StoryStatus;
  readonly outline: StoryOutline | null;
  readonly createdAt: number;
}

interface StoryRow {
  id: string;
  user_id: string;
  status: string;
  outline: string | null;
  created_at: number;
}

const storyOf = (row: StoryRow): Story => ({
  id: row.id,
  userId: row.user_id,
  status: row.status as StoryStatus,
  outline: parse<StoryOutline | null>(row.outline, null),
  createdAt: row.created_at,
});

export async function insertStory(
  db: D1Database,
  s: { id: string; userId: string; outline: StoryOutline; costUsd: number },
  now: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO stories (id, user_id, status, outline, created_at, updated_at, cost_usd)
       VALUES (?1, ?2, 'active', ?3, ?4, ?4, ?5)`,
    )
    .bind(s.id, s.userId, JSON.stringify(s.outline), now, s.costUsd)
    .run();
}

export async function readStory(db: D1Database, userId: string, id: string): Promise<Story | null> {
  const row = await db
    .prepare('SELECT * FROM stories WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<StoryRow>();
  return row === null ? null : storyOf(row);
}

/** The learner's stories, newest first. */
export async function listStories(db: D1Database, userId: string, limit = 6): Promise<Story[]> {
  const { results } = await db
    .prepare('SELECT * FROM stories WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .bind(userId, limit)
    .all<StoryRow>();
  return results.map(storyOf);
}

export async function setStoryStatus(
  db: D1Database,
  id: string,
  status: StoryStatus,
  now: number,
): Promise<void> {
  await db
    .prepare('UPDATE stories SET status = ?2, updated_at = ?3 WHERE id = ?1')
    .bind(id, status, now)
    .run();
}
