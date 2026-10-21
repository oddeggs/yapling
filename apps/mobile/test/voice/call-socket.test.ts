import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  decodeAudioFrame,
  encodeAudioFrame,
  HelloFrame,
  PROTOCOL_VERSION,
  type CallServerFrame,
} from '@yapling/contracts';

import { CallSocket, type SocketLike, type SocketStatus } from '../../src/voice/call-socket';

class FakeSocket implements SocketLike {
  binaryType = 'blob';
  readyState = 0;
  sent: (string | Uint8Array)[] = [];
  closed = false;
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code?: number; reason?: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;

  constructor(readonly url: string) {}

  send(data: string | ArrayBuffer | ArrayBufferView): void {
    this.sent.push(typeof data === 'string' ? data : new Uint8Array(data as ArrayBuffer));
  }
  close(): void {
    this.closed = true;
    this.readyState = 3;
  }
  // Test controls.
  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(data: unknown): void {
    this.onmessage?.({ data });
  }
  drop(): void {
    this.readyState = 3;
    this.onclose?.({ code: 1006 });
  }
  json(): Record<string, unknown>[] {
    return this.sent
      .filter((s): s is string => typeof s === 'string' && s.startsWith('{'))
      .map((s) => JSON.parse(s) as Record<string, unknown>);
  }
}

const HELLO = {
  token: 'session-token-0123456789',
  kind: 'episode',
  sceneId: 's1-e1',
  stage: 'newcomer',
  firstLanguage: 'vi',
  clientVersion: '0.1.0',
  turnMode: 'hands_free',
} as const;

const ready = (seq: number, resumeToken: string, resumed = false) =>
  JSON.stringify({
    type: 'ready',
    seq,
    sessionId: 'sess_1',
    secondsLeft: 600,
    recordedLineBaseUrl: null,
    resumeToken,
    resumed,
  });

function setup() {
  const sockets: FakeSocket[] = [];
  const statuses: SocketStatus[] = [];
  const frames: CallServerFrame[] = [];
  const audio: { streamId: number; seq: number; bytes: number }[] = [];
  const invalid: string[] = [];
  const socket = new CallSocket({
    url: 'wss://api.test/api/calls/socket',
    hello: HELLO,
    createSocket: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    random: () => 0.5,
    events: {
      status: (s) => statuses.push(s),
      ready: (f) => frames.push(f),
      frame: (f) => frames.push(f),
      audio: (f) => audio.push({ streamId: f.streamId, seq: f.seq, bytes: f.payload.byteLength }),
      invalid: (r) => invalid.push(r),
    },
  });
  return {
    socket,
    sockets,
    statuses,
    frames,
    audio,
    invalid,
    last: () => sockets[sockets.length - 1]!,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('the call socket', () => {
  it('says hello first, with the token in the frame and never in the URL', () => {
    const { socket, last } = setup();
    socket.open();
    expect(last().url).toBe('wss://api.test/api/calls/socket');
    expect(last().binaryType).toBe('arraybuffer');
    last().open();
    const [hello] = last().json();
    expect(HelloFrame.parse(hello)).toEqual({
      type: 'hello',
      seq: 1,
      protocol: PROTOCOL_VERSION,
      ...HELLO,
      resumeToken: null,
    });
  });

  it('sends nothing else until the call is ready, then numbers JSON and audio together', () => {
    const { socket, last } = setup();
    socket.open();
    last().open();
    expect(socket.send({ type: 'end_turn' })).toBe(false);
    expect(socket.sendMic(new Uint8Array(640))).toBe(false);
    last().receive(ready(1, 'resume-token-aaaaaaaa'));
    expect(socket.ready).toBe(true);
    expect(socket.sendMic(new Uint8Array(640))).toBe(true);
    expect(socket.send({ type: 'hold', seconds: 10 })).toBe(true);
    const mic = last().sent[1] as Uint8Array;
    const decoded = decodeAudioFrame(mic);
    expect(decoded.ok && decoded.frame).toMatchObject({ kind: 'mic_pcm16', seq: 2, streamId: 0 });
    expect(last().json()[1]).toEqual({ type: 'hold', seconds: 10, seq: 3 });
  });

  it('hands every server frame on, and TTS audio as decoded frames', () => {
    const { socket, last, frames, audio, invalid } = setup();
    socket.open();
    last().open();
    last().receive(ready(1, 'resume-token-aaaaaaaa'));
    last().receive(
      JSON.stringify({
        type: 'say_start',
        seq: 2,
        streamId: 3,
        character: 'pip',
        codec: 'pcm16',
        sampleRateHz: 24000,
      }),
    );
    const tts = encodeAudioFrame({
      kind: 'tts_pcm16',
      seq: 3,
      streamId: 3,
      payload: new Uint8Array(480),
    });
    last().receive(tts.buffer);
    last().receive(JSON.stringify({ type: 'brand_new_frame', seq: 4 }));
    last().receive('not json');
    last().receive(JSON.stringify({ type: 'say_start', seq: 5 }));
    last().receive('pong');
    expect(frames.map((f) => f.type)).toEqual(['ready', 'say_start']);
    expect(audio).toEqual([{ streamId: 3, seq: 3, bytes: 480 }]);
    expect(invalid).toEqual(['not_json', 'bad_frame']);
  });

  it('reconnects after a drop with the resume token, a new socket and new counters', () => {
    const { socket, sockets, last, statuses } = setup();
    socket.open();
    last().open();
    last().receive(ready(1, 'resume-token-aaaaaaaa'));
    socket.send({ type: 'end_turn' });
    last().drop();
    expect(socket.ready).toBe(false);
    expect(statuses.at(-1)).toBe('reconnecting');
    expect(socket.send({ type: 'end_turn' })).toBe(false);
    jest.advanceTimersByTime(249);
    expect(sockets).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);
    last().open();
    const hello = last().json()[0];
    expect(hello).toMatchObject({ type: 'hello', seq: 1, resumeToken: 'resume-token-aaaaaaaa' });
    last().receive(ready(1, 'resume-token-bbbbbbbb', true));
    expect(statuses.at(-1)).toBe('ready');
    // The next drop resumes with the newest token.
    last().drop();
    jest.advanceTimersByTime(250);
    last().open();
    expect(last().json()[0]).toMatchObject({ resumeToken: 'resume-token-bbbbbbbb' });
  });

  it('keeps retrying with backoff while the network is down, and gives up after two minutes', () => {
    const { socket, sockets, last, statuses } = setup();
    socket.open();
    last().open();
    last().receive(ready(1, 'resume-token-aaaaaaaa'));
    last().drop();
    let guard = 0;
    while (statuses.at(-1) !== 'lost' && guard++ < 200) {
      jest.advanceTimersByTime(1000);
      const s = last();
      if (!s.closed && s.readyState === 0) s.drop(); // the connect fails
    }
    expect(statuses.at(-1)).toBe('lost');
    expect(sockets.length).toBeGreaterThan(10);
    expect(guard).toBeGreaterThanOrEqual(119);
    expect(guard).toBeLessThanOrEqual(122);
    const count = sockets.length;
    jest.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(count);
  });

  it('pings while connected and drops a link that has gone silent', () => {
    const { socket, sockets, last } = setup();
    socket.open();
    last().open();
    last().receive(ready(1, 'resume-token-aaaaaaaa'));
    jest.advanceTimersByTime(10_000);
    expect(last().sent.filter((s) => s === 'ping')).toHaveLength(1);
    last().receive('pong');
    jest.advanceTimersByTime(20_000);
    expect(sockets).toHaveLength(1);
    // No reply at all for longer than the dead-link limit.
    jest.advanceTimersByTime(20_000);
    expect(sockets[0]?.closed).toBe(true);
    jest.advanceTimersByTime(300);
    expect(sockets).toHaveLength(2);
  });

  it('does not reconnect after the call ends or on a fatal auth error', () => {
    const ended = setup();
    ended.socket.open();
    ended.last().open();
    ended.last().receive(ready(1, 'resume-token-aaaaaaaa'));
    ended.last().receive(
      JSON.stringify({
        type: 'ended',
        seq: 2,
        reason: 'scene_complete',
        summaryPending: true,
        callRecordId: 'call_1',
      }),
    );
    expect(ended.frames.at(-1)?.type).toBe('ended');
    expect(ended.statuses.at(-1)).toBe('closed');
    jest.advanceTimersByTime(10_000);
    expect(ended.sockets).toHaveLength(1);

    const denied = setup();
    denied.socket.open();
    denied.last().open();
    denied
      .last()
      .receive(JSON.stringify({ type: 'error', seq: 1, code: 'unauthorized', fatal: true }));
    expect(denied.statuses.at(-1)).toBe('closed');
    jest.advanceTimersByTime(10_000);
    expect(denied.sockets).toHaveLength(1);
  });

  it('closes for good on request', () => {
    const { socket, sockets, last, statuses } = setup();
    socket.open();
    last().open();
    socket.close();
    expect(last().closed).toBe(true);
    expect(statuses.at(-1)).toBe('closed');
    jest.advanceTimersByTime(10_000);
    expect(sockets).toHaveLength(1);
  });
});
