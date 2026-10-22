import { StageRequest, type Profile } from '@yapling/contracts';

import { isDataError } from '../../data/errors';
import type { CacheStorage } from '../../data/storage';

/*
 * The learner moving their own stage (`POST /api/me/stage`): taking Linh's Newcomer card, staying
 * a Visitor a little longer, "Thử nhanh hơn" and "Tập với Linh trước". The choice is the learner's
 * the moment they make it: it is kept on the phone and shown at once, and sent again until the
 * server has it (offline, or a server that doesn't know the route yet). A request the server
 * refuses (it no longer fits the stage) is dropped and the server's profile wins.
 */

/** The phone's copy of a choice the server hasn't confirmed yet. */
export interface PendingStage {
  readonly request: StageRequest;
  readonly at: number;
}

export type StageSendOutcome =
  /** The server took it; this is the profile it answered. */
  | { readonly kind: 'sent'; readonly profile: Profile }
  /** Kept on the phone, to send again (no connection, or the route isn't there yet). */
  | { readonly kind: 'pending' }
  /** The server said no: the request doesn't fit the learner's stage any more. */
  | { readonly kind: 'refused' };

export interface StageRequestDeps {
  readonly send: (request: StageRequest) => Promise<Profile>;
  readonly storage: CacheStorage;
  /** The server's profile after a request it took. */
  readonly onProfile: (profile: Profile) => Promise<void>;
  /** After a refusal: read the server's profile again. */
  readonly onRefused: () => Promise<void>;
  readonly now: () => number;
  /** Runs `retry` after `ms`; returns a cancel. */
  readonly schedule: (retry: () => void, ms: number) => () => void;
}

const KEY = 'stage-request';

/** Waits between tries while a choice is pending: soon at first, then once a minute. */
export const RETRY_DELAYS_MS = [5_000, 15_000, 60_000] as const;

/** Errors that mean "try again later" rather than "no". */
const isTransient = (error: unknown): boolean =>
  isDataError(error, 'network') ||
  isDataError(error, 'unavailable') ||
  // A server without the route yet answers 404.
  isDataError(error, 'not_found') ||
  isDataError(error, 'unauthorized') ||
  (isDataError(error, 'server') && error.status >= 500);

export class StageRequests {
  private pending: PendingStage | null = null;
  private loaded = false;
  private listeners = new Set<() => void>();
  private cancelRetry: (() => void) | null = null;
  private tries = 0;
  private sending: Promise<StageSendOutcome> | null = null;

  constructor(private readonly deps: StageRequestDeps) {}

  /** The choice waiting for the server, if any. */
  get current(): PendingStage | null {
    return this.pending;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(next: PendingStage | null) {
    this.pending = next;
    for (const l of this.listeners) l();
  }

  /** Reads a choice kept from an earlier session, and tries it again. */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const raw = await this.deps.storage.get(KEY).catch(() => null);
    if (raw === null) return;
    try {
      const parsed = JSON.parse(raw) as { request?: unknown; at?: unknown };
      const request = StageRequest.safeParse(parsed.request);
      if (request.success && typeof parsed.at === 'number') {
        if (this.pending === null) this.set({ request: request.data, at: parsed.at });
        void this.flush();
      } else await this.persist(null);
    } catch {
      await this.persist(null);
    }
  }

  private async persist(value: PendingStage | null): Promise<void> {
    await this.deps.storage
      .set(KEY, value === null ? null : JSON.stringify(value))
      .catch(() => undefined);
  }

  /** The learner's choice: kept at once, then sent. A newer choice replaces one still waiting. */
  async request(request: StageRequest): Promise<StageSendOutcome> {
    const pending = { request, at: this.deps.now() };
    this.set(pending);
    this.tries = 0;
    this.cancelRetry?.();
    this.cancelRetry = null;
    await this.persist(pending);
    return this.flush();
  }

  /** Sends the waiting choice, if there is one (on opening a screen, or a timer). */
  flush(): Promise<StageSendOutcome> {
    this.sending ??= this.sendPending().finally(() => {
      this.sending = null;
    });
    return this.sending;
  }

  private async sendPending(): Promise<StageSendOutcome> {
    const pending = this.pending;
    if (pending === null) return { kind: 'pending' };
    try {
      const profile = await this.deps.send(pending.request);
      // A newer choice made while this one was in flight is sent next.
      if (this.pending === pending) {
        this.set(null);
        await this.persist(null);
      }
      await this.deps.onProfile(profile).catch(() => undefined);
      if (this.pending !== null) void this.flush();
      return { kind: 'sent', profile };
    } catch (error) {
      if (isTransient(error)) {
        this.retryLater();
        return { kind: 'pending' };
      }
      if (this.pending === pending) {
        this.set(null);
        await this.persist(null);
      }
      await this.deps.onRefused().catch(() => undefined);
      return { kind: 'refused' };
    }
  }

  private retryLater() {
    if (this.cancelRetry !== null) return;
    const delay = RETRY_DELAYS_MS[Math.min(this.tries, RETRY_DELAYS_MS.length - 1)] ?? 60_000;
    this.tries += 1;
    this.cancelRetry = this.deps.schedule(() => {
      this.cancelRetry = null;
      void this.flush();
    }, delay);
  }
}
