import { z } from 'zod';

import { EpochMs } from '../primitives';

/**
 * `POST /api/me/delete`: delete the account. D1 rows, R2 objects (transcripts, voice capsules) and
 * the learner's object state go within 24 hours; the session ends now.
 */
export const DeleteAccountRequest = z.object({ confirm: z.literal(true) });
export type DeleteAccountRequest = z.infer<typeof DeleteAccountRequest>;

export const DeleteAccountResponse = z.object({
  /** When everything is gone, at most 24 hours from the request. */
  deletedBy: EpochMs,
});
export type DeleteAccountResponse = z.infer<typeof DeleteAccountResponse>;
