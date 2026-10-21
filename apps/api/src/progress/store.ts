import { Progress } from '@yapling/contracts';

import { dayIndex, localDate } from './days';

/** Reads and writes on `progress`. */

type Lists = Pick<Progress, 'phrases' | 'errorTargets' | 'canDos' | 'keepsakes' | 'weeks'>;

interface ProgressRow {
  revision: number;
  installed_on: string;
  phrases: string;
  error_targets: string;
  can_dos: string;
  keepsakes: string;
  weeks: string;
}

const EMPTY: Lists = { phrases: [], errorTargets: [], canDos: [], keepsakes: [], weeks: [] };

/** The learner's timezone from the profile; UTC before onboarding. */
async function timeZoneOf(db: D1Database, userId: string): Promise<string> {
  const row = await db
    .prepare('SELECT timezone FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first<{ timezone: string }>();
  return row?.timezone ?? 'UTC';
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
  });
}

function listValues(lists: Lists) {
  return [
    JSON.stringify(lists.phrases),
    JSON.stringify(lists.errorTargets),
    JSON.stringify(lists.canDos),
    JSON.stringify(lists.keepsakes),
    JSON.stringify(lists.weeks),
  ] as const;
}

/** The learner's progress; a first read starts it empty at revision 1, installed today. */
export async function readProgress(db: D1Database, userId: string, now: number): Promise<Progress> {
  const today = localDate(now, await timeZoneOf(db, userId));
  await db
    .prepare(
      `INSERT INTO progress (user_id, revision, installed_on, phrases, error_targets, can_dos,
         keepsakes, weeks, updated_at)
       VALUES (?1, 1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
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
  const today = localDate(now, await timeZoneOf(db, userId));
  const row = await db
    .prepare(
      `UPDATE progress SET revision = revision + 1, phrases = ?3, error_targets = ?4,
         can_dos = ?5, keepsakes = ?6, weeks = ?7, updated_at = ?8
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
