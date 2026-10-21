import { DeleteAccountRequest, DeleteAccountResponse } from '@yapling/contracts';
import { Hono } from 'hono';

import { parseBody, respond, type SessionEnv } from '../auth';
import { deleteAccount } from './delete';

/**
 * `POST /me/delete` (`DeleteAccountRequest`), behind the session guard: deletes everything now and
 * answers when it was done. The session ends with it, so asking again answers 401.
 */
export function deletionRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.post('/me/delete', async (c) => {
    const body = await parseBody(c, DeleteAccountRequest);
    if (!body.ok) return body.response;
    const now = Date.now();
    await deleteAccount(c.env, c.var.userId, now);
    return respond(c, DeleteAccountResponse, { deletedBy: now });
  });

  return routes;
}
