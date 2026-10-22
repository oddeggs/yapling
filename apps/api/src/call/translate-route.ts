import { Hono } from 'hono';
import { z } from 'zod';

import { errorResponse, parseBody, type SessionEnv } from '../auth';
import { objectIdOfToken } from './call-object';
import { TRANSLATE_TEXT_MAX } from './translate';

/*
 * `POST /api/calls/translate`: a spoken line in the learner's first language, on a tap during a
 * live call. The body names the call by the resume token its `ready` frame gave the phone; the
 * session guard for `/calls/*` gives the learner. The call object answers, so the model is asked
 * from US West (Cloudflare's Hong Kong colo is refused by the Anthropic API) and the cost lands
 * on the call's own record.
 *
 * Answers `{ gloss }` (null when the learner's stage gets no line glosses, or none was found),
 * 404 `no_call` when the call is over or isn't theirs, 429 `too_many` past the call's cap.
 */

export const TranslateRequest = z.object({
  call: z.string().min(1).max(200),
  text: z.string().trim().min(1).max(TRANSLATE_TEXT_MAX),
});

export type TranslateOutcome =
  | { readonly ok: true; readonly gloss: string | null }
  | { readonly ok: false; readonly code: 'no_call' | 'too_many' | 'failed' };

export function callTranslateRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();
  routes.post('/calls/translate', async (c) => {
    const body = await parseBody(c, TranslateRequest);
    if (!body.ok) return body.response;
    const objectId = objectIdOfToken(body.value.call);
    if (objectId === null) return errorResponse(c, 404, 'no_call');
    let id: DurableObjectId;
    try {
      id = c.env.CALL.idFromString(objectId);
    } catch {
      // Not an object id of this namespace.
      return errorResponse(c, 404, 'no_call');
    }
    let outcome: TranslateOutcome;
    try {
      const stub = c.env.CALL.get(id);
      outcome = await stub.translate(body.value.call, c.var.userId, body.value.text);
    } catch (error) {
      console.error('call translate failed', { error: String(error).slice(0, 200) });
      return errorResponse(c, 502, 'failed');
    }
    if (outcome.ok) return c.json({ gloss: outcome.gloss });
    const status = outcome.code === 'no_call' ? 404 : outcome.code === 'too_many' ? 429 : 502;
    return errorResponse(c, status, outcome.code);
  });
  return routes;
}
