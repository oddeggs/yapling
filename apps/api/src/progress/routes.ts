import { Progress } from '@yapling/contracts';
import { Hono } from 'hono';

import { errorResponse, parseBody, respond, type SessionEnv } from '../auth';
import { ProgressPut, STALE_REVISION } from './schema';
import { readProgress, writeProgress } from './store';

/** Whether the raw body (already parsed once, so cached) has the Settling-in chapters. */
async function carriesSettling(raw: Promise<unknown>): Promise<boolean> {
  const body = await raw;
  return typeof body === 'object' && body !== null && 'settlingChaptersDone' in body;
}

/**
 * Progress sync, behind the session guard:
 * - `GET /me/progress`: everything the burrow, the week view and the Me sheet show.
 * - `PUT /me/progress` (`ProgressPut`): the phone's copy over the revision it was based on; 409
 *   `stale_revision` over any other, when the phone reads the server's copy, which wins. A body
 *   without `settlingChaptersDone` (an older app's) keeps the saved chapters.
 */
export function progressRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.get('/me/progress', async (c) =>
    respond(c, Progress, await readProgress(c.env.DB, c.var.userId, Date.now())),
  );

  routes.put('/me/progress', async (c) => {
    const body = await parseBody(c, ProgressPut);
    if (!body.ok) return body.response;
    // The schema defaults a missing list to empty; only a list the body carries replaces it.
    const { settlingChaptersDone, ...lists } = body.value;
    const carried = await carriesSettling(c.req.json());
    const outcome = await writeProgress(
      c.env.DB,
      c.var.userId,
      {
        baseRevision: body.value.revision,
        lists: carried ? { ...lists, settlingChaptersDone } : lists,
      },
      Date.now(),
    );
    if (!outcome.ok) return errorResponse(c, 409, STALE_REVISION);
    return respond(c, Progress, outcome.progress);
  });

  return routes;
}
