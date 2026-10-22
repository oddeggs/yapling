import { API_ROUTES, Profile, StageRequest } from '@yapling/contracts';
import { useSyncExternalStore } from 'react';

import { appData, getSessionToken } from '../../data';
import { apiBase } from '../../data/config';
import { createHttp } from '../../data/http';
import { sqliteCache } from '../../data/sqlite-cache';
import { StageRequests, type PendingStage } from './stage-queue';

/*
 * The stage requests on the app's data: `POST /api/me/stage` with the session's token, the choice
 * kept in the phone's cache until the server has it, and the answered profile in the profile store.
 */

let shared: StageRequests | null = null;

/** The app's stage requests, on the API, the phone's cache and the profile store. */
export function stageRequests(): StageRequests {
  shared ??= new StageRequests({
    send: async (request) => {
      const http = createHttp({ base: apiBase() });
      return http.send({
        method: 'POST',
        path: API_ROUTES.stage,
        body: request,
        request: StageRequest,
        response: Profile,
        token: await getSessionToken(),
      });
    },
    storage: sqliteCache,
    onProfile: (profile) => appData().profile.resource.setFromServer(profile),
    onRefused: async () => {
      await appData().profile.refresh();
    },
    now: () => Date.now(),
    schedule: (retry, ms) => {
      const timer = setTimeout(retry, ms);
      return () => clearTimeout(timer);
    },
  });
  void shared.load();
  return shared;
}

/** The learner's choice still waiting for the server; null when there is none. */
export function usePendingStage(): PendingStage | null {
  const requests = stageRequests();
  return useSyncExternalStore(
    requests.subscribe,
    () => requests.current,
    () => requests.current,
  );
}
