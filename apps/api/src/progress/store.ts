import { Progress, type SettlingProgress } from '@yapling/contracts';

import { dayIndex, LAUNCH_TIMEZONE, localDate } from './days';

/** Reads and writes on `progress`. */

/**
 * The lists a write sets. `settlingChaptersDone` left out keeps the saved chapters (an older app's
 * body never has them).
 */
type Lists = Pick<Progress, 'phrases' | 'errorTargets' | 'canDos' | 'keepsakes' | 'weeks'> & {
  readonly settlingChaptersDone?: SettlingProgress;
};

interface ProgressRow {
  revision: number;
  installed_on: string;
  phrases: string;
  error_targets: string;
  can_dos: string;
  keepsakes: string;
  weeks: string;
  settling_chapters_done: string;
}

const EMPTY: Lists = {
  phrases: [],
  errorTargets: [],
  canDos: [],
  keepsakes: [],
  weeks: [],
  settlingChaptersDone: [],
};

/**
 * The learner's timezone: the profile's; before onboarding, the phone's from the guest session;
 * else the launch timezone.
 */
export async function learnerTimeZone(db: D1Database, userId: string): Promise<string> {
  const row = await db
    .prepare(
      `SELECT COALESCE(p.timezone, u.timezone) AS timezone FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
    )
    .bind(userId)
    .first<{ timezone: string | null }>();
  return row?.timezone ?? LAUNCH_TIMEZONE;
}

/** A stored list, still unchecked: `Progress.parse` checks it. */
function json(text: string): unknown {
  return JSON.parse(text);
}

function fromRow(row: ProgressRow, today: string): Progress {
  return Progress.parse({
    revision: row.revision,
    installedOn: row.installed_on,
    dayIndex: dayIndex(row.installed_on, today),
    phrases: json(row.phrases),
    errorTargets: json(row.error_targets),
    canDos: json(row.can_dos),
    keepsakes: json(row.keepsakes),
    weeks: json(row.weeks),
    settlingChaptersDone: json(row.settling_chapters_done),
  });
}

function listValues(lists: Lists) {
  return [
    JSON.stringify(lists.phrases),
    JSON.stringify(lists.errorTargets),
    JSON.stringify(lists.canDos),
    JSON.stringify(lists.keepsakes),
    JSON.stringify(lists.weeks),
    // Null keeps the saved chapters.
    lists.settlingChaptersDone === undefined ? null : JSON.stringify(lists.settlingChaptersDone),
  ] as const;
}

/** The learner's progress; a first read starts it empty at revision 1, installed today. */
export async function readProgress(db: D1Database, userId: string, now: number): Promise<Progress> {
  const today = localDate(now, await learnerTimeZone(db, userId));
  await db
    .prepare(
      `INSERT INTO progress (user_id, revision, installed_on, phrases, error_targets, can_dos,
         keepsakes, weeks, settling_chapters_done, updated_at)
       VALUES (?1, 1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
       ON CONFLICT (user_id) DO NOTHING`,
    )
    .bind(userId, today, ...listValues(EMPTY), now)
    .run();
  const row = await db
    .prepare('SELECT * FROM progress WHERE user_id = ?')
    .bind(userId)
    .first<ProgressRow>();
  if (row === null) throw new Error('the progress row is missing');
  return fromRow(row, today);
}

export type WriteOutcome =
  | { readonly ok: true; readonly progress: Progress }
  | { readonly ok: false; readonly current: Progress };

/**
 * Writes the lists over `baseRevision` only, answering the stored progress at the next revision;
 * over any other revision nothing is written and the current progress comes back.
 */
export async function writeProgress(
  db: D1Database,
  userId: string,
  input: { baseRevision: number; lists: Lists },
  now: number,
): Promise<WriteOutcome> {
  const current = await readProgress(db, userId, now);
  if (current.revision !== input.baseRevision) return { ok: false, current };
  const today = localDate(now, await learnerTimeZone(db, userId));
  const row = await db
    .prepare(
      `UPDATE progress SET revision = revision + 1, phrases = ?3, error_targets = ?4,
         can_dos = ?5, keepsakes = ?6, weeks = ?7,
         settling_chapters_done = COALESCE(?8, settling_chapters_done), updated_at = ?9
       WHERE user_id = ?1 AND revision = ?2
       RETURNING *`,
    )
    .bind(userId, input.baseRevision, ...listValues(input.lists), now)
    .first<ProgressRow>();
  if (row === null) return { ok: false, current: await readProgress(db, userId, now) };
  return { ok: true, progress: fromRow(row, today) };
}

/**
 * A server-side change (the post-call job, the learning model): `change` maps the current progress
 * to the next, and runs again if another write landed in between.
 */
export async function updateProgress(
  db: D1Database,
  userId: string,
  change: (current: Progress) => Lists | Promise<Lists>,
  now: number,
): Promise<Progress> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await readProgress(db, userId, now);
    const lists = await change(current);
    const next = Progress.parse({ ...current, ...lists });
    const outcome = await writeProgress(
      db,
      userId,
      { baseRevision: current.revision, lists: next },
      now,
    );
    if (outcome.ok) return outcome.progress;
  }
  throw new Error('the progress kept changing under the update');
}

/** What a change applied once left (`updateProgressOnce`), or null when it hasn't been applied. */
export async function progressChange<T>(
  db: D1Database,
  userId: string,
  changeId: string,
): Promise<T | null> {
  const row = await db
    .prepare('SELECT data FROM progress_changes WHERE id = ? AND user_id = ?')
    .bind(changeId, userId)
    .first<{ data: string }>();
  return row === null ? null : (JSON.parse(row.data) as T);
}

/** What `updateProgressOnce` answers: whether this run applied the change, and what it left. */
export interface OnceOutcome<T> {
  readonly applied: boolean;
  readonly data: T;
}

/**
 * A server-side change applied at most once per `changeId` (a call id). The change's record and the
 * progress update land in one batch: the record is inserted only over the revision the change was
 * computed from, and the update only lands when that record now names the next revision. A later
 * run with the same id applies nothing and answers the data the first run left.
 */
export async function updateProgressOnce<T>(
  db: D1Database,
  userId: string,
  changeId: string,
  change: (current: Progress) => { readonly lists: Lists; readonly data: T },
  now: number,
): Promise<OnceOutcome<T>> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const done = await progressChange<T>(db, userId, changeId);
    if (done !== null) return { applied: false, data: done };
    const current = await readProgress(db, userId, now);
    const result = change(current);
    const next = Progress.parse({ ...current, ...result.lists });
    const base = current.revision;
    const [, update] = await db.batch([
      db
        .prepare(
          `INSERT INTO progress_changes (id, user_id, revision, data, created_at)
           SELECT ?1, ?2, ?3 + 1, ?4, ?5
           WHERE (SELECT revision FROM progress WHERE user_id = ?2) = ?3
           ON CONFLICT (id) DO NOTHING`,
        )
        .bind(changeId, userId, base, JSON.stringify(result.data), now),
      db
        .prepare(
          `UPDATE progress SET revision = revision + 1, phrases = ?3, error_targets = ?4,
             can_dos = ?5, keepsakes = ?6, weeks = ?7,
             settling_chapters_done = COALESCE(?8, settling_chapters_done), updated_at = ?9
           WHERE user_id = ?1 AND revision = ?2
             AND EXISTS (SELECT 1 FROM progress_changes
                         WHERE id = ?10 AND user_id = ?1 AND revision = ?2 + 1)`,
        )
        .bind(userId, base, ...listValues(next), now, changeId),
    ]);
    if ((update?.meta.changes ?? 0) === 1) return { applied: true, data: result.data };
  }
  throw new Error('the progress kept changing under the update');
}
