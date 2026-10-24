import {
  API_ROUTES,
  DeleteAccountRequest,
  DeleteAccountResponse,
  MemoryList,
  MinutesSummary,
  MomentRequest,
  NextMoment,
  Painting,
  PaintingLines,
  PaintingList,
  VisitRequest,
} from '@yapling/contracts';

import type { TokenSource } from '../data/client';
import { isDataError } from '../data/errors';
import type { Http, Method } from '../data/http';

/*
 * The routes the app uses, behind the session: the next moment, Pip's free moment, the wall, the
 * minutes, what the town remembers, and deleting everything. A refused token is renewed once.
 */

export interface WorldApi {
  nextMoment(body: MomentRequest): Promise<NextMoment>;
  freeMoment(body: MomentRequest): Promise<NextMoment>;
  visit(body: VisitRequest): Promise<NextMoment>;
  paintings(): Promise<PaintingList>;
  paintingByCall(callId: string): Promise<Painting>;
  paintingLines(id: string): Promise<PaintingLines>;
  minutes(): Promise<MinutesSummary>;
  memory(): Promise<MemoryList>;
  forget(id: string): Promise<void>;
  deleteEverything(): Promise<DeleteAccountResponse>;
}

export function createWorldApi(http: Http, auth: TokenSource): WorldApi {
  async function send<Req, Res>(
    method: Method,
    path: string,
    response: Parameters<Http['send']>[0]['response'] | null,
    body?: Req,
    request?: Parameters<Http['send']>[0]['request'],
  ): Promise<Res> {
    const spec = {
      method,
      path,
      response: response as never,
      ...(body !== undefined ? { body } : {}),
      ...(request ? { request: request as never } : {}),
    };
    const token = await auth.token();
    try {
      return (await http.send({ ...spec, token })) as Res;
    } catch (error) {
      if (!isDataError(error, 'unauthorized')) throw error;
      return (await http.send({ ...spec, token: await auth.renew(token) })) as Res;
    }
  }
  return {
    nextMoment: (body) => send('POST', '/api/me/moments/next', NextMoment, body, MomentRequest),
    freeMoment: (body) => send('POST', '/api/me/moments/free', NextMoment, body, MomentRequest),
    visit: (body) => send('POST', '/api/me/moments/visit', NextMoment, body, VisitRequest),
    paintings: () => send('GET', '/api/me/paintings', PaintingList),
    paintingByCall: (callId) =>
      send('GET', `/api/me/paintings/by-call/${encodeURIComponent(callId)}`, Painting),
    paintingLines: (id) =>
      send('GET', `/api/me/paintings/${encodeURIComponent(id)}/lines`, PaintingLines),
    minutes: () => send('GET', API_ROUTES.minutes, MinutesSummary),
    memory: () => send('GET', API_ROUTES.memory, MemoryList),
    forget: (id) => send('DELETE', API_ROUTES.memoryItem(id), null),
    deleteEverything: () =>
      send(
        'POST',
        API_ROUTES.deleteAccount,
        DeleteAccountResponse,
        { confirm: true },
        DeleteAccountRequest,
      ),
  };
}
