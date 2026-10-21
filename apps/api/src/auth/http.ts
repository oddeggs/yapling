import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';

/*
 * Request and response bodies, always through the schemas in `@yapling/contracts`. A request that
 * fails its schema answers 400 `bad_request`; a response that fails its schema is a bug and throws,
 * which the app's error handler answers as 500 `internal`.
 */

/** A non-2xx answer in the contracts' `ApiError` shape. */
export function errorResponse(c: Context, status: ContentfulStatusCode, code: string): Response {
  return c.json({ error: { code } }, status);
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; response: Response };

/** A JSON body checked against a schema. */
export async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<Parsed<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, response: errorResponse(c, 400, 'bad_request') };
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, response: errorResponse(c, 400, 'bad_request') };
}

/** A JSON answer, checked against its schema first. */
export function respond<T>(
  c: Context,
  schema: z.ZodType<T>,
  value: T,
  status: ContentfulStatusCode = 200,
): Response {
  return c.json(schema.parse(value) as object, status);
}
