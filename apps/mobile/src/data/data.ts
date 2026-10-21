import type {
  AppleLinkRequest,
  MinutesSummary,
  PushTokenRegistration,
  Session,
  TimeZone,
} from '@yapling/contracts';

import { createApiClient, createSessionApi, type ApiClient } from './client';
import { Connectivity, watchedHttp, type Schedule } from './connectivity';
import { createHttp } from './http';
import { MemoryRepo } from './memory';
import { Outbox, type OpResource, type OutboxOp } from './outbox';
import { ProfileRepo } from './profile';
import { ProgressRepo } from './progress';
import { CallsRepo, minutesResource } from './records';
import type { Resource } from './resource';
import { SessionManager } from './session';
import { CACHE_KEYS, type CacheStorage, type SecretStorage } from './storage';
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
  readonly schedule?: Schedule;
  readonly timeoutMs?: number;
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
  private readonly cache: CacheStorage;
  private ownerCheck: { readonly userId: string; readonly done: Promise<void> } | null = null;
  private stopSession: (() => void) | null = null;
  private stopBackOnline: (() => void) | null = null;

  constructor(opts: DataOptions) {
    this.cache = opts.cache;
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
    this.progress = new ProgressRepo(this.api, opts.cache);
    this.memory = new MemoryRepo(this.api, opts.cache, this.outbox, opts.now);
    this.minutes = minutesResource(this.api, opts.cache);
    this.calls = new CallsRepo(this.api, opts.cache);
    this.connectivity.setProbe(() => this.resume());
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

  private async forgetLocal(): Promise<void> {
    await this.outbox.clear();
    await this.cache.clear().catch(() => undefined);
    this.profile.resource.reset();
    this.progress.resource.reset();
    this.memory.resource.reset();
    this.minutes.reset();
    this.calls.reset();
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
