import {
  CallClientFrame,
  decodeAudioFrame,
  parseFrame,
  PING,
  PONG,
  PROTOCOL_VERSION,
  type HelloFrame,
} from '@yapling/contracts';
import { WRAP_UP_SECONDS } from '@yapling/domain';
import { callKindOf, findScene, startScene, type RunnerState, type Scene } from '@yapling/story';
import { DurableObject } from 'cloudflare:workers';

import { userIdForToken } from '../auth';
import { callTime, savedSceneState } from '../calls/store';
import type { Bindings } from '../env';
import { userObject } from '../user';
import { newCallData, type CallData } from './finalize';
import { FrameSender } from './frames';
import { loadLearner } from './learner';
import { CONTINUOUS_GAP_MS } from './safety';
import { CallSession } from './session';

/*
 * One per live call, created in US West (`locationHint: 'wnam'`: Cloudflare's Hong Kong colo,
 * where calls from Vietnam land, is refused by the Anthropic API). The Worker relays the phone's
 * socket here after reading its `hello`; this object checks the token, runs the call, and keeps
 * its state for two minutes after a drop so `hello` with the resume token picks the beat up again.
 */

/** A dropped call can be resumed for this long. */
export const RESUME_WINDOW_MS = 2 * 60_000;
const STORAGE_KEY = 'call';
/** The app may send `placement` for the day-one unpacking chat. */
const SCENE_ALIASES: Readonly<Record<string, string>> = { placement: 's1-pro-unpack' };

export const resumeTokenOf = (objectId: string, secret: string) => `${objectId}.${secret}`;

/** The object id a resume token names, or null. */
export function objectIdOfToken(token: string): string | null {
  const [id] = token.split('.');
  return id !== undefined && /^[0-9a-f]{64}$/.test(id) ? id : null;
}

export class CallDO extends DurableObject<Bindings> {
  private session: CallSession | null = null;
  private socket: WebSocket | null = null;

  override fetch(request: Request): Response {
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/health') {
      return Response.json({ status: 'ok', object: 'call' });
    }
    if (pathname !== '/socket' || request.headers.get('Upgrade') !== 'websocket') {
      return Response.json({ error: { code: 'not_found' } }, { status: 404 });
    }
    const pair = new WebSocketPair();
    const [phone, server] = [pair[0], pair[1]];
    server.accept();
    // Newer compatibility dates deliver binary frames as Blob unless asked otherwise.
    server.binaryType = 'arraybuffer';
    const clockOffset = Number(request.headers.get('x-call-clock-offset') ?? 0) || 0;
    this.listen(server, request.headers.get('x-call-country') ?? 'VN', clockOffset);
    return new Response(null, { status: 101, webSocket: phone });
  }

  /** Whether a resume token can pick up a call here. */
  async canResume(token: string): Promise<boolean> {
    const data = await this.load();
    return data !== null && this.resumable(data, token);
  }

  override async alarm(): Promise<void> {
    const data = this.session?.data ?? (await this.load());
    if (data === null || data.detachedAt === null) return;
    if (Date.now() - data.detachedAt < RESUME_WINDOW_MS) {
      await this.ctx.storage.setAlarm(data.detachedAt + RESUME_WINDOW_MS);
      return;
    }
    const session = this.session ?? this.revive(data);
    await session?.end('idle');
  }

  private listen(socket: WebSocket, country: string, clockOffset: number): void {
    let hello: Promise<void> | null = null;
    const early: (string | ArrayBuffer)[] = [];
    socket.addEventListener('message', (event) => {
      const data = event.data as string | ArrayBuffer;
      if (data === PING) {
        socket.send(PONG);
        return;
      }
      if (hello === null) {
        hello = this.hello(socket, data, country, clockOffset).then(() => {
          for (const message of early.splice(0)) this.message(socket, message);
        });
        return;
      }
      if (this.socket !== socket) early.push(data);
      else this.message(socket, data);
    });
    socket.addEventListener('close', () => {
      if (this.socket !== socket) return;
      this.socket = null;
      const session = this.session;
      if (session === null || session.data.endReason !== null) return;
      session.detach();
      void this.ctx.storage.setAlarm(Date.now() + RESUME_WINDOW_MS);
    });
  }

  private message(socket: WebSocket, data: string | ArrayBuffer): void {
    const session = this.session;
    if (session === null || this.socket !== socket) return;
    if (typeof data !== 'string') {
      const decoded = decodeAudioFrame(data);
      if (decoded.ok && decoded.frame.kind === 'mic_pcm16') session.mic(decoded.frame.payload);
      return;
    }
    const parsed = parseFrame(CallClientFrame, data);
    if (parsed.ok) session.frame(parsed.frame);
  }

  private async hello(
    socket: WebSocket,
    raw: string | ArrayBuffer,
    country: string,
    clockOffset: number,
  ): Promise<void> {
    const reject = (
      code: 'unauthorized' | 'update_required' | 'unknown_scene' | 'minutes_exhausted',
    ) => {
      new FrameSender(socket).send({ type: 'error', code, fatal: true });
      socket.close(1008, code);
    };
    const parsed = typeof raw === 'string' ? parseFrame(CallClientFrame, raw) : null;
    if (!parsed?.ok || parsed.frame.type !== 'hello') return reject('unauthorized');
    const frame: HelloFrame = parsed.frame;
    if (frame.protocol !== PROTOCOL_VERSION) return reject('update_required');
    const userId = await userIdForToken(this.env, frame.token);
    if (userId === null) return reject('unauthorized');

    const existing = this.session?.data ?? (await this.load());
    if (existing !== null) {
      if (frame.resumeToken === null || existing.meta.userId !== userId)
        return reject('unauthorized');
      if (!this.resumable(existing, frame.resumeToken)) return reject('unauthorized');
      const session = this.session ?? this.revive(existing);
      if (session === null) return reject('update_required');
      if (this.socket !== null) {
        session.replace();
        const old = this.socket;
        this.socket = socket;
        old.close(1000, 'replaced');
      }
      this.socket = socket;
      await this.ctx.storage.deleteAlarm();
      await session.attach(socket, { newCall: false, freshScene: false }, frame.resumeToken);
      return;
    }

    const scene = findScene(SCENE_ALIASES[frame.sceneId] ?? frame.sceneId);
    if (!scene || callKindOf(scene.kind) === null) return reject('unknown_scene');
    const now = Date.now();
    const balance = await userObject(this.env, userId).balance();
    if (balance.leftSeconds <= 0) return reject('minutes_exhausted');
    const [learner, saved, time] = await Promise.all([
      // The learner's due phrases as of the app's day (a dev test session may be days ahead).
      loadLearner(this.env, userId, frame, scene, now + clockOffset),
      savedSceneState(this.env.DB, userId, scene.id),
      callTime(this.env.DB, userId, now, CONTINUOUS_GAP_MS),
    ]);
    const resumeFrom = savedState(saved, scene, frame.stage);
    const secret = crypto.randomUUID().replaceAll('-', '');
    const data = newCallData(
      {
        callId: `call_${crypto.randomUUID().replaceAll('-', '')}`,
        userId,
        kind: frame.kind,
        sceneId: scene.id,
        startedAt: now,
        resumeSecret: secret,
        country,
        turnMode: frame.turnMode,
        ...(clockOffset !== 0 ? { clockOffsetMs: clockOffset } : {}),
      },
      learner,
      resumeFrom ?? startScene(scene, frame.stage).state,
      {
        secondsLeft: balance.leftSeconds,
        wrapping: balance.leftSeconds <= WRAP_UP_SECONDS,
        priorCallSeconds: time.totalSeconds,
        continuousSince: time.continuousSince,
      },
    );
    const session = this.makeSession(data, scene);
    this.socket = socket;
    await this.ctx.storage.put(STORAGE_KEY, data);
    await session.attach(
      socket,
      { newCall: true, freshScene: resumeFrom === null },
      resumeTokenOf(this.ctx.id.toString(), secret),
    );
  }

  private resumable(data: CallData, token: string): boolean {
    if (data.endReason !== null) return false;
    if (token !== resumeTokenOf(this.ctx.id.toString(), data.meta.resumeSecret)) return false;
    return data.detachedAt === null || Date.now() - data.detachedAt < RESUME_WINDOW_MS;
  }

  private async load(): Promise<CallData | null> {
    return (await this.ctx.storage.get<CallData>(STORAGE_KEY)) ?? null;
  }

  private revive(data: CallData): CallSession | null {
    const scene = findScene(data.meta.sceneId);
    return scene ? this.makeSession(data, scene) : null;
  }

  private makeSession(data: CallData, scene: Scene): CallSession {
    const session = new CallSession(
      this.env,
      data,
      scene,
      () => void this.ctx.storage.put(STORAGE_KEY, data),
      () => {
        const socket = this.socket;
        this.socket = null;
        this.session = null;
        try {
          socket?.close(1000, 'ended');
        } catch {
          // already closed
        }
        void this.ctx.storage.deleteAlarm().then(() => this.ctx.storage.deleteAll());
      },
    );
    this.session = session;
    return session;
  }
}

/** A saved place in this scene, at this stage, from a call the learner's minutes cut short. */
function savedState(saved: unknown, scene: Scene, stage: string): RunnerState | null {
  if (typeof saved !== 'object' || saved === null) return null;
  const state = saved as Partial<RunnerState>;
  if (state.version !== 1 || state.sceneId !== scene.id || state.stage !== stage) return null;
  if (state.beatId === null || state.phase === 'ended') return null;
  return scene.beats.some((b) => b.id === state.beatId) ? (saved as RunnerState) : null;
}
