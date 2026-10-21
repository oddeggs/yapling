import {
  API_ROUTES,
  AppleLinkRequest,
  CallRecord,
  CallRecordList,
  DeleteAccountRequest,
  DeleteAccountResponse,
  GuestSessionRequest,
  MemoryCreate,
  MemoryItem,
  MemoryList,
  MemoryUpdate,
  MinutesSummary,
  Profile,
  ProfileInput,
  ProfileUpdate,
  Progress,
  ProgressPut,
  PushTokenRegistration,
  Session,
} from '@yapling/contracts';

import { isDataError } from './errors';
import type { Http, Method, RequestSpec } from './http';

/** Where the client gets its bearer. The session manager is one. */
export interface TokenSource {
  /** The bearer for a request, making a session first when there is none. */
  token(): Promise<string>;
  /** The server refused `refused`: a new token, or throws `unauthorized`. */
  renew(refused: string): Promise<string>;
}

/** The session routes, the only ones without a session of their own. */
export interface SessionApi {
  /** `POST /api/session/guest`. */
  guestSession(body: GuestSessionRequest): Promise<Session>;
  /** `POST /api/session/apple`, with the guest's token when there is one (keeps its progress). */
  appleSession(body: AppleLinkRequest, guestToken: string | null): Promise<Session>;
}

/** One function per route in `API_ROUTES`, behind the session. */
export interface ApiClient {
  getProfile(): Promise<Profile>;
  putProfile(body: ProfileInput): Promise<Profile>;
  patchProfile(body: ProfileUpdate): Promise<Profile>;
  getProgress(): Promise<Progress>;
  /** 409 `stale_revision` when `body.revision` is not the server's. */
  putProgress(body: ProgressPut): Promise<Progress>;
  listMemory(): Promise<MemoryList>;
  createMemory(body: MemoryCreate): Promise<MemoryItem>;
  updateMemory(id: string, body: MemoryUpdate): Promise<MemoryItem>;
  deleteMemory(id: string): Promise<void>;
  getMinutes(): Promise<MinutesSummary>;
  listCalls(): Promise<CallRecordList>;
  getCall(id: string): Promise<CallRecord>;
  registerPushToken(body: PushTokenRegistration): Promise<void>;
  unregisterPushToken(body: PushTokenRegistration): Promise<void>;
  deleteAccount(body: DeleteAccountRequest): Promise<DeleteAccountResponse>;
  /** The call socket's URL; its token goes in `hello`, never here. */
  callSocketUrl(): string;
}

export function createSessionApi(http: Http): SessionApi {
  return {
    guestSession: (body) =>
      http.send({
        method: 'POST',
        path: API_ROUTES.guestSession,
        body,
        request: GuestSessionRequest,
        response: Session,
      }),
    appleSession: (body, guestToken) =>
      http.send({
        method: 'POST',
        path: API_ROUTES.appleSession,
        body,
        request: AppleLinkRequest,
        response: Session,
        token: guestToken,
      }),
  };
}

type Authed = <Req, Res>(spec: Omit<RequestSpec<Req, Res>, 'token'>) => Promise<Res>;

/** Sends with the session's bearer; a 401 renews the session once and sends again. */
function authedSender(http: Http, auth: TokenSource): Authed {
  return async (spec) => {
    const token = await auth.token();
    try {
      return await http.send({ ...spec, token });
    } catch (error) {
      if (!isDataError(error, 'unauthorized')) throw error;
      const renewed = await auth.renew(token);
      return http.send({ ...spec, token: renewed });
    }
  };
}

export function createApiClient(http: Http, auth: TokenSource): ApiClient {
  const send = authedSender(http, auth);
  const json = <Req, Res>(
    method: Method,
    path: string,
    request: RequestSpec<Req, Res>['request'],
    response: RequestSpec<Req, Res>['response'],
    body?: Req,
  ) =>
    send<Req, Res>({
      method,
      path,
      response,
      ...(request ? { request } : {}),
      ...(body !== undefined ? { body } : {}),
    });

  return {
    getProfile: () => json('GET', API_ROUTES.profile, undefined, Profile),
    putProfile: (body) => json('PUT', API_ROUTES.profile, ProfileInput, Profile, body),
    patchProfile: (body) => json('PATCH', API_ROUTES.profile, ProfileUpdate, Profile, body),
    getProgress: () => json('GET', API_ROUTES.progress, undefined, Progress),
    putProgress: (body) => json('PUT', API_ROUTES.progress, ProgressPut, Progress, body),
    listMemory: () => json('GET', API_ROUTES.memory, undefined, MemoryList),
    createMemory: (body) => json('POST', API_ROUTES.memory, MemoryCreate, MemoryItem, body),
    updateMemory: (id, body) =>
      json('PATCH', API_ROUTES.memoryItem(id), MemoryUpdate, MemoryItem, body),
    deleteMemory: (id) => json('DELETE', API_ROUTES.memoryItem(id), undefined, null),
    getMinutes: () => json('GET', API_ROUTES.minutes, undefined, MinutesSummary),
    listCalls: () => json('GET', API_ROUTES.calls, undefined, CallRecordList),
    getCall: (id) => json('GET', API_ROUTES.call(id), undefined, CallRecord),
    registerPushToken: (body) =>
      json('PUT', API_ROUTES.pushToken, PushTokenRegistration, null, body),
    unregisterPushToken: (body) =>
      json('DELETE', API_ROUTES.pushToken, PushTokenRegistration, null, body),
    deleteAccount: (body) =>
      json('POST', API_ROUTES.deleteAccount, DeleteAccountRequest, DeleteAccountResponse, body),
    callSocketUrl: () => `${http.origin.replace(/^http/, 'ws')}${API_ROUTES.callSocket}`,
  };
}
