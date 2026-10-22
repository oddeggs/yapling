import type { CallDO } from './call/call-object';
import type { UserDO } from './user/user-object';

/**
 * Secrets the Worker expects, by name. Values live in Wrangler secrets (deployed) or `.dev.vars`
 * (local, ignored by git); `.dev.vars.example` lists the same names.
 */
export const secretNames = [
  // Claude: the live turns and the post-call summary.
  'ANTHROPIC_API_KEY',
  // ElevenLabs: realtime speech-to-text and streaming text-to-speech.
  'ELEVENLABS_API_KEY',
  // Signs sessions and socket tokens.
  'BETTER_AUTH_SECRET',
  // Sign in with Apple key (team, key id, .p8 as PEM): revokes Apple tokens on account deletion.
  'APPLE_TEAM_ID',
  'APPLE_KEY_ID',
  'APPLE_PRIVATE_KEY',
  // RevenueCat's webhook: the whole Authorization header it sends (src/purchases).
  'REVENUECAT_WEBHOOK_AUTH',
  // TypeSafe: Jev, the live call's turn judge (src/call/judge.ts).
  'TYPESAFE_API_KEY',
] as const;
export type SecretName = (typeof secretNames)[number];

/** A secret is absent until it has been set for the environment, so readers must handle that. */
export type Secrets = { readonly [K in SecretName]?: string };

export type EnvironmentName = 'dev' | 'prd';

/** Everything `wrangler.jsonc` binds for an environment, plus the secrets. */
export type Bindings = Secrets & {
  readonly ENVIRONMENT: EnvironmentName;
  readonly COMMIT_SHA: string;
  /** One call object per live call. */
  readonly CALL: DurableObjectNamespace<CallDO>;
  /** One user object per learner: the day clock, alarms and the live-minute ledger. */
  readonly USER: DurableObjectNamespace<UserDO>;
  /** Accounts and progress (`yapling`, `yapling-dev`). */
  readonly DB: D1Database;
  /** Call transcripts and voice capsules (`yapling-blobs`, `yapling-blobs-dev`). */
  readonly BLOBS: R2Bucket;
  /** Post-call jobs and deletions. */
  readonly JOBS: Queue;
};

export type AppEnv = {
  Bindings: Bindings;
};
