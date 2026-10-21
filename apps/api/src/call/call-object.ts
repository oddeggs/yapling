import { DurableObject } from 'cloudflare:workers';

import type { Bindings } from '../env';

/** One per live call: the learner's audio in, the character's turns and voice out. */
export class CallDO extends DurableObject<Bindings> {
  /** Answers `GET /health` only, until the object has a protocol. */
  override fetch(request: Request): Response {
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/health') {
      return Response.json({ status: 'ok', object: 'call' });
    }
    return Response.json({ error: { code: 'not_found' } }, { status: 404 });
  }
}
