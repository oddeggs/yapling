import type { BetterAuthOptions } from 'better-auth';
import { anonymous, bearer } from 'better-auth/plugins';

/** A session lives a year and is refreshed at most daily, so a learner is never signed out. */
export const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 365;
const SESSION_REFRESH_SECONDS = 60 * 60 * 24;

/** Better Auth's tables, renamed to the D1 schema in `migrations/0001_users_and_sessions.sql`. */
const userSchema = {
  modelName: 'users',
  fields: {
    name: 'name',
    email: 'email',
    emailVerified: 'email_verified',
    image: 'image',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
} as const;

const sessionSchema = {
  modelName: 'sessions',
  fields: {
    expiresAt: 'expires_at',
    token: 'token',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    ipAddress: 'ip_address',
    userAgent: 'user_agent',
    userId: 'user_id',
  },
} as const;

const accountSchema = {
  modelName: 'accounts',
  fields: {
    accountId: 'account_id',
    providerId: 'provider_id',
    userId: 'user_id',
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    idToken: 'id_token',
    accessTokenExpiresAt: 'access_token_expires_at',
    refreshTokenExpiresAt: 'refresh_token_expires_at',
    scope: 'scope',
    password: 'password',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
} as const;

const verificationSchema = {
  modelName: 'verifications',
  fields: {
    identifier: 'identifier',
    value: 'value',
    expiresAt: 'expires_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
} as const;

export interface AuthOptionsInput {
  readonly db: D1Database;
  readonly secret: string;
  /** The origin the request came to; Better Auth builds its own URLs from it. */
  readonly baseURL: string;
  /** Null: no Apple provider in this environment. */
  readonly appleBundleId: string | null;
  readonly databaseHooks?: BetterAuthOptions['databaseHooks'];
}

/**
 * Better Auth for Yapling, on D1: a guest first, then Sign in with Apple to keep progress across
 * phones. The Worker never mounts Better Auth's own endpoints: the routes in `routes.ts` call its
 * server API, so the only ways in are the ones in `@yapling/contracts`.
 *
 * Apple signs in with the identity token the phone's native sheet returns, verified by Better Auth
 * against Apple's published keys (issuer, audience, age, nonce). That needs no client secret, so
 * the redirect flow, which would, is never used.
 */
export function buildAuthOptions(input: AuthOptionsInput) {
  return {
    appName: 'Yapling',
    baseURL: input.baseURL,
    basePath: '/api/auth',
    secret: input.secret,
    database: input.db,
    user: userSchema,
    session: {
      ...sessionSchema,
      expiresIn: SESSION_LIFETIME_SECONDS,
      updateAge: SESSION_REFRESH_SECONDS,
    },
    account: {
      ...accountSchema,
      // Apple is the only provider: an identity is its Apple subject, never an email.
      accountLinking: { enabled: false },
    },
    verification: verificationSchema,
    socialProviders:
      input.appleBundleId === null
        ? {}
        : {
            apple: {
              clientId: input.appleBundleId,
              appBundleIdentifier: input.appleBundleId,
              // Read only by the redirect flow, which the app never takes.
              clientSecret: 'unused-identity-token-sign-in-only',
            },
          },
    plugins: [
      anonymous({
        schema: { user: { fields: { isAnonymous: 'is_anonymous' } } },
        // `apple.ts` decides what happens to the guest, so it is never deleted here.
        disableDeleteAnonymousUser: true,
      }),
      bearer(),
    ],
    advanced: {
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    ...(input.databaseHooks ? { databaseHooks: input.databaseHooks } : {}),
    telemetry: { enabled: false },
  } satisfies BetterAuthOptions;
}
