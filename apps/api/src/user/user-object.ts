import { MinutesSummary, Plan, QuietHours } from '@yapling/contracts';
import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';

import type { Bindings } from '../env';
import { ScheduledPushJob, ScheduledPushKind, PushPayload } from './jobs';
import {
  chargeResult,
  localLedgerRules,
  minutesSummary,
  type ChargeResult,
  type LedgerRules,
  type TalkKind,
} from './ledger';
import { isQuiet, quietEnds } from './quiet';
import { UserStorage, type ScheduledPush } from './storage';

/** The learner object's clock; tests move it. */
export const userClock = { now: (): number => Date.now() };

/** The ledger rules in force: `@yapling/domain`'s adapter replaces this (see `ledger.ts`). */
const rules: LedgerRules = localLedgerRules;

/** One charge is at most an hour: a call meters in small steps. */
const ChargeSeconds = z.int().min(0).max(3_600);
const TalkKindSchema = z.enum(['learner', 'character']);

export interface Scheduled {
  readonly id: string;
  readonly due: number;
}

interface QuietFacts {
  readonly quiet: QuietHours | null;
  readonly timeZone: string;
}

/**
 * One per learner, named by the user id (`userObject`): the live-minute ledger and the pushes the
 * server sends later. Other code calls it over RPC:
 *
 * - `charge(seconds, kind)`: the call object meters learner and character talk into the period.
 * - `balance()`: the period's `MinutesSummary`.
 * - `setPlan(plan, periodStart)`: purchases move the learner between free and Plus.
 * - `schedule(kind, at, payload)` / `cancel(id)`: a voicemail or incoming call for later. The
 *   alarm hands each due one to the `jobs` queue, unless it falls in the learner's quiet hours,
 *   when it waits for them to end.
 * - `erase()`: account deletion clears everything.
 */
export class UserDO extends DurableObject<Bindings> {
  private readonly store: UserStorage;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    this.store = new UserStorage(ctx.storage.sql);
  }

  override fetch(request: Request): Response {
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/health') {
      return Response.json({ status: 'ok', object: 'user' });
    }
    return Response.json({ error: { code: 'not_found' } }, { status: 404 });
  }

  /** The learner's id: the name the object was reached by. */
  private userId(): string {
    const name = this.ctx.id.name;
    if (name === undefined) throw new Error('a user object is reached by its user id');
    return name;
  }

  /** The ledger, started from the account's creation the first time it is needed. */
  private async ledger() {
    const stored = this.store.ledger();
    if (stored !== null) return stored;
    const row = await this.env.DB.prepare('SELECT created_at FROM users WHERE id = ?')
      .bind(this.userId())
      .first<{ created_at: string | number }>();
    const created = row === null ? NaN : new Date(row.created_at).getTime();
    return this.store.startLedger(Number.isFinite(created) ? created : userClock.now());
  }

  async charge(seconds: number, kind: TalkKind): Promise<ChargeResult> {
    const amount = ChargeSeconds.parse(seconds);
    const talk = TalkKindSchema.parse(kind);
    const now = userClock.now();
    const period = rules.period(await this.ledger(), now);
    if (amount > 0) this.store.addUsage(period.start, period.plan, talk, amount, now);
    return chargeResult(period, this.store.usedSeconds(period.start, period.plan));
  }

  async balance(): Promise<MinutesSummary> {
    const period = rules.period(await this.ledger(), userClock.now());
    return MinutesSummary.parse(
      minutesSummary(period, this.store.usedSeconds(period.start, period.plan)),
    );
  }

  async setPlan(plan: Plan, periodStart: number): Promise<MinutesSummary> {
    await this.ledger();
    this.store.setPlan(Plan.parse(plan), z.int().min(0).parse(periodStart));
    return this.balance();
  }

  async schedule(kind: ScheduledPushKind, at: number, payload: PushPayload): Promise<Scheduled> {
    const push: ScheduledPush = {
      id: `push_${crypto.randomUUID()}`,
      kind: ScheduledPushKind.parse(kind),
      due: z.int().min(0).parse(at),
      scheduledFor: at,
      payload: PushPayload.parse(payload),
    };
    this.store.schedule(push);
    await this.armAlarm();
    return { id: push.id, due: push.due };
  }

  async cancel(id: string): Promise<boolean> {
    const cancelled = this.store.cancel(id);
    await this.armAlarm();
    return cancelled;
  }

  /** What waits to be sent, soonest first. */
  pending(): Scheduled[] {
    return this.store.pending().map(({ id, due }) => ({ id, due }));
  }

  /** Account deletion: the ledger, the schedule and the alarm all go. */
  async erase(): Promise<void> {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    // The object may be reached again (a late charge): it starts over, empty.
    this.store.migrate();
  }

  /** Due pushes go to the `jobs` queue, or wait out quiet hours; then the next alarm is set. */
  override async alarm(): Promise<void> {
    const now = userClock.now();
    const due = this.store.due(now);
    if (due.length > 0) {
      const facts = await this.quietFacts();
      for (const push of due) {
        if (facts.quiet !== null && isQuiet(now, facts.quiet, facts.timeZone)) {
          this.store.postpone(push.id, quietEnds(now, facts.quiet, facts.timeZone));
          continue;
        }
        const job: ScheduledPushJob = ScheduledPushJob.parse({
          type: 'scheduled_push',
          id: push.id,
          userId: this.userId(),
          kind: push.kind,
          payload: push.payload,
          scheduledFor: push.scheduledFor,
          firedAt: now,
        });
        await this.env.JOBS.send(job);
        this.store.cancel(push.id);
      }
    }
    await this.armAlarm();
  }

  /** Quiet hours and timezone from the profile, read when a push is due so edits count. */
  private async quietFacts(): Promise<QuietFacts> {
    const row = await this.env.DB.prepare(
      'SELECT quiet_start, quiet_end, timezone FROM profiles WHERE user_id = ?',
    )
      .bind(this.userId())
      .first<{ quiet_start: string | null; quiet_end: string | null; timezone: string }>();
    if (row === null || row.quiet_start === null || row.quiet_end === null) {
      return { quiet: null, timeZone: row?.timezone ?? 'UTC' };
    }
    const quiet = QuietHours.safeParse({ start: row.quiet_start, end: row.quiet_end });
    return { quiet: quiet.success ? quiet.data : null, timeZone: row.timezone };
  }

  private async armAlarm(): Promise<void> {
    const next = this.store.nextDue();
    if (next === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(next);
  }
}
