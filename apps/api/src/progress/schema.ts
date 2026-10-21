import { Progress } from '@yapling/contracts';

/**
 * `PUT /api/me/progress`: the phone's whole progress, with `revision` the server revision it was
 * based on. The server takes it only over that revision and answers the stored progress with the
 * next one; an older revision is refused with 409 `stale_revision`, and the phone reads the
 * server's copy, which wins. `installedOn` and `dayIndex` are the server's and are ignored.
 *
 * Not in `@yapling/contracts` yet, which lists only `GET`: kept here until the contracts take it.
 */
export const ProgressPut = Progress;
export type ProgressPut = Progress;

export const STALE_REVISION = 'stale_revision';
