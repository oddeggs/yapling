import { CallRecordList } from '@yapling/contracts';
import { Hono } from 'hono';

import { errorResponse, respond, type SessionEnv } from '../auth';
import { listCallCosts, totalsOf } from './costs';
import { getCallRow, listCalls, recordOf } from './store';

/** How many calls the cost list shows unless asked (`?limit=`), and at most. */
const COSTS_DEFAULT = 20;
const COSTS_MAX = 100;

/**
 * `GET /api/calls` (most recent first), `GET /api/calls/:id`, and in the dev Worker
 * `GET /api/calls/dev/costs`. The session guard for `/calls/*`
 * is mounted with the account routes; the socket (`/calls/socket`) is mounted before these.
 */
export function callRecordRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.get('/calls', async (c) => {
    const calls = await listCalls(c.env.DB, c.var.userId);
    return respond(c, CallRecordList, { calls });
  });

  // The test menu's cost page: the learner's last calls with their cost and latency, and totals.
  // Dev Worker only; the store API answers 404.
  routes.get('/calls/dev/costs', async (c) => {
    if (c.env.ENVIRONMENT !== 'dev') return errorResponse(c, 404, 'not_found');
    const asked = Number.parseInt(c.req.query('limit') ?? '', 10);
    const limit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, COSTS_MAX) : COSTS_DEFAULT;
    const calls = await listCallCosts(c.env.DB, c.var.userId, limit);
    return c.json({
      calls: calls.map(({ userId: _userId, ...call }) => call),
      totals: totalsOf(calls),
    });
  });

  routes.get('/calls/:id', async (c) => {
    const row = await getCallRow(c.env.DB, c.var.userId, c.req.param('id'));
    if (row === null) return errorResponse(c, 404, 'not_found');
    return c.json(recordOf(row));
  });

  return routes;
}
