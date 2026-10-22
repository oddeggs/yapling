import { CallClientFrame, parseFrame } from '@yapling/contracts';
import { Hono } from 'hono';

import { errorResponse } from '../auth';
import type { AppEnv, Bindings } from '../env';
import { objectIdOfToken } from './call-object';

/*
 * `GET /api/calls/socket`: the phone's call socket. The token comes in the first frame (`hello`),
 * not the URL, so the Worker accepts the socket, reads `hello`, and relays the socket to a call
 * object: the dropped call's own object when `hello` carries a resume token it still honours,
 * else a new one in US West. Every later frame passes through untouched.
 */

/** The furthest a test build's clock may be from the server's. */
const MAX_CLOCK_SHIFT_MS = 120 * 24 * 3_600_000;

/**
 * The dev Worker only: how far the app's clock (its test menu's time travel, `?clock=<epoch ms>`
 * on the socket URL) is ahead of the server's, so a test session that jumps to day 6 stamps the
 * call's phrase use on day 6. Any other environment, or a clock that makes no sense, is 0.
 */
export function appClockOffset(
  environment: string,
  clock: string | undefined,
  now: number,
): number {
  if (environment !== 'dev' || clock === undefined || !/^\d{10,16}$/.test(clock)) return 0;
  const offset = Math.round(Number(clock) - now);
  return Math.abs(offset) > MAX_CLOCK_SHIFT_MS ? 0 : offset;
}

/** Where call objects run: Anthropic refuses Cloudflare's Hong Kong colo. */
export const CALL_LOCATION: DurableObjectLocationHint = 'wnam';

async function callObjectFor(env: Bindings, first: string): Promise<DurableObjectStub> {
  const parsed = parseFrame(CallClientFrame, first);
  const token = parsed.ok && parsed.frame.type === 'hello' ? parsed.frame.resumeToken : null;
  const objectId = token === null ? null : objectIdOfToken(token);
  if (token !== null && objectId !== null) {
    try {
      const stub = env.CALL.get(env.CALL.idFromString(objectId));
      if (await stub.canResume(token)) return stub;
    } catch {
      // not an object id of this namespace
    }
  }
  return env.CALL.get(env.CALL.newUniqueId(), { locationHint: CALL_LOCATION });
}

function relay(env: Bindings, phone: WebSocket, country: string, clockOffset: number): void {
  let call: WebSocket | null = null;
  let connecting = false;
  let phoneGone = false;
  const pending: (string | ArrayBuffer)[] = [];
  const closeBoth = (code: number, reason: string) => {
    for (const ws of [phone, call]) {
      try {
        ws?.close(code, reason);
      } catch {
        // already closed
      }
    }
  };
  phone.addEventListener('message', (event) => {
    const data = event.data as string | ArrayBuffer;
    if (call !== null) {
      call.send(data);
      return;
    }
    pending.push(data);
    if (connecting || typeof data !== 'string') return;
    connecting = true;
    void (async () => {
      try {
        const stub = await callObjectFor(env, data);
        const response = await stub.fetch('https://call/socket', {
          headers: {
            Upgrade: 'websocket',
            'x-call-country': country,
            'x-call-clock-offset': String(clockOffset),
          },
        });
        const ws = response.webSocket;
        if (!ws) throw new Error(`call object answered ${response.status}`);
        ws.accept();
        ws.binaryType = 'arraybuffer';
        if (phoneGone) {
          // The phone left while the call object was reached: it never hears this call.
          ws.close(1000, 'gone');
          return;
        }
        ws.addEventListener('message', (e) => {
          try {
            phone.send(e.data as string | ArrayBuffer);
          } catch {
            // the phone is gone
          }
        });
        ws.addEventListener('close', (e) => closeBoth(e.code === 1005 ? 1000 : e.code, e.reason));
        call = ws;
        for (const message of pending.splice(0)) ws.send(message);
      } catch (error) {
        console.error('call relay failed', { error: String(error) });
        closeBoth(1011, 'unavailable');
      }
    })();
  });
  phone.addEventListener('close', (e) => {
    phoneGone = true;
    try {
      call?.close(e.code === 1005 ? 1000 : e.code, e.reason);
    } catch {
      // already closed
    }
  });
}

export function callSocketRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  routes.get('/calls/socket', (c) => {
    if (c.req.header('Upgrade') !== 'websocket') return errorResponse(c, 426, 'upgrade_required');
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();
    server.binaryType = 'arraybuffer';
    const cf = c.req.raw.cf as { country?: string } | undefined;
    const clock = appClockOffset(c.env.ENVIRONMENT, c.req.query('clock'), Date.now());
    relay(c.env, server, cf?.country ?? 'VN', clock);
    return new Response(null, { status: 101, webSocket: client });
  });
  return routes;
}
