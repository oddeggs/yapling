import { getMigrations } from 'better-auth/db/migration';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { buildAuthOptions } from './options';

describe('the D1 schema', () => {
  it('has every table and column Better Auth expects, by its own migrator', async () => {
    const options = buildAuthOptions({
      db: env.DB,
      secret: 'schema-check-secret-schema-check-secret',
      baseURL: 'https://api.yapling.test',
      appleBundleId: 'studio.oddeggs.yapling.dev',
    });
    const { toBeCreated, toBeAdded } = await getMigrations(options);
    expect(toBeCreated.map((table) => table.table)).toEqual([]);
    expect(toBeAdded.map((table) => [table.table, Object.keys(table.fields)])).toEqual([]);
  });

  it('cascades a deleted learner to their sessions and identities', async () => {
    const user = `u-${crypto.randomUUID()}`;
    const at = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
         VALUES (?, '', ?, 1, ?, ?)`,
      ).bind(user, `${user}@example.com`, at, at),
      env.DB.prepare(
        `INSERT INTO sessions (id, expires_at, token, created_at, updated_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(`s-${user}`, at, `t-${user}`, at, at, user),
      env.DB.prepare(
        `INSERT INTO accounts (id, account_id, provider_id, user_id, created_at, updated_at)
         VALUES (?, ?, 'apple', ?, ?, ?)`,
      ).bind(`a-${user}`, `sub-${user}`, user, at, at),
    ]);

    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user).run();

    const left = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM sessions WHERE user_id = ?1)
            + (SELECT COUNT(*) FROM accounts WHERE user_id = ?1) AS n`,
    )
      .bind(user)
      .first<{ n: number }>();
    expect(left?.n).toBe(0);
  });
});
