import { describe, expect, it } from '@jest/globals';
import type { Profile, StageRequest } from '@yapling/contracts';

import { DataError } from '../../src/data/errors';
import type { CacheStorage } from '../../src/data/storage';
import { RETRY_DELAYS_MS, StageRequests } from '../../src/features/me/stage-queue';

const TAKE: StageRequest = { to: 'newcomer', reason: 'stage_up' };
const STAY: StageRequest = { to: 'visitor', reason: 'stay' };

const profile = { stage: 'newcomer' } as Profile;

function memoryStorage(initial: Record<string, string> = {}): CacheStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    get: (key) => Promise.resolve(data[key] ?? null),
    set: (key, value) => {
      if (value === null) delete data[key];
      else data[key] = value;
      return Promise.resolve();
    },
    clear: () => Promise.resolve(),
  };
}

/** A server that answers each send in turn: a profile, or an error. */
function harness(answers: (Profile | DataError)[], storage = memoryStorage()) {
  const sent: StageRequest[] = [];
  const timers: { retry: () => void; ms: number }[] = [];
  const profiles: Profile[] = [];
  let refusals = 0;
  const requests = new StageRequests({
    send: (request) => {
      sent.push(request);
      const answer = answers.shift();
      if (answer === undefined) return Promise.reject(new DataError('network'));
      return answer instanceof DataError ? Promise.reject(answer) : Promise.resolve(answer);
    },
    storage,
    onProfile: (p) => {
      profiles.push(p);
      return Promise.resolve();
    },
    onRefused: () => {
      refusals += 1;
      return Promise.resolve();
    },
    now: () => 1_000,
    schedule: (retry, ms) => {
      const timer = { retry, ms };
      timers.push(timer);
      return () => {
        timers.splice(timers.indexOf(timer), 1);
      };
    },
  });
  return { requests, sent, timers, profiles, storage, refusals: () => refusals };
}

describe('a stage choice', () => {
  it('lands at once when the server takes it, and nothing is left waiting', async () => {
    const h = harness([profile]);
    await expect(h.requests.request(TAKE)).resolves.toEqual({ kind: 'sent', profile });
    expect(h.sent).toEqual([TAKE]);
    expect(h.profiles).toEqual([profile]);
    expect(h.requests.current).toBeNull();
    expect(h.storage.data).toEqual({});
  });

  it('is kept on the phone and tried again when the server doesn’t know the route yet', async () => {
    const h = harness([new DataError('not_found', 404), new DataError('network'), profile]);
    await expect(h.requests.request(TAKE)).resolves.toEqual({ kind: 'pending' });
    expect(h.requests.current?.request).toEqual(TAKE);
    expect(JSON.parse(h.storage.data['stage-request'] ?? 'null')).toEqual({
      request: TAKE,
      at: 1_000,
    });
    expect(h.timers.map((t) => t.ms)).toEqual([RETRY_DELAYS_MS[0]]);

    h.timers.shift()!.retry();
    await h.requests.flush();
    expect(h.timers.map((t) => t.ms)).toEqual([RETRY_DELAYS_MS[1]]);

    h.timers.shift()!.retry();
    await expect(h.requests.flush()).resolves.toEqual({ kind: 'sent', profile });
    expect(h.sent).toEqual([TAKE, TAKE, TAKE]);
    expect(h.requests.current).toBeNull();
    expect(h.storage.data).toEqual({});
  });

  it('is dropped when the server refuses it, and the server’s profile is read again', async () => {
    const h = harness([new DataError('server', 409, 'stage_conflict')]);
    await expect(h.requests.request(TAKE)).resolves.toEqual({ kind: 'refused' });
    expect(h.requests.current).toBeNull();
    expect(h.refusals()).toBe(1);
    expect(h.timers).toEqual([]);
  });

  it('comes back after the app restarts and is sent again', async () => {
    const storage = memoryStorage({ 'stage-request': JSON.stringify({ request: STAY, at: 5 }) });
    const h = harness([profile], storage);
    await h.requests.load();
    await h.requests.flush();
    expect(h.sent).toEqual([STAY]);
    expect(h.requests.current).toBeNull();
    expect(storage.data).toEqual({});
  });

  it('forgets a kept copy it can’t read', async () => {
    const storage = memoryStorage({ 'stage-request': '{"request":{"to":"mayor"}}' });
    const h = harness([], storage);
    await h.requests.load();
    expect(h.requests.current).toBeNull();
    expect(storage.data).toEqual({});
  });

  it('keeps the newer of two choices when the learner changes their mind offline', async () => {
    const h = harness([new DataError('network')]);
    await h.requests.request(STAY);
    await h.requests.request(TAKE);
    expect(h.requests.current?.request).toEqual(TAKE);
    expect(h.timers).toHaveLength(1);
  });
});
