import type { MemoryItem, Profile, Progress, TimeZone } from '@yapling/contracts';

import type { Schedule } from '../../src/data/connectivity';
import { Data, type DataOptions } from '../../src/data/data';
import {
  memoryCacheStorage,
  memorySecretStorage,
  SECRET_KEYS,
  type CacheStorage,
  type SecretStorage,
} from '../../src/data/storage';

/*
 * An in-memory stand-in for the API behind a mocked `fetch`, close enough to the Worker's routes
 * for the client's behaviour: guests by install id, bearer sessions, a profile, progress with
 * revisions, memory, minutes. `offline` makes every request fail as the network would.
 */

export const BASE = 'http://api.test/api';

export interface Call {
  readonly method: string;
  readonly path: string;
  readonly token: string | null;
  readonly body: unknown;
}

type Answer = { status: number; body?: unknown };

export const profileInput = {
  displayName: 'Lan',
  firstLanguage: 'vi',
  roommate: { species: 'redpanda', name: 'Pip' },
  track: 'life',
  quietHours: { start: '22:00', end: '08:00' },
  timezone: 'Asia/Ho_Chi_Minh',
  notificationsAllowed: true,
} as const;

export const emptyProgress = (revision = 1): Progress => ({
  revision,
  installedOn: '2026-10-20',
  dayIndex: 3,
  phrases: [],
  errorTargets: [],
  canDos: [],
  keepsakes: [],
  weeks: [],
  settlingChaptersDone: [],
});

let tokenCounter = 0;

export class FakeApi {
  offline = false;
  readonly calls: Call[] = [];
  /** Answers for the next requests to a path, before the fake's own behaviour. */
  readonly overrides = new Map<string, Answer[]>();
  private readonly guests = new Map<string, string>();
  readonly sessions = new Map<string, string>();
  profiles = new Map<string, Profile>();
  progress = new Map<string, Progress>();
  memory = new Map<string, MemoryItem[]>();
  memoryLimit = 1_000;
  private nextId = 1;
  now = 1_760_000_000_000;

  readonly fetch = ((input: string, init?: RequestInit) => {
    const url = new URL(input);
    const method = init?.method ?? 'GET';
    const auth = (init?.headers as Record<string, string> | undefined)?.['authorization'];
    const token = auth?.replace(/^Bearer /, '') ?? null;
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    this.calls.push({ method, path: url.pathname, token, body });
    if (!url.href.startsWith('http://api.test/api/'))
      return Promise.reject(new TypeError('bad host'));
    if (this.offline) return Promise.reject(new TypeError('Network request failed'));
    const override = this.overrides.get(`${method} ${url.pathname}`)?.shift();
    const answer = override ?? this.route(method, url.pathname, token, body);
    return Promise.resolve({
      status: answer.status,
      ok: answer.status >= 200 && answer.status < 300,
      json: () =>
        answer.body === undefined
          ? Promise.reject(new SyntaxError('no body'))
          : Promise.resolve(answer.body),
    } as Response);
  }) as unknown as typeof fetch;

  /** Ends every session (the server forgot them). */
  expireSessions(): void {
    this.sessions.clear();
  }

  answerNext(method: string, path: string, answer: Answer): void {
    const list = this.overrides.get(`${method} ${path}`) ?? [];
    list.push(answer);
    this.overrides.set(`${method} ${path}`, list);
  }

  requests(method: string, path: string): Call[] {
    return this.calls.filter((c) => c.method === method && c.path === path);
  }

  private route(method: string, path: string, token: string | null, body: unknown): Answer {
    if (method === 'POST' && path === '/api/session/guest') {
      const installId = (body as { installId: string }).installId;
      let userId = this.guests.get(installId);
      if (userId === undefined) {
        userId = `user${this.nextId++}`;
        this.guests.set(installId, userId);
      }
      return { status: 200, body: this.newSession(userId, 'guest') };
    }
    if (method === 'POST' && path === '/api/session/apple') {
      const userId = token === null ? 'appleuser' : this.sessions.get(token);
      if (userId === undefined) return error(401, 'unauthorized');
      return { status: 200, body: this.newSession(userId, 'apple') };
    }
    const userId = token === null ? undefined : this.sessions.get(token);
    if (userId === undefined) return error(401, 'unauthorized');
    const route = `${method} ${path.replace(/\/api\/me\/memory\/.+$/, '/api/me/memory/:id')}`;
    switch (route) {
      case 'GET /api/me/profile': {
        const profile = this.profiles.get(userId);
        return profile ? { status: 200, body: profile } : error(404, 'not_found');
      }
      case 'PUT /api/me/profile':
        return this.writeProfile(userId, body as object, true);
      case 'PATCH /api/me/profile':
        return this.writeProfile(userId, body as object, false);
      case 'GET /api/me/progress':
        return { status: 200, body: this.progressOf(userId) };
      case 'PUT /api/me/progress': {
        const current = this.progressOf(userId);
        const put = body as Progress;
        if (put.revision !== current.revision) return error(409, 'stale_revision');
        const next = { ...put, revision: current.revision + 1 };
        this.progress.set(userId, next);
        return { status: 200, body: next };
      }
      case 'GET /api/me/memory':
        return { status: 200, body: { items: this.memory.get(userId) ?? [] } };
      case 'POST /api/me/memory': {
        const items = this.memory.get(userId) ?? [];
        if (items.length >= this.memoryLimit) return error(409, 'memory_full');
        const item: MemoryItem = {
          id: `mem${this.nextId++}`,
          ...(body as { text: string; category: MemoryItem['category'] }),
          createdAt: this.now,
          sourceCallId: null,
        };
        this.memory.set(userId, [item, ...items]);
        return { status: 201, body: item };
      }
      case 'PATCH /api/me/memory/:id': {
        const id = decodeURIComponent(path.split('/').pop() ?? '');
        const items = this.memory.get(userId) ?? [];
        const item = items.find((i) => i.id === id);
        if (!item) return error(404, 'not_found');
        const next = { ...item, ...(body as object) };
        this.memory.set(
          userId,
          items.map((i) => (i.id === id ? next : i)),
        );
        return { status: 200, body: next };
      }
      case 'DELETE /api/me/memory/:id': {
        const id = decodeURIComponent(path.split('/').pop() ?? '');
        this.memory.set(
          userId,
          (this.memory.get(userId) ?? []).filter((i) => i.id !== id),
        );
        return { status: 204 };
      }
      case 'GET /api/me/minutes':
        return {
          status: 200,
          body: {
            plan: 'free',
            periodStart: this.now - 1_000,
            periodEnd: this.now + 1_000_000,
            allowanceSeconds: 3_600,
            usedSeconds: 600,
            leftSeconds: 3_000,
            firstWeek: true,
          },
        };
      case 'PUT /api/me/push-token':
      case 'DELETE /api/me/push-token':
        return { status: 204 };
      case 'GET /api/calls':
        return { status: 200, body: { calls: [] } };
      case 'POST /api/me/delete':
        this.profiles.delete(userId);
        this.progress.delete(userId);
        this.memory.delete(userId);
        for (const [t, u] of this.sessions) if (u === userId) this.sessions.delete(t);
        for (const [i, u] of this.guests) if (u === userId) this.guests.delete(i);
        return { status: 200, body: { deletedBy: this.now } };
      default:
        return error(404, 'not_found');
    }
  }

  private newSession(userId: string, kind: 'guest' | 'apple') {
    const token = `token-${(++tokenCounter).toString().padStart(12, '0')}`;
    this.sessions.set(token, userId);
    return { userId, token, expiresAt: this.now + 365 * 86_400_000, kind };
  }

  private progressOf(userId: string): Progress {
    let p = this.progress.get(userId);
    if (p === undefined) {
      p = emptyProgress();
      this.progress.set(userId, p);
    }
    return p;
  }

  private writeProfile(userId: string, body: object, whole: boolean): Answer {
    const current = this.profiles.get(userId);
    if (!whole && current === undefined) return error(404, 'not_found');
    const next = {
      ...(current ?? { stage: 'newcomer' }),
      ...body,
      revision: (current?.revision ?? 0) + 1,
      updatedAt: this.now,
    } as Profile;
    this.profiles.set(userId, next);
    return { status: 200, body: next };
  }
}

function error(status: number, code: string): Answer {
  return { status, body: { error: { code } } };
}

let installCounter = 0;
export const newInstallId = (): string =>
  `00000000-0000-4000-8000-${(++installCounter).toString().padStart(12, '0')}`;

export interface Phone {
  readonly secrets: SecretStorage & { values: Map<string, string> };
  readonly cache: CacheStorage & { values: Map<string, string> };
}

/**
 * A phone. By default its learner already confirmed they are 18+ in onboarding (the install id
 * is there), so a launch makes or reads their guest session; `firstLaunch` is a fresh install,
 * where nothing is asked until `startGuest`.
 */
export const newPhone = ({ firstLaunch = false }: { firstLaunch?: boolean } = {}): Phone => ({
  secrets: memorySecretStorage(firstLaunch ? {} : { [SECRET_KEYS.installId]: newInstallId() }),
  cache: memoryCacheStorage(),
});

/** A launch of the app on `phone`: a fresh `Data` over the phone's storage. */
export function launch(
  api: FakeApi,
  phone: Phone,
  schedule?: Schedule,
  timeZone: () => TimeZone | null = () => 'Asia/Ho_Chi_Minh',
  extra: Pick<DataOptions, 'season' | 'pipsMinuteLines'> = {},
): Data {
  return new Data({
    ...extra,
    base: BASE,
    fetch: api.fetch,
    secrets: phone.secrets,
    cache: phone.cache,
    clientVersion: '0.1.0',
    newInstallId,
    timeZone,
    now: () => api.now,
    // Probes never fire by themselves in tests unless the test drives them.
    schedule: schedule ?? (() => () => undefined),
  });
}

/** Lets queued promise callbacks run. */
export const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
