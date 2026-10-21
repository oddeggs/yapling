import type { Bindings } from '../env';

/*
 * Apple's refresh token, kept so deleting the account can revoke it, as App Review requires of
 * apps with Sign in with Apple. This needs the team's Sign in with Apple key, so it runs only where
 * the three secrets below are set; without them sign-in still works (it needs no secret) and
 * deletion skips the revocation.
 */

export const appleSecretNames = ['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'] as const;

export interface AppleKey {
  readonly teamId: string;
  readonly keyId: string;
  /** The `.p8` key, PEM (PKCS #8). */
  readonly privateKey: string;
  /** The bundle id the tokens were issued for. */
  readonly clientId: string;
}

const APPLE = 'https://appleid.apple.com';

/** The key when all three secrets are set for the environment, else null. */
export function appleKeyOf(env: Bindings, clientId: string | null): AppleKey | null {
  const teamId = env.APPLE_TEAM_ID;
  const keyId = env.APPLE_KEY_ID;
  const privateKey = env.APPLE_PRIVATE_KEY;
  if (!teamId || !keyId || !privateKey || clientId === null) return null;
  return { teamId, keyId, privateKey, clientId };
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemBytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

/** The short-lived client secret Apple's token endpoints take: an ES256 JWT signed by the key. */
export async function appleClientSecret(key: AppleKey, now: number): Promise<string> {
  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    pemBytes(key.privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const encoder = new TextEncoder();
  const iat = Math.floor(now / 1000);
  const header = base64Url(encoder.encode(JSON.stringify({ alg: 'ES256', kid: key.keyId })));
  const payload = base64Url(
    encoder.encode(
      JSON.stringify({ iss: key.teamId, iat, exp: iat + 300, aud: APPLE, sub: key.clientId }),
    ),
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    encoder.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
}

async function post(path: string, form: Record<string, string>): Promise<Response> {
  return fetch(`${APPLE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
}

/** Trades the sheet's authorization code for Apple's refresh token; null when Apple refuses. */
export async function exchangeAuthorizationCode(
  key: AppleKey,
  code: string,
  now: number,
): Promise<string | null> {
  const response = await post('/auth/token', {
    client_id: key.clientId,
    client_secret: await appleClientSecret(key, now),
    code,
    grant_type: 'authorization_code',
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  const token =
    typeof body === 'object' && body !== null && 'refresh_token' in body
      ? body.refresh_token
      : null;
  return typeof token === 'string' && token !== '' ? token : null;
}

/** Revokes a refresh token; true when Apple accepted it. */
export async function revokeRefreshToken(
  key: AppleKey,
  refreshToken: string,
  now: number,
): Promise<boolean> {
  const response = await post('/auth/revoke', {
    client_id: key.clientId,
    client_secret: await appleClientSecret(key, now),
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });
  return response.ok;
}
