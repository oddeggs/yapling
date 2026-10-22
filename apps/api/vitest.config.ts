import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

// Tests run inside the Workers runtime against the `dev` environment's bindings, all simulated
// locally. The migration files are read here (Node) and applied in the runtime by the setup file.
export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc', environment: 'dev' },
        // Fake secrets: tests never read `.dev.vars` or share a secret with a deployment. Provider
        // calls go to the in-process fakes (`test/call/providers.ts`), so the keys are never sent.
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            BETTER_AUTH_SECRET: `${randomUUID()}${randomUUID()}`,
            ANTHROPIC_API_KEY: 'test-anthropic-key',
            ELEVENLABS_API_KEY: 'test-elevenlabs-key',
            TYPESAFE_API_KEY: 'test-typesafe-key',
            // Empty is unset: the Apple key stays off whatever a local `.dev.vars` holds.
            APPLE_TEAM_ID: '',
            APPLE_KEY_ID: '',
            APPLE_PRIVATE_KEY: '',
          },
        },
      }),
    ],
    test: { setupFiles: ['./test/apply-migrations.ts'] },
  };
});
