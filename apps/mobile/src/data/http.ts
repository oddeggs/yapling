import type { z } from 'zod';

import { DataError, errorFromResponse } from './errors';

/*
 * One request to the API: the body checked against its contracts schema on the way out, the answer
 * on the way back, errors as `DataError`s. No retries here; the client and the stores decide.
 */

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpOptions {
  /** `extra.apiBase`, e.g. `http://127.0.0.1:8787/api`. Routes carry their own `/api`. */
  readonly base: string;
  readonly fetch?: typeof fetch;
  /** A request with no answer by then fails as `network`. */
  readonly timeoutMs?: number;
}

export interface RequestSpec<Req, Res> {
  readonly method: Method;
  /** A route from `API_ROUTES`, starting `/api/`. */
  readonly path: string;
  readonly body?: Req;
  readonly request?: z.ZodType<Req>;
  /** The answer's schema; null for a 204. */
  readonly response: z.ZodType<Res> | null;
  readonly token?: string | null;
}

export interface Http {
  /** The host the routes hang off (`apiBase` without its `/api`). */
  readonly origin: string;
  send<Req, Res>(spec: RequestSpec<Req, Res>): Promise<Res>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/** The host of an `apiBase`: trailing slashes and the `/api` the routes repeat are dropped. */
export const originOf = (base: string): string =>
  base
    .replace(/\/+$/, '')
    .replace(/\/api$/, '')
    .replace(/\/+$/, '');

export function createHttp({
  base,
  fetch: fetcher = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: HttpOptions): Http {
  const origin = originOf(base);

  async function send<Req, Res>(spec: RequestSpec<Req, Res>): Promise<Res> {
    let body: string | undefined;
    if (spec.body !== undefined) {
      const checked = spec.request ? spec.request.safeParse(spec.body) : null;
      if (checked && !checked.success) throw new DataError('validation');
      body = JSON.stringify(checked ? checked.data : spec.body);
    }
    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (spec.token) headers['authorization'] = `Bearer ${spec.token}`;

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetcher(`${origin}${spec.path}`, {
        method: spec.method,
        headers,
        signal: abort.signal,
        ...(body !== undefined ? { body } : {}),
      });
    } catch {
      throw new DataError('network');
    } finally {
      clearTimeout(timer);
    }

    const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw errorFromResponse(res.status, json);
    if (spec.response === null) return undefined as Res;
    const parsed = spec.response.safeParse(json);
    if (!parsed.success) throw new DataError('validation', res.status);
    return parsed.data;
  }

  return { origin, send };
}
