import { DurableObject } from 'cloudflare:workers';

import type { Bindings } from '../env';

/** One per learner: the day clock and knock schedule, alarms, the live-minute ledger. */
export class UserDO extends DurableObject<Bindings> {
  /** Answers `GET /health` only, until the object has a protocol. */
  override fetch(request: Request): Response {
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/health') {
      return Response.json({ status: 'ok', object: 'user' });
    }
    return Response.json({ error: { code: 'not_found' } }, { status: 404 });
  }
}
