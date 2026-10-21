import { betterAuth } from 'better-auth';

import type { Bindings } from '../env';
import { identityConfig } from './config';
import { buildAuthOptions } from './options';

/** Thrown when the environment lacks the auth secret; the routes answer 503 `unavailable`. */
export class AuthNotConfigured extends Error {
  constructor() {
    super('BETTER_AUTH_SECRET is not set for this environment');
  }
}

export function authSecret(env: Pick<Bindings, 'BETTER_AUTH_SECRET'>): string {
  const secret = env.BETTER_AUTH_SECRET;
  if (secret === undefined || secret.length < 32) throw new AuthNotConfigured();
  return secret;
}

function createAuth(env: Bindings, request: Request, created: Set<string>) {
  return betterAuth(
    buildAuthOptions({
      db: env.DB,
      secret: authSecret(env),
      baseURL: new URL(request.url).origin,
      appleBundleId: identityConfig(env.ENVIRONMENT).appleBundleId,
      databaseHooks: {
        user: {
          create: {
            after: (user) => {
              created.add(user.id);
              return Promise.resolve();
            },
          },
        },
      },
    }),
  );
}

export interface AuthInstance {
  readonly auth: ReturnType<typeof createAuth>;
  /** Users Better Auth created while serving this request. */
  readonly created: ReadonlySet<string>;
}

/*
 * One instance per request. An instance owns a database client whose connection is shared by
 * everything it runs, and the Workers runtime refuses I/O that crosses requests, so an instance
 * kept per isolate would fail concurrent requests. Building one takes well under a millisecond.
 */
const instances = new WeakMap<Request, AuthInstance>();

export function authFor(env: Bindings, request: Request): AuthInstance {
  let instance = instances.get(request);
  if (instance === undefined) {
    const created = new Set<string>();
    instance = { auth: createAuth(env, request, created), created };
    instances.set(request, instance);
  }
  return instance;
}
