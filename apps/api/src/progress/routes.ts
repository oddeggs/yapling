import { Progress, SeasonKeepsakeRequest, type PhraseProgress } from '@yapling/contracts';
import { Hono } from 'hono';

import { errorResponse, parseBody, respond, type SessionEnv } from '../auth';
import { ProgressPut, STALE_REVISION } from './schema';
import { keepSeasonKeepsake, SEASON_NOT_FINISHED } from './season-keepsake';
import { readProgress, writeProgress } from './store';

/** Whether the raw body (already parsed once, so cached) has the Settling-in chapters. */
async function carriesSettling(raw: Promise<unknown>): Promise<boolean> {
  const body = await raw;
  return typeof body === 'object' && body !== null && 'settlingChaptersDone' in body;
}

/**
 * The body's phrases with when Pip last reused each kept from the stored copy where the body
 * leaves it out (an older app's body never has it), so a sync never makes Pip reuse a phrase
 * again before its week of rest.
 */
export function keepPipReuse(
  phrases: readonly PhraseProgress[],
  stored: readonly PhraseProgress[],
): PhraseProgress[] {
  const reusedAt = new Map(stored.map((p) => [p.id, p.pipReusedAt ?? null]));
  return phrases.map((p) => {
    const kept = reusedAt.get(p.id) ?? null;
    return p.pipReusedAt === undefined && kept !== null ? { ...p, pipReusedAt: kept } : p;
  });
}

/**
 * Progress sync, behind the session guard:
 * - `GET /me/progress`: everything the burrow, the week view and the Me sheet show.
 * - `PUT /me/progress` (`ProgressPut`): the phone's copy over the revision it was based on; 409
 *   `stale_revision` over any other, when the phone reads the server's copy, which wins. A body
 *   without `settlingChaptersDone` (an older app's) keeps the saved chapters, and a phrase without
 *   `pipReusedAt` keeps the saved one.
 * - `POST /me/keepsakes/season` (`SeasonKeepsakeRequest`): the season keepsake kept in progress once
 *   the stored rings show every episode played; 409 `season_not_finished` before then, 404
 *   `not_found` for a season there isn't. Asking again answers the same progress.
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
    const stored = await readProgress(c.env.DB, c.var.userId, Date.now());
    lists.phrases = keepPipReuse(lists.phrases, stored.phrases);
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

  routes.post('/me/keepsakes/season', async (c) => {
    const body = await parseBody(c, SeasonKeepsakeRequest);
    if (!body.ok) return body.response;
    const outcome = await keepSeasonKeepsake(c.env.DB, c.var.userId, body.value.season, Date.now());
    if (!outcome.ok) {
      return outcome.error === 'no_season'
        ? errorResponse(c, 404, 'not_found')
        : errorResponse(c, 409, SEASON_NOT_FINISHED);
    }
    return respond(c, Progress, outcome.progress);
  });

  return routes;
}
