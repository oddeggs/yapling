import type {
  AppleLinkRequest,
  MinutesSummary,
  PushTokenRegistration,
  Session,
  TimeZone,
} from '@yapling/contracts';
import type { PipsMinuteLines, SeasonWeeks } from '@yapling/domain';

import { createApiClient, createSessionApi, type ApiClient } from './client';
import { phoneClock, type AppClock } from './clock';
import { Connectivity, watchedHttp, type Schedule } from './connectivity';
import { createHttp } from './http';
import { MemoryRepo } from './memory';
import { OpenLog, SeenMoments } from './moments';
import { Outbox, type OpResource, type OutboxOp } from './outbox';
import { ProfileRepo } from './profile';
import { ProgressRepo } from './progress';
import { CallsRepo, minutesResource } from './records';
import type { Resource } from './resource';
import { PIPS_MINUTE_LINES, SEASON_WEEKS } from './season';
import { SessionManager } from './session';
import { CACHE_KEYS, type CacheStorage, type SecretStorage } from './storage';
import { createStore, type Store } from './store';
import { TurnModePreference } from './turn-mode';
import { phoneTimeZone } from './week';

/*
 * The app's data, put together once: the session, the typed client, the cached stores, the offline
 * queue and the connectivity probe. The provider makes one with the phone's Keychain, SQLite and
 * fetch; tests make one with in-memory storage and a fake fetch.
 */

export interface DataOptions {
  /** `extra.apiBase`. */
  readonly base: string;
  readonly fetch?: typeof fetch;
  readonly secrets: SecretStorage;
  readonly cache: CacheStorage;
  readonly clientVersion: string;
  readonly newInstallId: () => string;
  /** The phone's timezone for the guest request; the runtime's by default. */
  readonly timeZone?: () => TimeZone | null;
  readonly now?: () => number;
  /** The app's clock for the day count; the phone's unless the test menu moves it. */
  readonly clock?: AppClock;
  readonly schedule?: Schedule;
  readonly timeoutMs?: number;
  /** The season's weeks the learner's weeks are read from; the story's by default. */
  readonly season?: SeasonWeeks;
  /** Which phrases have Pip's-minute lines; the story's by default. */
  readonly pipsMinuteLines?: PipsMinuteLines;
}

export class Data {
  readonly connectivity: Connectivity;
  readonly session: SessionManager;
  readonly api: ApiClient;
  readonly outbox: Outbox;
  readonly profile: ProfileRepo;
  readonly progress: ProgressRepo;
  readonly memory: MemoryRepo;
  readonly minutes: Resource<MinutesSummary>;
  readonly calls: CallsRepo;
  /** The between-call moments seen on this phone. */
  readonly seen: SeenMoments;
  /** The app's opens, for the welcome back. */
  readonly opens: OpenLog;
  /** Holding the mic or hands-free in calls (this phone only). */
  readonly turnMode: TurnModePreference;
  /** The season's weeks: what each week opens, and on which day. */
  readonly season: SeasonWeeks;
  /** Which phrases Pip's minute can set up and say wrong. */
  readonly pipsMinuteLines: PipsMinuteLines;
  /** Moves each time the app's clock moves or is replaced. */
  readonly clockMoves: Store<number> = createStore(0);
  private clockNow: AppClock;
  private stopClock: () => void;
  private readonly cache: CacheStorage;
  private ownerCheck: { readonly userId: string; readonly done: Promise<void> } | null = null;
  private stopSession: (() => void) | null = null;
  private stopBackOnline: (() => void) | null = null;

  constructor(opts: DataOptions) {
    this.cache = opts.cache;
    this.season = opts.season ?? SEASON_WEEKS;
    this.pipsMinuteLines = opts.pipsMinuteLines ?? PIPS_MINUTE_LINES;
    this.connectivity = new Connectivity(opts.schedule);
    const http = watchedHttp(
      createHttp({
        base: opts.base,
        ...(opts.fetch ? { fetch: opts.fetch } : {}),
        ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
      }),
      this.connectivity,
    );
    this.session = new SessionManager({
      api: createSessionApi(http),
      secrets: opts.secrets,
      clientVersion: opts.clientVersion,
      newInstallId: opts.newInstallId,
      timeZone: opts.timeZone ?? phoneTimeZone,
    });
    this.api = createApiClient(http, this.session);
    this.outbox = new Outbox(
      opts.cache,
      (op) => this.send(op),
      (resources) => this.dropped(resources),
    );
    this.profile = new ProfileRepo(this.api, opts.cache, this.outbox);
    this.progress = new ProgressRepo(this.api, opts.cache, this.season);
    this.memory = new MemoryRepo(this.api, opts.cache, this.outbox, opts.now);
    this.minutes = minutesResource(this.api, opts.cache);
    this.calls = new CallsRepo(this.api, opts.cache);
    this.clockNow = opts.clock ?? phoneClock;
    this.stopClock = this.clockNow.subscribe(() => this.clockMoves.set((n) => n + 1));
    this.seen = new SeenMoments(opts.cache, () => this.clockNow.now());
    this.opens = new OpenLog(opts.cache);
    this.turnMode = new TurnModePreference(opts.cache);
    this.connectivity.setProbe(() => this.resume());
  }

  /** The app's clock (the phone's, or the test menu's in test builds). */
  get clock(): AppClock {
    return this.clockNow;
  }

  /** The test builds put the test menu's clock in place of the phone's. */
  setClock(clock: AppClock): void {
    if (clock === this.clockNow) return;
    this.stopClock();
    this.clockNow = clock;
    this.stopClock = clock.subscribe(() => this.clockMoves.set((n) => n + 1));
    this.clockMoves.set((n) => n + 1);
  }

  /**
   * First launch and every launch: the cache at once, then the session, the queue and a refresh.
   * Before the learner confirms their age there is no session, and nothing is asked of the API.
   */
  async start(): Promise<void> {
    this.stopSession ??= this.session.store.subscribe(() => {
      const userId = this.session.state.session?.userId;
      if (userId !== undefined) void this.checkOwner(userId);
    });
    this.stopBackOnline ??= this.connectivity.onBackOnline(() => {
      void this.outbox.flush().catch(() => undefined);
    });
    await Promise.all([
      this.profile.resource.loadCache(),
      this.progress.resource.loadCache(),
      this.memory.resource.loadCache(),
      this.minutes.loadCache(),
      this.outbox.load(),
      this.seen.load(),
      this.turnMode.load(),
    ]);
    await this.session.start();
    await this.resume();
  }

  /** Back in the foreground, or the API back: send what waits, then read everything again. */
  async resume(): Promise<void> {
    const session = await this.session.ensure().catch(() => null);
    if (session === null) return;
    await this.checkOwner(session.userId);
    await this.outbox.flush().catch(() => undefined);
    await Promise.allSettled([
      this.profile.refresh(),
      this.progress.refresh(),
      this.memory.refresh(),
      this.minutes.refresh(),
    ]);
  }

  stop(): void {
    this.stopSession?.();
    this.stopSession = null;
    this.stopBackOnline?.();
    this.stopBackOnline = null;
    this.connectivity.stop();
  }

  /**
   * The learner confirmed they are 18 or older: makes the guest session (with the phone's
   * timezone), then reads everything for it. Throws when the API can't make one.
   */
  async startGuest(): Promise<Session> {
    const session = await this.session.startGuest();
    await this.checkOwner(session.userId);
    void this.resume();
    return session;
  }

  /** The bearer for the call socket's `hello`. */
  getSessionToken(): Promise<string> {
    return this.session.token();
  }

  /** Sign in with Apple; on a new phone this may be another learner, whose data replaces the cache. */
  async linkApple(body: AppleLinkRequest): Promise<Session> {
    const session = await this.session.linkApple(body);
    await this.checkOwner(session.userId);
    void this.resume();
    return session;
  }

  /** `PUT /api/me/push-token`. Needs the server. */
  registerPushToken(body: PushTokenRegistration): Promise<void> {
    return this.api.registerPushToken(body);
  }

  /** `DELETE /api/me/push-token`. Needs the server. */
  unregisterPushToken(body: PushTokenRegistration): Promise<void> {
    return this.api.unregisterPushToken(body);
  }

  /**
   * Deletes the account on the server, then everything on the phone: the cache, the queue, the
   * session and the install id. The next request starts a new guest.
   */
  async deleteAccount(): Promise<{ deletedBy: number }> {
    const answer = await this.api.deleteAccount({ confirm: true });
    await this.forgetLocal();
    await this.session.signOut();
    this.ownerCheck = null;
    return answer;
  }

  /**
   * The test menu's reset: everything on this phone (the cache, the queue, the moments seen, the
   * session and the install id), as a fresh install. The account stays on the server; the next
   * learner confirms their age again and gets a new guest.
   */
  async resetLocal(): Promise<void> {
    // The session goes first, so no request starts under the learner being forgotten; answers to
    // the ones already on their way are dropped by the resets that follow.
    await this.session.signOut();
    this.ownerCheck = null;
    await this.forgetLocal();
  }

  private async forgetLocal(): Promise<void> {
    await this.outbox.clear();
    await this.cache.clear().catch(() => undefined);
    this.profile.resource.reset();
    this.progress.resource.reset();
    this.memory.resource.reset();
    this.minutes.reset();
    this.calls.reset();
    this.seen.reset();
    this.opens.reset();
    this.turnMode.reset();
  }

  /** The cache belongs to one learner: another one's session starts it afresh. */
  private checkOwner(userId: string): Promise<void> {
    if (this.ownerCheck?.userId !== userId)
      this.ownerCheck = {
        userId,
        done: (async () => {
          const owner = await this.cache.get(CACHE_KEYS.owner).catch(() => null);
          if (owner !== null && owner !== userId) await this.forgetLocal();
          await this.cache.set(CACHE_KEYS.owner, userId).catch(() => undefined);
        })(),
      };
    return this.ownerCheck.done;
  }

  private async send(op: OutboxOp): Promise<{ createdId?: string }> {
    switch (op.kind) {
      case 'profile.patch':
        await this.profile.send(op.body);
        return {};
      case 'memory.create': {
        const createdId = await this.memory.send(op);
        return createdId === undefined ? {} : { createdId };
      }
      case 'memory.update':
      case 'memory.delete':
        await this.memory.send(op);
        return {};
    }
  }

  /** Late writes the server refused: their resources come back from the server, which wins. */
  private dropped(resources: ReadonlySet<OpResource>): void {
    if (resources.has('profile')) void this.profile.refresh().catch(() => undefined);
    if (resources.has('memory')) void this.memory.refresh().catch(() => undefined);
  }
}
