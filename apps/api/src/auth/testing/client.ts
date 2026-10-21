import type { Session } from '@yapling/contracts';
import { exports } from 'cloudflare:workers';
import { expect } from 'vitest';

/** Requests to the Worker as the app makes them: JSON bodies and a bearer session token. */

const ORIGIN = 'https://api.yapling.test';
let addressCounter = 0;

export interface CallOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly token?: string;
  readonly headers?: Record<string, string>;
}

/** A distinct client address per call, so one test's requests never limit another's. */
function freshIp(): string {
  addressCounter += 1;
  return `10.1.${Math.floor(addressCounter / 250)}.${addressCounter % 250}`;
}

export function call(path: string, options: CallOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('cf-connecting-ip', freshIp());
  if (options.token !== undefined) headers.set('authorization', `Bearer ${options.token}`);
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  return exports.default.fetch(`${ORIGIN}${path}`, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

export async function expectJson<T>(response: Response, status = 200): Promise<T> {
  const text = await response.text();
  expect(response.status, text).toBe(status);
  return JSON.parse(text) as T;
}

/** Answers `{ error: { code } }` with this status and code. */
export async function expectError(response: Response, status: number, code: string) {
  expect(await expectJson(response, status)).toEqual({ error: { code } });
}

export function guestBody(installId: string = crypto.randomUUID()) {
  return { installId, clientVersion: '1.0.0', ageConfirmed: true };
}

/** A first launch: a guest and their session. */
export async function newGuest(installId?: string): Promise<Session> {
  const response = await call('/api/session/guest', { body: guestBody(installId) });
  return expectJson<Session>(response);
}
