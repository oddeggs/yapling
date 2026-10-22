import { Profile, ProfileInput, ProfileUpdate, StageRequest } from '@yapling/contracts';
import { Hono } from 'hono';

import { errorResponse, parseBody, respond, type SessionEnv } from '../auth';
import { requestStage } from './stage';
import { patchProfile, putProfile, readProfile } from './store';

/** A stage request that doesn't fit the learner's stage. */
export const STAGE_CONFLICT = 'stage_conflict';

/**
 * The profile, behind the session guard:
 * - `GET /me/profile`: 404 `not_found` until onboarding wrote it.
 * - `PUT /me/profile` (`ProfileInput`): the whole profile, at the end of onboarding.
 * - `PATCH /me/profile` (`ProfileUpdate`): some fields.
 * - `POST /me/stage` (`StageRequest`): the learner moving their own stage, answering the profile;
 *   404 `not_found` before onboarding, 409 `stage_conflict` when the move doesn't fit the stage
 *   they have (`resolveStageRequest`).
 *
 * The stage is never set by a profile write: the request schemas leave it out, so a `stage` in a
 * body is dropped, and a PATCH that changes nothing else is refused as empty.
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

  routes.post('/me/stage', async (c) => {
    const body = await parseBody(c, StageRequest);
    if (!body.ok) return body.response;
    const outcome = await requestStage(c.env.DB, c.var.userId, body.value, Date.now());
    if (!outcome.ok) {
      return outcome.error === 'no_profile'
        ? errorResponse(c, 404, 'not_found')
        : errorResponse(c, 409, STAGE_CONFLICT);
    }
    return respond(c, Profile, outcome.profile);
  });

  return routes;
}
