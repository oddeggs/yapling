import type { EnvironmentName } from '../env';

/** What Sign in with Apple needs per environment. None of it is secret. */
export interface IdentityConfig {
  /**
   * The bundle id Apple puts in an identity token's audience (`tech-decisions.md` §1). Null turns
   * Sign in with Apple off for the environment: `POST /api/session/apple` answers 503.
   */
  readonly appleBundleId: string | null;
}

const configs: Readonly<Record<EnvironmentName, IdentityConfig>> = {
  dev: { appleBundleId: 'studio.oddeggs.yapling.dev' },
  prd: { appleBundleId: 'studio.oddeggs.yapling' },
};

export function identityConfig(environment: EnvironmentName): IdentityConfig {
  return configs[environment];
}
