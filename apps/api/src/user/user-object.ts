import {
  CallKind,
  LocalDate,
  MinutesSummary,
  Plan,
  QuietHours,
  TimeZone,
} from '@yapling/contracts';
import { isMeteredCall, localDateOf } from '@yapling/domain';
import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';

import type { Bindings } from '../env';
import { ScheduledPushJob, ScheduledPushKind, PushPayload } from './jobs';
import {
  chargeResult,
  DEFAULT_LEDGER_TIMEZONE,
  domainLedgerRules,
  minutesSummary,
  type ChargeResult,
  type LedgerRules,
  type LedgerState,
  type TalkKind,
  unmeteredResult,
} from './ledger';
import { isQuiet, quietEnds } from './quiet';
import { UserStorage, type ScheduledPush } from './storage';

/** The learner object's clock; tests move it. */
export const userClock = { now: (): number => Date.now() };

/** The call object of the learner's live call. */
const LIVE_CALL_KEY = 'live_call';

/** The ledger rules in force: `@yapling/domain`'s canonical ledger. */
const rules: LedgerRules = domainLedgerRules;

/** One charge is at most an hour: a call meters in small steps. */
const ChargeSeconds = z.int().min(0).max(3_600);
const TalkKindSchema = z.enum(['learner', 'character']);

export interface Scheduled {
  readonly id: string;
  readonly due: number;
}

/** What the ledger reads about the learner from D1. */
interface LedgerFacts {
  readonly created_at: string | number;
  readonly phone_timezone: string | null;
  readonly timezone: string | null;
  /** Null when there is no profile yet. */
  readonly profile: string | null;
  readonly story_started_on: string | null;
  readonly start_path: string | null;
  readonly installed_on: string | null;
}

/**
 * The day the story started, once it has, from the profile: its story start, never before the
 * install day; the install day for a profile from before the start path was asked. Null with no
 * profile, or while the story hasn't started (a Visitor settling in, or a start still to come).
 */
function storyStart(
  facts: LedgerFacts,
  zone: { readonly timezone: string; readonly installedOn: string },
  now: number,
): string | null {
  if (facts.profile === null) return null;
  const started = LocalDate.safeParse(facts.story_started_on);
  if (!started.success) return facts.start_path === null ? zone.installedOn : null;
  if (started.data > localDateOf(now, zone.timezone)) return null;
  return started.data < zone.installedOn ? zone.installedOn : started.data;
}

interface QuietFacts {
  readonly quiet: QuietHours | null;
  readonly timeZone: string;
}

/**
 * One per learner, named by the user id (`userObject`): the live-minute ledger and the pushes the
 * server sends later. Other code calls it over RPC:
 *
 * - `charge(seconds, kind, callKind?)`: the call object meters learner and character talk into
 *   the period. A Settling-in call (`callKind` `settling`) charges nothing and never wraps up or
 *   runs out; a charge without a call kind is metered, as before call kinds were passed.
 * - `canStart(callKind)`: whether a call of that kind may start now (an unmetered one always may).
 * - `balance()`: the period's `MinutesSummary`.
 * - `setPlan(plan, periodStart)`: purchases move the learner between free and Plus (Plus periods
 *   are calendar months in the learner's timezone; `periodStart` is kept for support).
 * - `schedule(kind, at, payload)` / `cancel(id)`: a voicemail or incoming call for later. The
 *   alarm hands each due one to the `jobs` queue, unless it falls in the learner's quiet hours,
 *   when it waits for them to end.
 * - `claimCall(objectId)` / `releaseCall(objectId)`: the learner's one live call. A new call
 *   claims the line and is told which call object it replaces, so that one ends.
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

  /**
   * The ledger's state. The first time it is needed it starts from the account's creation; its
   * timezone and install day come from the learner's profile and progress, and are pinned once
   * the profile exists, so editing the timezone can't open a fresh allowance. Until then the
   * phone's timezone from the guest session (or the launch timezone) stands in.
   *
   * The free weeks count from the day the story started, pinned once that day has come, so moving
   * it can't open a fresh first week either. A profile saved before the start path was asked (an
   * older app's) started its story on the install day. Until the story starts (a Visitor settling
   * in), the weeks count from the install day.
   */
  private async ledger(): Promise<LedgerState> {
    let stored = this.store.ledger();
    let standIn: string = DEFAULT_LEDGER_TIMEZONE;
    if (stored === null || stored.zone === null || stored.storyStartedOn === null) {
      const row = await this.env.DB.prepare(
        `SELECT u.created_at, u.timezone AS phone_timezone, p.timezone, p.user_id AS profile,
           p.story_started_on, p.start_path, g.installed_on FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         LEFT JOIN progress g ON g.user_id = u.id
         WHERE u.id = ?`,
      )
        .bind(this.userId())
        .first<LedgerFacts>();
      if (stored === null) {
        const created = row === null ? NaN : new Date(row.created_at).getTime();
        stored = this.store.startLedger(Number.isFinite(created) ? created : userClock.now());
      }
      if (stored.zone === null) {
        const timezone = TimeZone.safeParse(row?.timezone);
        if (timezone.success) {
          const installed = LocalDate.safeParse(row?.installed_on);
          this.store.pinZone(
            timezone.data,
            installed.success ? installed.data : localDateOf(stored.startedAt, timezone.data),
          );
          stored = this.store.ledger() ?? stored;
        }
      }
      if (stored.zone !== null && stored.storyStartedOn === null && row !== null) {
        const started = storyStart(row, stored.zone, userClock.now());
        if (started !== null) {
          this.store.pinStoryStart(started);
          stored = this.store.ledger() ?? stored;
        }
      }
      const phone = TimeZone.safeParse(row?.phone_timezone);
      if (phone.success) standIn = phone.data;
    }
    const timezone = stored.zone?.timezone ?? standIn;
    const storyStartedOn = LocalDate.safeParse(stored.storyStartedOn);
    return {
      plan: stored.plan,
      timezone,
      installedOn: stored.zone?.installedOn ?? localDateOf(stored.startedAt, timezone),
      storyStartedOn: storyStartedOn.success ? storyStartedOn.data : null,
    };
  }

  async charge(seconds: number, kind: TalkKind, callKind?: CallKind): Promise<ChargeResult> {
    const amount = ChargeSeconds.parse(seconds);
    const talk = TalkKindSchema.parse(kind);
    const metered = callKind === undefined || isMeteredCall(CallKind.parse(callKind));
    const now = userClock.now();
    const period = rules.period(await this.ledger(), now);
    if (!metered) return unmeteredResult(period, this.store.usedSeconds(period.start, period.plan));
    if (amount > 0) this.store.addUsage(period.start, period.plan, talk, amount, now);
    return chargeResult(period, this.store.usedSeconds(period.start, period.plan));
  }

  async canStart(callKind: CallKind): Promise<boolean> {
    if (!isMeteredCall(CallKind.parse(callKind))) return true;
    const period = rules.period(await this.ledger(), userClock.now());
    return (
      chargeResult(period, this.store.usedSeconds(period.start, period.plan)).exhausted === false
    );
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

  /**
   * A new call takes the learner's line. Returns the call object of the live call it replaces
   * (to be ended), or null when there was none.
   */
  async claimCall(objectId: string): Promise<string | null> {
    const id = z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .parse(objectId);
    const previous = (await this.ctx.storage.get<string>(LIVE_CALL_KEY)) ?? null;
    await this.ctx.storage.put(LIVE_CALL_KEY, id);
    return previous !== null && previous !== id ? previous : null;
  }

  /** A call ended: the line is free, unless a newer call holds it already. */
  async releaseCall(objectId: string): Promise<void> {
    if ((await this.ctx.storage.get<string>(LIVE_CALL_KEY)) === objectId) {
      await this.ctx.storage.delete(LIVE_CALL_KEY);
    }
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
