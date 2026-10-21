import {
  LIMITS,
  MemoryItem,
  type MemoryCategory,
  type MemoryCreate,
  type MemoryUpdate,
} from '@yapling/contracts';

/** Reads and writes on `memory_items`, always within one learner's items. */

interface MemoryRow {
  id: string;
  text: string;
  category: string;
  source_call_id: string | null;
  created_at: number;
}

function fromRow(row: MemoryRow): MemoryItem {
  return MemoryItem.parse({
    id: row.id,
    text: row.text,
    category: row.category,
    createdAt: row.created_at,
    sourceCallId: row.source_call_id,
  });
}

const COLUMNS = 'id, text, category, source_call_id, created_at';

/** Everything, newest first. */
export async function listMemory(db: D1Database, userId: string): Promise<MemoryItem[]> {
  const { results } = await db
    .prepare(
      `SELECT ${COLUMNS} FROM memory_items WHERE user_id = ?
       ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    )
    .bind(userId, LIMITS.memoryItemsMax)
    .all<MemoryRow>();
  return results.map(fromRow);
}

export interface NewMemory extends MemoryCreate {
  /** The call it came from; null when the learner wrote it. */
  readonly sourceCallId: string | null;
}

/**
 * Adds an item: the learner's own (`POST`), or one the post-call summary found. Null when the
 * learner already keeps the most items allowed.
 */
export async function addMemory(
  db: D1Database,
  userId: string,
  input: NewMemory,
  now: number,
): Promise<MemoryItem | null> {
  const row = await db
    .prepare(
      `INSERT INTO memory_items (id, user_id, text, category, source_call_id, created_at, updated_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?6
       WHERE (SELECT COUNT(*) FROM memory_items WHERE user_id = ?2) < ?7
       RETURNING ${COLUMNS}`,
    )
    .bind(
      `m_${crypto.randomUUID()}`,
      userId,
      input.text,
      input.category,
      input.sourceCallId,
      now,
      LIMITS.memoryItemsMax,
    )
    .first<MemoryRow>();
  return row === null ? null : fromRow(row);
}

/** Changes the text, the category or both; null when the learner has no such item. */
export async function editMemory(
  db: D1Database,
  userId: string,
  id: string,
  update: MemoryUpdate,
  now: number,
): Promise<MemoryItem | null> {
  const category: MemoryCategory | null = update.category ?? null;
  const row = await db
    .prepare(
      `UPDATE memory_items
       SET text = COALESCE(?3, text), category = COALESCE(?4, category), updated_at = ?5
       WHERE id = ?1 AND user_id = ?2
       RETURNING ${COLUMNS}`,
    )
    .bind(id, userId, update.text ?? null, category, now)
    .first<MemoryRow>();
  return row === null ? null : fromRow(row);
}

/** Forgets an item. Forgetting one already gone is not an error. */
export async function deleteMemory(db: D1Database, userId: string, id: string): Promise<void> {
  await db.prepare('DELETE FROM memory_items WHERE id = ? AND user_id = ?').bind(id, userId).run();
}
