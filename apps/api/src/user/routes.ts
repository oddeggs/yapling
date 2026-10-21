import { MinutesSummary } from '@yapling/contracts';
import { Hono } from 'hono';

import { respond, type SessionEnv } from '../auth';
import { userObject } from './object';

/** `GET /me/minutes`, behind the session guard: the ledger's current period, from the object. */
export function minutesRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.get('/me/minutes', async (c) =>
    respond(c, MinutesSummary, await userObject(c.env, c.var.userId).balance()),
  );

  return routes;
}
