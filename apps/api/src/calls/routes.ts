import { CallRecordList } from '@yapling/contracts';
import { Hono } from 'hono';

import { errorResponse, respond, type SessionEnv } from '../auth';
import { getCallRow, listCalls, recordOf } from './store';

/**
 * `GET /api/calls` (most recent first) and `GET /api/calls/:id`. The session guard for `/calls/*`
 * is mounted with the account routes; the socket (`/calls/socket`) is mounted before these.
 */
export function callRecordRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.get('/calls', async (c) => {
    const calls = await listCalls(c.env.DB, c.var.userId);
    return respond(c, CallRecordList, { calls });
  });

  routes.get('/calls/:id', async (c) => {
    const row = await getCallRow(c.env.DB, c.var.userId, c.req.param('id'));
    if (row === null) return errorResponse(c, 404, 'not_found');
    return c.json(recordOf(row));
  });

  return routes;
}
