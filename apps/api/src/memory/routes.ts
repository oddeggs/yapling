import { MemoryCreate, MemoryItem, MemoryList, MemoryUpdate, OpaqueId } from '@yapling/contracts';
import { Hono } from 'hono';

import { errorResponse, parseBody, respond, type SessionEnv } from '../auth';
import { addMemory, deleteMemory, editMemory, listMemory } from './store';

/**
 * "What Pip remembers", visible and editable (concept §14), behind the session guard:
 * - `GET /me/memory`: every item, newest first.
 * - `POST /me/memory` (`MemoryCreate`): the learner's own item; 201, or 409 `memory_full`.
 * - `PATCH /me/memory/:id` (`MemoryUpdate`): the text, the category or both; 404 for an unknown id.
 * - `DELETE /me/memory/:id`: forgets it; 204, also for one already gone.
 */
export function memoryRoutes(): Hono<SessionEnv> {
  const routes = new Hono<SessionEnv>();

  routes.get('/me/memory', async (c) =>
    respond(c, MemoryList, { items: await listMemory(c.env.DB, c.var.userId) }),
  );

  routes.post('/me/memory', async (c) => {
    const body = await parseBody(c, MemoryCreate);
    if (!body.ok) return body.response;
    const item = await addMemory(
      c.env.DB,
      c.var.userId,
      { ...body.value, sourceCallId: null },
      Date.now(),
    );
    if (item === null) return errorResponse(c, 409, 'memory_full');
    return respond(c, MemoryItem, item, 201);
  });

  routes.patch('/me/memory/:id', async (c) => {
    const id = OpaqueId.safeParse(c.req.param('id'));
    if (!id.success) return errorResponse(c, 404, 'not_found');
    const body = await parseBody(c, MemoryUpdate);
    if (!body.ok) return body.response;
    const item = await editMemory(c.env.DB, c.var.userId, id.data, body.value, Date.now());
    if (item === null) return errorResponse(c, 404, 'not_found');
    return respond(c, MemoryItem, item);
  });

  routes.delete('/me/memory/:id', async (c) => {
    const id = OpaqueId.safeParse(c.req.param('id'));
    if (id.success) await deleteMemory(c.env.DB, c.var.userId, id.data);
    return c.body(null, 204);
  });

  return routes;
}
