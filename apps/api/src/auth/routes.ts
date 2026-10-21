import { AppleLinkRequest, GuestSessionRequest, Session } from '@yapling/contracts';
import { Hono } from 'hono';

import { appleSession } from './apple';
import { guestSession } from './guest';
import { errorResponse, parseBody, respond } from './http';
import { AuthNotConfigured } from './instance';
import type { SessionEnv } from './session';

/**
 * Sessions, the only routes without a session of their own:
 * - `POST /session/guest`: a guest for this install (`guest.ts`).
 * - `POST /session/apple`: Sign in with Apple, from a guest or a new phone (`apple.ts`).
 */
export function sessionRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.onError((error, c) => {
    if (error instanceof AuthNotConfigured) return errorResponse(c, 503, 'unavailable');
    // The path and the error only: never a body, a header or a query string.
    console.error('unhandled error', { path: c.req.path, error });
    return errorResponse(c, 500, 'internal');
  });

  routes.post('/session/guest', async (c) => {
    const body = await parseBody(c, GuestSessionRequest);
    if (!body.ok) return body.response;
    return respond(c, Session, await guestSession(c.env, c.req.raw, body.value));
  });

  routes.post('/session/apple', async (c) => {
    const body = await parseBody(c, AppleLinkRequest);
    if (!body.ok) return body.response;
    const outcome = await appleSession(c.env, c.req.raw, body.value);
    if (!outcome.ok) return errorResponse(c, outcome.status, outcome.code);
    return respond(c, Session, outcome.session);
  });

  return routes;
}
