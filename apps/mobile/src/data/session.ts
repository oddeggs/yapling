import { Session, type AppleLinkRequest } from '@yapling/contracts';

import type { SessionApi, TokenSource } from './client';
import { DataError, isDataError, type DataErrorKind } from './errors';
import { SECRET_KEYS, type SecretStorage } from './storage';
import { createStore, type Store } from './store';

/*
 * The learner's session. On first launch the app makes an install id (kept in the Keychain, which
 * outlives a reinstall) and asks for a guest with it; the bearer token is kept in the Keychain too
 * and goes on every request. A refused guest token is replaced by a new session for the same guest
 * (the server answers the same install id with the same guest). Sign in with Apple links the guest
 * and keeps its progress; an Apple session that ends needs the Apple sheet again.
 */

export type SessionStatus =
  /** Nothing asked yet. */
  | 'idle'
  /** Reading the Keychain or asking for a guest. */
  | 'starting'
  | 'ready'
  /** No session yet and the API can't be reached; cached data still shows. */
  | 'offline'
  /** No session: after account deletion, or an Apple session that ended. */
  | 'signed_out'
  /** The API refused to make a session (not a network problem). */
  | 'error';

export interface SessionState {
  readonly status: SessionStatus;
  readonly session: Session | null;
  readonly error: DataErrorKind | null;
}

export interface SessionOptions {
  readonly api: SessionApi;
  readonly secrets: SecretStorage;
  /** `major.minor.patch`, sent with the guest request. */
  readonly clientVersion: string;
  /** A random UUID for a new install. */
  readonly newInstallId: () => string;
}

const INITIAL: SessionState = { status: 'idle', session: null, error: null };

export class SessionManager implements TokenSource {
  readonly store: Store<SessionState> = createStore(INITIAL);
  private pending: Promise<Session> | null = null;
  private loaded = false;

  constructor(private readonly opts: SessionOptions) {}

  get state(): SessionState {
    return this.store.get();
  }

  /** Makes sure there is a session, without throwing: the outcome is in `store`. */
  async start(): Promise<void> {
    await this.ensure().catch(() => undefined);
  }

  /** The current session, made first when there is none (deduplicated). */
  ensure(): Promise<Session> {
    const current = this.state.session;
    if (current !== null) return Promise.resolve(current);
    // An Apple session that ended waits for the Apple sheet rather than becoming a new guest.
    if (this.state.status === 'signed_out' && this.state.error === 'unauthorized')
      return Promise.reject(new DataError('unauthorized', 401));
    this.pending ??= this.establish().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  /** The bearer for the API and the call socket's `hello`. */
  async token(): Promise<string> {
    return (await this.ensure()).token;
  }

  /** `refused` was answered 401: a fresh guest session, or `unauthorized` for an Apple one. */
  async renew(refused: string): Promise<string> {
    const current = this.state.session;
    if (current !== null && current.token !== refused) return current.token;
    if (this.pending) return (await this.pending).token;
    // No session now: one is made (or refused) the usual way.
    if (current === null) return this.token();
    if (current.kind === 'apple') {
      await this.forget();
      this.store.set({ status: 'signed_out', session: null, error: 'unauthorized' });
      throw new DataError('unauthorized', 401);
    }
    this.store.set((s) => ({ ...s, session: null }));
    this.pending = this.createGuest().finally(() => {
      this.pending = null;
    });
    return (await this.pending).token;
  }

  /** Sign in with Apple, from the guest (keeps its progress) or a new phone. */
  async linkApple(body: AppleLinkRequest): Promise<Session> {
    const session = await this.opts.api.appleSession(body, this.state.session?.token ?? null);
    await this.save(session);
    return session;
  }

  /** Forgets the session and the install id (after account deletion): the next ask is a new guest. */
  async signOut(): Promise<void> {
    await this.forget();
    await this.opts.secrets.set(SECRET_KEYS.installId, null).catch(() => undefined);
    this.store.set({ status: 'signed_out', session: null, error: null });
  }

  private async establish(): Promise<Session> {
    this.store.set((s) => ({ ...s, status: 'starting', error: null }));
    if (!this.loaded) {
      this.loaded = true;
      const stored = await this.readStored();
      if (stored !== null) {
        this.store.set({ status: 'ready', session: stored, error: null });
        return stored;
      }
    }
    return this.createGuest();
  }

  private async createGuest(): Promise<Session> {
    try {
      const installId = await this.installId();
      const session = await this.opts.api.guestSession({
        installId,
        clientVersion: this.opts.clientVersion,
        ageConfirmed: true,
      });
      await this.save(session);
      return session;
    } catch (error) {
      const kind = isDataError(error) ? error.kind : 'server';
      this.store.set({
        status: kind === 'network' ? 'offline' : 'error',
        session: null,
        error: kind,
      });
      throw error;
    }
  }

  private async installId(): Promise<string> {
    const existing = await this.opts.secrets.get(SECRET_KEYS.installId);
    if (existing !== null) return existing;
    const id = this.opts.newInstallId();
    await this.opts.secrets.set(SECRET_KEYS.installId, id);
    return id;
  }

  private async readStored(): Promise<Session | null> {
    const raw = await this.opts.secrets.get(SECRET_KEYS.session).catch(() => null);
    if (raw === null) return null;
    try {
      const parsed = Session.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    } catch {
      // Unreadable: a new session replaces it.
    }
    return null;
  }

  private async save(session: Session): Promise<void> {
    this.loaded = true;
    await this.opts.secrets.set(SECRET_KEYS.session, JSON.stringify(session));
    this.store.set({ status: 'ready', session, error: null });
  }

  private async forget(): Promise<void> {
    this.loaded = true;
    await this.opts.secrets.set(SECRET_KEYS.session, null).catch(() => undefined);
  }
}
