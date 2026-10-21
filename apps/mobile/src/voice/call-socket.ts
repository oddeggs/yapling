import {
  CallServerFrame,
  decodeAudioFrame,
  parseFrame,
  PING,
  PONG,
  PROTOCOL_VERSION,
  type AudioFrame,
  type CallClientFrame,
  type HelloFrame,
  type ReadyFrame,
} from '@yapling/contracts';

import { micFrame, SeqCounter } from './framing';
import { DEFAULT_BACKOFF, Reconnector, type BackoffPolicy } from './reconnect';

/*
 * The call socket: one WebSocket to the call, `hello` first, JSON frames and binary audio both
 * ways, keep-alive pings, and reconnection with the `resumeToken` for two minutes after a drop.
 */

/** The part of a WebSocket the client uses (React Native's, or a test fake, or a dev adapter). */
export interface SocketLike {
  binaryType: string;
  readonly readyState: number;
  send(data: string | ArrayBuffer | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code?: number; reason?: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export type SocketFactory = (url: string) => SocketLike;

const OPEN = 1;

/** What `hello` carries apart from its framing. */
export type HelloFields = Omit<HelloFrame, 'type' | 'seq' | 'protocol' | 'resumeToken'>;

/** A JSON frame the phone sends, without its `seq` (the socket numbers it). */
type WithoutSeq<F> = F extends { seq: number } ? Omit<F, 'seq'> : never;
export type OutgoingFrame = WithoutSeq<Exclude<CallClientFrame, { type: 'hello' | 'unknown' }>>;

export type SocketStatus =
  | 'connecting'
  | 'open'
  | 'ready'
  | 'reconnecting'
  /** The two-minute window ran out. */
  | 'lost'
  /** Closed on purpose: hung up, ended, or a fatal error. */
  | 'closed';

export interface CallSocketEvents {
  status(status: SocketStatus): void;
  ready(frame: ReadyFrame): void;
  frame(frame: Exclude<CallServerFrame, { type: 'ready' }>): void;
  audio(frame: AudioFrame): void;
  /** A message that failed to parse (logged in the dev lab). */
  invalid(reason: string): void;
}

export interface CallSocketOptions {
  readonly url: string;
  readonly hello: HelloFields;
  readonly createSocket: SocketFactory;
  readonly events: Partial<CallSocketEvents>;
  readonly backoff?: BackoffPolicy;
  /** How often to ping. */
  readonly heartbeatMs?: number;
  /** Treat the socket as dead after this long without any message. */
  readonly deadAfterMs?: number;
  readonly now?: () => number;
  readonly random?: () => number;
}

const ENDING_ERRORS = new Set(['unauthorized', 'update_required', 'minutes_exhausted']);

export class CallSocket {
  private socket: SocketLike | null = null;
  private readonly seq = new SeqCounter();
  private readonly reconnector: Reconnector;
  private resumeToken: string | null = null;
  private isReady = false;
  private closing = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastInbound = 0;
  private statusNow: SocketStatus = 'closed';
  private readonly now: () => number;
  private readonly heartbeatMs: number;
  private readonly deadAfterMs: number;

  constructor(private readonly options: CallSocketOptions) {
    this.reconnector = new Reconnector(options.backoff ?? DEFAULT_BACKOFF, options.random);
    this.now = options.now ?? (() => Date.now());
    this.heartbeatMs = options.heartbeatMs ?? 10_000;
    this.deadAfterMs = options.deadAfterMs ?? 25_000;
  }

  get status(): SocketStatus {
    return this.statusNow;
  }

  get ready(): boolean {
    return this.isReady;
  }

  /** Opens the socket (call it while the call screen rings). */
  open(): void {
    this.closing = false;
    this.connect();
  }

  /** Sends a JSON frame; false when the call isn't ready (the frame is dropped). */
  send(frame: OutgoingFrame): boolean {
    if (!this.isReady || this.socket?.readyState !== OPEN) return false;
    this.socket.send(JSON.stringify({ ...frame, seq: this.seq.next() }));
    return true;
  }

  /** Sends one mic chunk (PCM16 bytes); false when the call isn't ready. */
  sendMic(pcm: Uint8Array): boolean {
    if (!this.isReady || this.socket?.readyState !== OPEN) return false;
    const bytes = micFrame(this.seq.next(), pcm);
    this.socket.send(bytes);
    return true;
  }

  /** Closes for good: no reconnection. */
  close(): void {
    this.closing = true;
    this.clearTimers();
    this.isReady = false;
    const s = this.socket;
    this.socket = null;
    if (s) {
      detach(s);
      try {
        s.close(1000, 'bye');
      } catch {
        // already closed
      }
    }
    this.setStatus('closed');
  }

  private connect(): void {
    this.clearTimers();
    this.isReady = false;
    this.seq.reset();
    this.setStatus(this.reconnector.active ? 'reconnecting' : 'connecting');
    let s: SocketLike;
    try {
      s = this.options.createSocket(this.options.url);
    } catch {
      this.dropped();
      return;
    }
    s.binaryType = 'arraybuffer';
    this.socket = s;
    s.onopen = () => {
      if (this.socket !== s) return;
      this.lastInbound = this.now();
      this.setStatus(this.reconnector.active ? 'reconnecting' : 'open');
      const hello: HelloFrame = {
        type: 'hello',
        seq: this.seq.next(),
        protocol: PROTOCOL_VERSION,
        ...this.options.hello,
        resumeToken: this.resumeToken,
      };
      s.send(JSON.stringify(hello));
      this.startHeartbeat();
    };
    s.onmessage = (ev) => {
      if (this.socket !== s) return;
      this.lastInbound = this.now();
      this.onMessage(ev.data);
    };
    s.onerror = () => {
      // A close follows; reconnection happens there.
    };
    s.onclose = () => {
      if (this.socket !== s) return;
      detach(s);
      this.socket = null;
      this.dropped();
    };
  }

  private onMessage(data: unknown): void {
    if (typeof data === 'string') {
      if (data === PONG || data === PING) return;
      const parsed = parseFrame(CallServerFrame, data);
      if (!parsed.ok) {
        this.options.events.invalid?.(parsed.error);
        return;
      }
      const frame = parsed.frame;
      if (frame.type === 'unknown') return;
      if (frame.type === 'ready') {
        this.isReady = true;
        this.resumeToken = frame.resumeToken;
        this.reconnector.succeeded();
        this.setStatus('ready');
        this.options.events.ready?.(frame);
        return;
      }
      if (frame.type === 'ended') {
        this.options.events.frame?.(frame);
        this.close();
        return;
      }
      if (frame.type === 'error' && frame.fatal && ENDING_ERRORS.has(frame.code)) {
        this.options.events.frame?.(frame);
        this.close();
        return;
      }
      this.options.events.frame?.(frame);
      return;
    }
    const bytes =
      data instanceof ArrayBuffer
        ? data
        : ArrayBuffer.isView(data)
          ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          : null;
    if (!bytes) {
      this.options.events.invalid?.('not_binary');
      return;
    }
    const decoded = decodeAudioFrame(bytes);
    if (!decoded.ok) {
      this.options.events.invalid?.(decoded.error);
      return;
    }
    if (decoded.frame.kind === 'mic_pcm16') return;
    this.options.events.audio?.(decoded.frame);
  }

  private dropped(): void {
    this.clearTimers();
    this.isReady = false;
    if (this.closing) return;
    this.reconnector.dropped(this.now());
    const delay = this.reconnector.nextDelay(this.now());
    if (delay === null) {
      this.closing = true;
      this.setStatus('lost');
      return;
    }
    this.setStatus('reconnecting');
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.closing) this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      const s = this.socket;
      if (!s || s.readyState !== OPEN) return;
      if (this.now() - this.lastInbound > this.deadAfterMs) {
        // Silent for too long: a dead link the OS hasn't noticed. Drop it and reconnect.
        detach(s);
        this.socket = null;
        try {
          s.close(4000, 'dead');
        } catch {
          // ignore
        }
        this.dropped();
        return;
      }
      s.send(PING);
    }, this.heartbeatMs);
  }

  private clearTimers(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.retryTimer = null;
    this.heartbeat = null;
  }

  private setStatus(status: SocketStatus): void {
    if (status === this.statusNow) return;
    this.statusNow = status;
    this.options.events.status?.(status);
  }
}

function detach(s: SocketLike): void {
  s.onopen = null;
  s.onmessage = null;
  s.onclose = null;
  s.onerror = null;
}
