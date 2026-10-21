import { PushTokenRegistration } from '@yapling/contracts';
import { Hono } from 'hono';

import { parseBody, type SessionEnv } from '../auth';
import { registerPushToken, removePushToken } from './store';

/**
 * The phone's Expo push token, behind the session guard:
 * - `PUT /me/push-token` (`PushTokenRegistration`): registers it; 204.
 * - `DELETE /me/push-token` (`PushTokenRegistration`): stops it; 204.
 */
export function pushRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.put('/me/push-token', async (c) => {
    const body = await parseBody(c, PushTokenRegistration);
    if (!body.ok) return body.response;
    await registerPushToken(c.env.DB, c.var.userId, body.value, Date.now());
    return c.body(null, 204);
  });

  routes.delete('/me/push-token', async (c) => {
    const body = await parseBody(c, PushTokenRegistration);
    if (!body.ok) return body.response;
    await removePushToken(c.env.DB, c.var.userId, body.value);
    return c.body(null, 204);
  });

  return routes;
}
