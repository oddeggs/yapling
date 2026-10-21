import { z } from 'zod';

import { Id } from '../primitives';

/**
 * Every error answer: `{ error: { code } }`. Codes are slugs (`not_found`, `internal`,
 * `unauthorized`, `bad_request`, `conflict`, `rate_limited`, …); the app shows its own copy for
 * each and never the server's text.
 */
export const ApiError = z.object({ error: z.object({ code: Id }) });
export type ApiError = z.infer<typeof ApiError>;
