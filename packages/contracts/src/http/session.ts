import { z } from 'zod';

import { ClientVersion, EpochMs, OpaqueId, TimeZone, Token } from '../primitives';

/** `POST /api/session/guest`: a guest account for this install. The learner confirmed 18+. */
export const GuestSessionRequest = z.object({
  /** A random UUID the app makes once per install and keeps in the keychain. */
  installId: z.uuid(),
  clientVersion: ClientVersion,
  ageConfirmed: z.literal(true),
  /**
   * The phone's IANA timezone: the install day and the day count follow it until onboarding saves
   * the profile's.
   */
  timezone: TimeZone.optional(),
});
export type GuestSessionRequest = z.infer<typeof GuestSessionRequest>;

/**
 * `POST /api/session/apple` with the current guest session: Sign in with Apple, keeping the
 * guest's progress. On a new phone (no guest session) it signs in to the Apple account.
 */
export const AppleLinkRequest = z.object({
  identityToken: z.string().min(16).max(8_192),
  /** The raw nonce whose SHA-256 went to Apple's sheet. */
  nonce: z.string().min(16).max(256),
  authorizationCode: z.string().min(1).max(1_024).nullable(),
});
export type AppleLinkRequest = z.infer<typeof AppleLinkRequest>;

export const SESSION_KINDS = ['guest', 'apple'] as const;
export const SessionKind = z.enum(SESSION_KINDS);
export type SessionKind = z.infer<typeof SessionKind>;

/** A session: the bearer token for the API and the call socket's `hello`. */
export const Session = z.object({
  userId: OpaqueId,
  token: Token,
  expiresAt: EpochMs,
  kind: SessionKind,
});
export type Session = z.infer<typeof Session>;
