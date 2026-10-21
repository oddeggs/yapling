import { createMiddleware } from 'hono/factory';

import type { AppEnv, Bindings } from '../env';
import { errorResponse } from './http';
import { AuthNotConfigured, authFor } from './instance';

/** Routes behind `requireSession` read the signed-in learner as `c.var.userId`. */
export type SessionEnv = AppEnv & { Variables: { userId: string; sessionId: string } };

export interface SignedIn {
  readonly userId: string;
  readonly sessionId: string;
  readonly isAnonymous: boolean;
}

function bearerHeaders(token: string): Headers {
  return new Headers({ authorization: `Bearer ${token}` });
}

function bearerOf(request: Request): string | null {
  const header = request.headers.get('authorization');
  const match = header === null ? null : /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

/**
 * The learner a bearer token signs in as, or null for a missing, unknown or expired one. Throws
 * `AuthNotConfigured` where the auth secret is unset.
 */
export async function signedInBy(
  env: Bindings,
  request: Request,
  token: string | null = bearerOf(request),
): Promise<SignedIn | null> {
  if (token === null) return null;
  // Only the bearer goes into Better Auth: never a cookie the phone replays.
  const session = await authFor(env, request).auth.api.getSession({
    headers: bearerHeaders(token),
  });
  if (!session) return null;
  const user = session.user as { id: string; isAnonymous?: boolean | null };
  return { userId: user.id, sessionId: session.session.id, isAnonymous: user.isAnonymous === true };
}

/**
 * The learner a session token speaks for, or null: what the call socket checks in `hello`, where
 * the token comes in the first frame rather than a header. Null too where the auth secret is unset.
 */
export async function userIdForToken(
  env: Bindings,
  token: string,
  request: Request = new Request('https://api.yapling.internal/api/calls/socket'),
): Promise<string | null> {
  try {
    return (await signedInBy(env, request, token))?.userId ?? null;
  } catch (error) {
    if (error instanceof AuthNotConfigured) return null;
    throw error;
  }
}

/**
 * Requires a session (`Authorization: Bearer <session token>`): 401 `unauthorized` without one, 503
 * `unavailable` where the auth secret is unset. Sets `userId` and `sessionId` for the route.
 */
export const requireSession = createMiddleware<SessionEnv>(async (c, next) => {
  let signedIn;
  try {
    signedIn = await signedInBy(c.env, c.req.raw);
  } catch (error) {
    if (error instanceof AuthNotConfigured) return errorResponse(c, 503, 'unavailable');
    throw error;
  }
  if (signedIn === null) return errorResponse(c, 401, 'unauthorized');
  c.set('userId', signedIn.userId);
  c.set('sessionId', signedIn.sessionId);
  await next();
});
