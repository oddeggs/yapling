import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import { requireSession, sessionRoutes, type SessionEnv } from '../auth';
import { momentRoutes } from '../director/routes';
import { memoryRoutes } from '../memory';
import { profileRoutes } from '../profile';
import { progressRoutes } from '../progress';
import { pushRoutes } from '../push';
import { minutesRoutes } from '../user';
import { deletionRoutes } from './delete-routes';

/** The call socket takes its session token in `hello`, so its upgrade request carries none. */
const CALL_SOCKET_PATH = '/api/calls/socket';

const requireSessionForCalls = createMiddleware<SessionEnv>(async (c, next) => {
  if (c.req.path === CALL_SOCKET_PATH) return next();
  return requireSession(c, next);
});

/**
 * Accounts and progress, mounted at `/api` before every other feature's routes:
 * - `/session/*`: guest and Apple sessions, the only routes besides health without a session.
 * - Every `/me/*` and `/calls/*` route, these and other features' alike, requires a session
 *   (`requireSession`); the call socket checks its token itself.
 */
export function accountRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.route('/', sessionRoutes());

  routes.use('/me', requireSession);
  routes.use('/me/*', requireSession);
  routes.use('/calls', requireSessionForCalls);
  routes.use('/calls/*', requireSessionForCalls);

  routes.route('/', profileRoutes());
  routes.route('/', progressRoutes());
  routes.route('/', memoryRoutes());
  routes.route('/', momentRoutes());
  routes.route('/', pushRoutes());
  routes.route('/', minutesRoutes());
  routes.route('/', deletionRoutes());

  return routes;
}
