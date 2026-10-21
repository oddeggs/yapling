import { ApiError } from '@yapling/contracts';

/**
 * What can go wrong talking to the API, as the app tells it apart. Screens map each kind to their
 * own copy; the server's text is never shown.
 * - `network`: no answer (offline, the API down, a timeout).
 * - `unauthorized`: no session, or the session ended (401).
 * - `stale_revision`: progress was based on an old revision (409); the server's copy wins.
 * - `memory_full`: Pip remembers as much as one learner keeps (409).
 * - `unavailable`: the server is up but can't serve this now (503).
 * - `not_found`: nothing there (404), such as a profile before onboarding.
 * - `validation`: a body failed its schema, on the way out (a bug here) or back (a bug there).
 * - `server`: any other answer (5xx, 400, an unknown code).
 */
export type DataErrorKind =
  | 'network'
  | 'unauthorized'
  | 'stale_revision'
  | 'memory_full'
  | 'unavailable'
  | 'not_found'
  | 'validation'
  | 'server';

export class DataError extends Error {
  constructor(
    readonly kind: DataErrorKind,
    /** The HTTP status; 0 when there was no answer or the request never left. */
    readonly status: number = 0,
    /** The server's error code, when it sent one. */
    readonly code: string | null = null,
  ) {
    super(code === null ? kind : `${kind} (${code})`);
    this.name = 'DataError';
  }
}

export const isDataError = (error: unknown, kind?: DataErrorKind): error is DataError =>
  error instanceof DataError && (kind === undefined || error.kind === kind);

/** The kind of a non-2xx answer, from its status and the body's code. */
export function errorFromResponse(status: number, body: unknown): DataError {
  const parsed = ApiError.safeParse(body);
  const code = parsed.success ? parsed.data.error.code : null;
  if (status === 401) return new DataError('unauthorized', status, code);
  if (code === 'stale_revision') return new DataError('stale_revision', status, code);
  if (code === 'memory_full') return new DataError('memory_full', status, code);
  if (status === 503) return new DataError('unavailable', status, code);
  if (status === 404) return new DataError('not_found', status, code);
  return new DataError('server', status, code);
}
