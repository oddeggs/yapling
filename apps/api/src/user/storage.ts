import type { Plan } from '@yapling/contracts';

import type { TalkKind } from './ledger';
import type { PushPayload, ScheduledPushKind } from './jobs';

/*
 * The learner object's own SQLite: the ledger's state and usage per period, and the pushes
 * scheduled for later.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  started_at INTEGER NOT NULL,
  plan TEXT NOT NULL,
  plan_period_start INTEGER NOT NULL,
  timezone TEXT,
  installed_on TEXT,
  story_started_on TEXT
);
CREATE TABLE IF NOT EXISTS usage (
  period_start INTEGER NOT NULL,
  plan TEXT NOT NULL,
  learner_seconds INTEGER NOT NULL,
  character_seconds INTEGER NOT NULL,
  PRIMARY KEY (period_start, plan)
);
CREATE TABLE IF NOT EXISTS scheduled (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  due INTEGER NOT NULL,
  scheduled_for INTEGER NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS scheduled_due_idx ON scheduled (due);
`;

/** Usage is kept about a year, for support questions; older periods go. */
const KEEP_USAGE_MS = 400 * 24 * 60 * 60_000;

export interface StoredLedger {
  readonly startedAt: number;
  readonly plan: Plan;
  /** When the purchase's period started, as the purchases report it. */
  readonly planPeriodStart: number;
  /** The learner's timezone and install day, pinned from their profile; null until then. */
  readonly zone: { readonly timezone: string; readonly installedOn: string } | null;
  /** The day the story started, pinned once it has; null until then. */
  readonly storyStartedOn: string | null;
}

export interface ScheduledPush {
  readonly id: string;
  readonly kind: ScheduledPushKind;
  readonly due: number;
  readonly scheduledFor: number;
  readonly payload: PushPayload;
}

export class UserStorage {
  constructor(private readonly sql: SqlStorage) {
    this.migrate();
  }

  migrate(): void {
    this.sql.exec(SCHEMA);
    // Objects made before the ledger pinned its timezone gain the columns.
    const columns = this.sql
      .exec<{ name: string }>("SELECT name FROM pragma_table_info('ledger')")
      .toArray()
      .map((c) => c.name);
    if (!columns.includes('timezone')) {
      this.sql.exec('ALTER TABLE ledger ADD COLUMN timezone TEXT');
      this.sql.exec('ALTER TABLE ledger ADD COLUMN installed_on TEXT');
    }
    // And those made before it pinned the story's start.
    if (!columns.includes('story_started_on')) {
      this.sql.exec('ALTER TABLE ledger ADD COLUMN story_started_on TEXT');
    }
  }

  ledger(): StoredLedger | null {
    const row = this.sql
      .exec<{
        started_at: number;
        plan: string;
        plan_period_start: number;
        timezone: string | null;
        installed_on: string | null;
        story_started_on: string | null;
      }>(
        `SELECT started_at, plan, plan_period_start, timezone, installed_on, story_started_on
         FROM ledger WHERE id = 1`,
      )
      .toArray()[0];
    if (row === undefined) return null;
    return {
      startedAt: row.started_at,
      plan: row.plan === 'plus' ? 'plus' : 'free',
      planPeriodStart: row.plan_period_start,
      zone:
        row.timezone !== null && row.installed_on !== null
          ? { timezone: row.timezone, installedOn: row.installed_on }
          : null,
      storyStartedOn: row.story_started_on,
    };
  }

  /** Pins the day the story started; once pinned it doesn't move. */
  pinStoryStart(storyStartedOn: string): void {
    this.sql.exec(
      'UPDATE ledger SET story_started_on = ? WHERE id = 1 AND story_started_on IS NULL',
      storyStartedOn,
    );
  }

  /** Pins the ledger's timezone and install day; once pinned they don't move. */
  pinZone(timezone: string, installedOn: string): void {
    this.sql.exec(
      'UPDATE ledger SET timezone = ?, installed_on = ? WHERE id = 1 AND timezone IS NULL',
      timezone,
      installedOn,
    );
  }

  startLedger(startedAt: number): StoredLedger {
    this.sql.exec(
      `INSERT INTO ledger (id, started_at, plan, plan_period_start) VALUES (1, ?, 'free', ?)
       ON CONFLICT (id) DO NOTHING`,
      startedAt,
      startedAt,
    );
    const ledger = this.ledger();
    if (ledger === null) throw new Error('the ledger was not started');
    return ledger;
  }

  setPlan(plan: Plan, periodStart: number): void {
    this.sql.exec(
      'UPDATE ledger SET plan = ?, plan_period_start = ? WHERE id = 1',
      plan,
      periodStart,
    );
  }

  usedSeconds(periodStart: number, plan: Plan): number {
    const row = this.sql
      .exec<{ used: number }>(
        `SELECT learner_seconds + character_seconds AS used FROM usage
         WHERE period_start = ? AND plan = ?`,
        periodStart,
        plan,
      )
      .toArray()[0];
    return row?.used ?? 0;
  }

  addUsage(periodStart: number, plan: Plan, kind: TalkKind, seconds: number, now: number): void {
    const learner = kind === 'learner' ? seconds : 0;
    const character = kind === 'character' ? seconds : 0;
    this.sql.exec(
      `INSERT INTO usage (period_start, plan, learner_seconds, character_seconds)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (period_start, plan) DO UPDATE SET
         learner_seconds = learner_seconds + ?3, character_seconds = character_seconds + ?4`,
      periodStart,
      plan,
      learner,
      character,
    );
    this.sql.exec('DELETE FROM usage WHERE period_start < ?', now - KEEP_USAGE_MS);
  }

  schedule(push: ScheduledPush): void {
    this.sql.exec(
      'INSERT INTO scheduled (id, kind, due, scheduled_for, payload) VALUES (?, ?, ?, ?, ?)',
      push.id,
      push.kind,
      push.due,
      push.scheduledFor,
      JSON.stringify(push.payload),
    );
  }

  cancel(id: string): boolean {
    return this.sql.exec('DELETE FROM scheduled WHERE id = ?', id).rowsWritten > 0;
  }

  /** Moves a push later (quiet hours). */
  postpone(id: string, due: number): void {
    this.sql.exec('UPDATE scheduled SET due = ? WHERE id = ?', due, id);
  }

  due(now: number): ScheduledPush[] {
    return this.sql
      .exec<{ id: string; kind: string; due: number; scheduled_for: number; payload: string }>(
        'SELECT id, kind, due, scheduled_for, payload FROM scheduled WHERE due <= ? ORDER BY due',
        now,
      )
      .toArray()
      .map((row) => ({
        id: row.id,
        kind: row.kind as ScheduledPushKind,
        due: row.due,
        scheduledFor: row.scheduled_for,
        payload: JSON.parse(row.payload) as PushPayload,
      }));
  }

  nextDue(): number | null {
    const row = this.sql
      .exec<{ due: number | null }>('SELECT MIN(due) AS due FROM scheduled')
      .toArray()[0];
    return row?.due ?? null;
  }

  pending(): ScheduledPush[] {
    return this.due(Number.MAX_SAFE_INTEGER);
  }
}
