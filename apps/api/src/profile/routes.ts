import { Profile, ProfileInput, ProfileUpdate } from '@yapling/contracts';
import { Hono } from 'hono';

import { errorResponse, parseBody, respond, type SessionEnv } from '../auth';
import { patchProfile, putProfile, readProfile } from './store';

/**
 * The profile, behind the session guard:
 * - `GET /me/profile`: 404 `not_found` until onboarding wrote it.
 * - `PUT /me/profile` (`ProfileInput`): the whole profile, at the end of onboarding.
 * - `PATCH /me/profile` (`ProfileUpdate`): some fields.
 *
 * The stage is never the client's: the request schemas leave it out, so a `stage` in a body is
 * dropped, and a PATCH that changes nothing else is refused as empty.
 */
export function profileRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.get('/me/profile', async (c) => {
    const profile = await readProfile(c.env.DB, c.var.userId);
    if (profile === null) return errorResponse(c, 404, 'not_found');
    return respond(c, Profile, profile);
  });

  routes.put('/me/profile', async (c) => {
    const body = await parseBody(c, ProfileInput);
    if (!body.ok) return body.response;
    return respond(c, Profile, await putProfile(c.env.DB, c.var.userId, body.value, Date.now()));
  });

  routes.patch('/me/profile', async (c) => {
    const body = await parseBody(c, ProfileUpdate);
    if (!body.ok) return body.response;
    const profile = await patchProfile(c.env.DB, c.var.userId, body.value, Date.now());
    if (profile === null) return errorResponse(c, 404, 'not_found');
    return respond(c, Profile, profile);
  });

  return routes;
}
