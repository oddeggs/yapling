import { vi } from 'vitest';

import { identityConfig } from '../config';

/**
 * A stand-in for Apple's identity-token issuer: the only test double in the sign-in tests, and
 * only at the network boundary. It holds an RS256 key pair, signs identity tokens, and answers
 * Better Auth's request for Apple's public keys with its own. Better Auth's real verifier still
 * checks the signature, issuer, audience, age, expiry and nonce of every token.
 */

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

export const DEV_APPLE_AUDIENCE = identityConfig('dev').appleBundleId ?? '';

type Claims = Record<string, unknown>;

/** What Apple's native sheet hands the app: the identity token and the raw nonce. */
export interface FromSheet {
  readonly identityToken: string;
  readonly nonce: string;
  readonly authorizationCode: string | null;
}

export interface TestIdentityProvider {
  /** What the sheet returns for `sub`: the token carries the raw nonce's SHA-256 (hex). */
  sheet(sub: string, claims?: Claims): Promise<FromSheet>;
  /** A token signed by a key the published key set doesn't have. */
  forged(sub: string): Promise<FromSheet>;
}

const encoder = new TextEncoder();

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const algorithm = {
  name: 'RSASSA-PKCS1-v1_5',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
} as const;

async function signJwt(privateKey: CryptoKey, kid: string, claims: Claims): Promise<string> {
  const header = base64Url(encoder.encode(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })));
  const payload = base64Url(encoder.encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign(
    algorithm.name,
    privateKey,
    encoder.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

/** Starts the stand-in; `vi.restoreAllMocks()` stops it. */
export async function startTestIdentityProvider(): Promise<TestIdentityProvider> {
  const kid = crypto.randomUUID();
  const keys = await crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
  const stranger = await crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
  const publicJwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
  const keySet = JSON.stringify({ keys: [{ ...publicJwk, kid, alg: 'RS256', use: 'sig' }] });

  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    if (requestUrl(input) === APPLE_KEYS_URL) {
      return Promise.resolve(
        new Response(keySet, { headers: { 'content-type': 'application/json' } }),
      );
    }
    return realFetch(input, init);
  });

  const now = () => Math.floor(Date.now() / 1000);
  const claimsFor = async (sub: string, nonce: string, claims: Claims): Promise<Claims> => ({
    iss: 'https://appleid.apple.com',
    aud: DEV_APPLE_AUDIENCE,
    sub,
    iat: now(),
    exp: now() + 600,
    email: `${sub}@privaterelay.appleid.com`,
    email_verified: 'true',
    is_private_email: 'true',
    nonce: await sha256Hex(nonce),
    ...claims,
  });
  const newNonce = () => `nonce-${crypto.randomUUID()}`;

  return {
    sheet: async (sub, claims = {}) => {
      const nonce = newNonce();
      const identityToken = await signJwt(
        keys.privateKey,
        kid,
        await claimsFor(sub, nonce, claims),
      );
      return { identityToken, nonce, authorizationCode: null };
    },
    forged: async (sub) => {
      const nonce = newNonce();
      const identityToken = await signJwt(
        stranger.privateKey,
        kid,
        await claimsFor(sub, nonce, {}),
      );
      return { identityToken, nonce, authorizationCode: null };
    },
  };
}
