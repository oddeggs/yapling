import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Bindings } from '../env';
import {
  appleClientSecret,
  appleKeyOf,
  exchangeAuthorizationCode,
  revokeRefreshToken,
  type AppleKey,
} from './apple-tokens';

const ecdsa = { name: 'ECDSA', namedCurve: 'P-256' } as const;

async function testKey(): Promise<{ key: AppleKey; publicKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey(ecdsa, true, ['sign', 'verify']);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  let binary = '';
  for (const byte of pkcs8) binary += String.fromCharCode(byte);
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(binary)}\n-----END PRIVATE KEY-----`;
  return {
    key: { teamId: 'TEAM123456', keyId: 'KEY1234567', privateKey: pem, clientId: 'app.id' },
    publicKey: pair.publicKey,
  };
}

function decode(part: string): unknown {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(padded + '='.repeat((4 - (padded.length % 4)) % 4)));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the Apple key', () => {
  it('is off until all three secrets are set', () => {
    expect(appleKeyOf(env, 'app.id')).toBeNull();
    const partial = { ...env, APPLE_TEAM_ID: 'T', APPLE_KEY_ID: 'K' } as Bindings;
    expect(appleKeyOf(partial, 'app.id')).toBeNull();
    const full = { ...partial, APPLE_PRIVATE_KEY: 'pem' } as Bindings;
    expect(appleKeyOf(full, 'app.id')).toEqual({
      teamId: 'T',
      keyId: 'K',
      privateKey: 'pem',
      clientId: 'app.id',
    });
    expect(appleKeyOf(full, null)).toBeNull();
  });

  it('signs a client secret Apple can verify', async () => {
    const { key, publicKey } = await testKey();
    const now = 1_800_000_000_000;
    const secret = await appleClientSecret(key, now);
    const [header = '', payload = '', signature = ''] = secret.split('.');
    expect(decode(header)).toEqual({ alg: 'ES256', kid: 'KEY1234567' });
    expect(decode(payload)).toEqual({
      iss: 'TEAM123456',
      iat: now / 1000,
      exp: now / 1000 + 300,
      aud: 'https://appleid.apple.com',
      sub: 'app.id',
    });
    const raw = Uint8Array.from(
      atob(
        signature.replace(/-/g, '+').replace(/_/g, '/') +
          '='.repeat((4 - (signature.length % 4)) % 4),
      ),
      (c) => c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      raw,
      new TextEncoder().encode(`${header}.${payload}`),
    );
    expect(valid).toBe(true);
  });

  it('trades a code for a refresh token and revokes it', async () => {
    const { key } = await testKey();
    const forms: Record<string, string>[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const form = Object.fromEntries(
        new URLSearchParams(typeof init?.body === 'string' ? init.body : ''),
      );
      forms.push({ url, ...form });
      if (url.endsWith('/auth/token'))
        return Promise.resolve(Response.json({ refresh_token: 'r-1' }));
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    expect(await exchangeAuthorizationCode(key, 'code-1', Date.now())).toBe('r-1');
    expect(await revokeRefreshToken(key, 'r-1', Date.now())).toBe(true);
    expect(forms).toMatchObject([
      { url: 'https://appleid.apple.com/auth/token', code: 'code-1', client_id: 'app.id' },
      {
        url: 'https://appleid.apple.com/auth/revoke',
        token: 'r-1',
        token_type_hint: 'refresh_token',
      },
    ]);
  });

  it('answers null when Apple refuses the code', async () => {
    const { key } = await testKey();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 400 }));
    expect(await exchangeAuthorizationCode(key, 'bad', Date.now())).toBeNull();
  });
});
