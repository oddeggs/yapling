import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('GET /api/health', () => {
  it('answers with the environment and commit', async () => {
    const response = await exports.default.fetch('https://api.yapling.test/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', environment: 'dev', commit: 'local' });
  });

  it('answers an unknown path with the not-found error', async () => {
    const response = await exports.default.fetch('https://api.yapling.test/api/nowhere');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: 'not_found' } });
  });
});

describe('durable objects', () => {
  const objects = [
    ['call', env.CALL],
    ['user', env.USER],
  ] as const;

  it.each(objects)('the %s object answers its health check', async (object, namespace) => {
    const stub = namespace.get(namespace.idFromName('health'));
    const response = await stub.fetch('https://object/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', object });
  });

  it.each(objects)('the %s object answers anything else with not found', async (_, namespace) => {
    const stub = namespace.get(namespace.idFromName('health'));
    const response = await stub.fetch('https://object/elsewhere');
    expect(response.status).toBe(404);
  });
});

describe('bindings', () => {
  it('has the database, the blob bucket and the jobs queue', async () => {
    const row = await env.DB.prepare('select 1 as one').first<{ one: number }>();
    expect(row?.one).toBe(1);
    await env.BLOBS.put('health', 'ok');
    expect(await (await env.BLOBS.get('health'))?.text()).toBe('ok');
    await env.BLOBS.delete('health');
    expect(typeof env.JOBS.send).toBe('function');
  });
});
