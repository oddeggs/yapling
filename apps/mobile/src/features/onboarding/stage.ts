import { API_ROUTES, Profile, StageRequest } from '@yapling/contracts';

import { isDataError, type DataError } from '../../data';
import { apiBase } from '../../data/config';
import type { Data } from '../../data/data';
import { createHttp, type Http } from '../../data/http';

/*
 * The learner moving their own stage (`POST /api/me/stage`): the level question's "Mình mới bắt
 * đầu", "Tập với Linh trước" and "Vào truyện". The answer is the whole profile, which replaces the
 * phone's copy. A request the server can't take yet (offline, or an API without the route) stays
 * pending in the onboarding state and is sent again later; one it refuses is dropped.
 */

/** What became of one send. */
export type StageSendOutcome =
  /** The server took it; the profile on the phone is the server's. */
  | 'done'
  /** Not now (no connection, the route not there yet, the server busy): send it again later. */
  | 'later'
  /** The request doesn't fit the learner's stage any more: drop it. */
  | 'refused';

/** Which failures are worth sending again. A 404 is: an API from before the route. */
export function outcomeOfError(error: unknown): StageSendOutcome {
  if (!isDataError(error)) return 'later';
  const e: DataError = error;
  if (e.kind === 'validation') return 'refused';
  if (e.kind === 'server' && (e.status === 400 || e.status === 409 || e.status === 422))
    return 'refused';
  return 'later';
}

/** Sends a stage request with the session's bearer (a 401 renews it once). */
export async function postStageRequest(
  http: Http,
  token: () => Promise<string>,
  renew: (refused: string) => Promise<string>,
  request: StageRequest,
): Promise<Profile> {
  const spec = {
    method: 'POST' as const,
    path: API_ROUTES.stage,
    body: request,
    request: StageRequest,
    response: Profile,
  };
  const bearer = await token();
  try {
    return await http.send({ ...spec, token: bearer });
  } catch (error) {
    if (!isDataError(error, 'unauthorized')) throw error;
    return http.send({ ...spec, token: await renew(bearer) });
  }
}

let http: Http | null = null;

/**
 * Sends `request` for the app's learner. Only with a session and a profile on the phone: a stage
 * request never makes a session of its own.
 */
export async function sendStageRequest(
  data: Data,
  request: StageRequest,
): Promise<StageSendOutcome> {
  if (data.session.state.session === null || data.profile.resource.data === null) return 'later';
  http ??= createHttp({ base: apiBase() });
  try {
    const profile = await postStageRequest(
      http,
      () => data.session.token(),
      (refused) => data.session.renew(refused),
      request,
    );
    await data.profile.resource.setFromServer(profile);
    return 'done';
  } catch (error) {
    const outcome = outcomeOfError(error);
    // Refused: the server's stage is the truth; fetch it.
    if (outcome === 'refused') void data.profile.refresh().catch(() => undefined);
    return outcome;
  }
}
