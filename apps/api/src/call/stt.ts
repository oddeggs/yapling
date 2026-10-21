import type { HeardWord } from '@yapling/contracts';

import { base64, closeQuietly, openSocket, scribeUrl, UpstreamError } from './upstream';

/*
 * One Scribe v2 Realtime session per phone socket. Audio goes in as it arrives; the call commits
 * a segment itself (`commit`). Scribe answers each commit twice (plain, then with timestamps);
 * the session acts on the first and takes the words from the second.
 *
 * Word times are Scribe's session clock, which is the socket's mic clock plus the 10 ms of
 * silence each commit or keepalive sends (and, for a session reopened mid-call, minus the mic
 * audio sent before it); they are mapped back to the mic clock for `heard`.
 *
 * In hold-to-talk no audio flows between presses, and Scribe closes a session that hears nothing
 * for a while. So an idle session gets 10 ms of silence every few seconds, and a session that
 * closed anyway is reopened by the next audio, which waits in a queue meanwhile (a press is longer
 * than the handshake, so the release isn't held up).
 */

/** The audio a commit or a keepalive sends: 10 ms of silence. */
const PAD = new Uint8Array(320);
const PAD_MS = 10;

/** Keepalive timing; tests shorten it. */
export const sttTiming = {
  /** Send a keepalive after this long without sending anything. */
  idleMs: 5_000,
  /** How often to look. */
  checkMs: 1_000,
  /** Don't reopen sooner than this after a failed open. */
  retryMs: 2_000,
};

interface Queued {
  readonly bytes: Uint8Array;
  readonly commit: boolean;
}

export interface SttHandlers {
  partial(text: string): void;
  /** The text of a committed segment ("" when nothing was said). */
  committed(text: string): void;
  /** The words of the last committed segment, on the mic clock. */
  words(words: HeardWord[]): void;
  failed(detail: string): void;
}

interface ScribeWord {
  readonly text?: string;
  readonly start?: number;
  readonly end?: number;
  readonly type?: string;
}

interface ScribeMessage {
  readonly message_type: string;
  readonly text?: string;
  readonly words?: readonly ScribeWord[];
  readonly error?: string;
}

export class SttSession {
  private ws: WebSocket | null = null;
  private opening: Promise<void> | null = null;
  private closed = false;
  private failedAt = 0;
  private queue: Queued[] = [];
  /** Silence sent to this Scribe session (commits and keepalives). */
  private padMs = 0;
  /** Mic audio received before this Scribe session started. */
  private micBaseMs = 0;
  /** Mic audio received on the phone socket so far. */
  private micMs = 0;
  private lastSentAt = Date.now();
  private keepalive: ReturnType<typeof setInterval> | null = null;
  private commitsSent = 0;
  private commitsAnswered = 0;
  private commitsWithWords = 0;
  /** Scribe sessions opened, the first included. */
  sessions = 0;
  /** Seconds of audio sent, for cost logging. */
  audioSeconds = 0;

  constructor(
    private readonly key: string,
    private readonly handlers: SttHandlers,
  ) {}

  /** Opens the session; resolves once Scribe confirms it. */
  open(): Promise<void> {
    this.opening ??= this.connect().finally(() => {
      this.opening = null;
    });
    return this.opening;
  }

  private async connect(): Promise<void> {
    const ws = await openSocket(scribeUrl(), this.key).catch((error: unknown) => {
      this.failedAt = Date.now();
      throw error;
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new UpstreamError('no session_started')), 5_000);
      const first = (event: MessageEvent) => {
        clearTimeout(timer);
        ws.removeEventListener('message', first);
        const msg = parseMessage(event.data);
        if (msg?.message_type === 'session_started') resolve();
        else reject(new UpstreamError(`${msg?.message_type ?? 'unknown'}: ${msg?.error ?? ''}`));
      };
      ws.addEventListener('message', first);
    }).catch((error: unknown) => {
      this.failedAt = Date.now();
      closeQuietly(ws, 'failed');
      throw error;
    });
    if (this.closed) {
      closeQuietly(ws, 'call ended');
      return;
    }
    // A new Scribe clock: it starts at the mic audio not yet sent (what waits in the queue).
    const queuedMs = this.queue.reduce((ms, q) => ms + (q.commit ? 0 : q.bytes.byteLength / 32), 0);
    this.micBaseMs = this.micMs - queuedMs;
    this.padMs = 0;
    this.commitsSent = this.queue.filter((q) => q.commit).length;
    this.commitsAnswered = 0;
    this.commitsWithWords = 0;
    this.sessions += 1;
    this.ws = ws;
    ws.addEventListener('message', (event) => this.onMessage(event.data));
    ws.addEventListener('close', (event) => {
      if (this.ws === ws) {
        this.ws = null;
        if (event.code !== 1000) this.handlers.failed(`closed ${event.code}`);
      }
    });
    for (const q of this.queue) {
      if (q.commit) this.padMs += PAD_MS;
      this.send(q.bytes, q.commit);
    }
    this.queue = [];
    this.keepalive ??= setInterval(() => this.keepAlive(), sttTiming.checkMs);
  }

  get isOpen(): boolean {
    return this.ws !== null;
  }

  audio(chunk: Uint8Array): void {
    this.audioSeconds += chunk.byteLength / 32_000;
    this.micMs += chunk.byteLength / 32;
    if (this.ws === null) {
      this.queue.push({ bytes: chunk.slice(), commit: false });
      this.reopen();
    } else this.send(chunk, false);
  }

  commit(): void {
    if (this.ws === null) {
      this.queue.push({ bytes: PAD, commit: true });
      this.reopen();
      return;
    }
    this.padMs += PAD_MS;
    this.commitsSent += 1;
    this.send(PAD, true);
  }

  close(): void {
    this.closed = true;
    if (this.keepalive !== null) clearInterval(this.keepalive);
    this.keepalive = null;
    const ws = this.ws;
    this.ws = null;
    closeQuietly(ws, 'call ended');
  }

  /** A session that closed (or never opened) comes back for the audio waiting for it. */
  private reopen(): void {
    if (this.closed || this.opening !== null) return;
    if (Date.now() - this.failedAt < sttTiming.retryMs) return;
    this.open().catch((error: unknown) => this.handlers.failed(`reopen: ${String(error)}`));
  }

  /** An idle session hears 10 ms of silence now and then, so Scribe keeps it open. */
  private keepAlive(): void {
    if (this.ws === null || Date.now() - this.lastSentAt < sttTiming.idleMs) return;
    this.padMs += PAD_MS;
    this.send(PAD, false);
  }

  private send(bytes: Uint8Array, commit: boolean): void {
    this.lastSentAt = Date.now();
    try {
      this.ws?.send(
        JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: base64(bytes),
          commit,
          sample_rate: 16_000,
        }),
      );
    } catch (error) {
      this.handlers.failed(String(error));
    }
  }

  private onMessage(data: unknown): void {
    const msg = parseMessage(data);
    if (msg === null) return;
    const text = (msg.text ?? '').trim();
    switch (msg.message_type) {
      case 'session_started':
        return;
      case 'partial_transcript':
        if (text) this.handlers.partial(text);
        return;
      case 'committed_transcript':
      case 'committed_transcript_with_timestamps': {
        // Each commit is answered twice (plain, then with timestamps): act on the first.
        if (
          msg.message_type === 'committed_transcript_with_timestamps' &&
          this.commitsWithWords < this.commitsSent
        ) {
          this.commitsWithWords += 1;
          // Words in this segment came before this commit's own pad; the session started at
          // `micBaseMs` on the mic clock.
          const offset = Math.max(0, this.padMs - PAD_MS) - this.micBaseMs;
          this.handlers.words(toHeardWords(msg.words ?? [], offset));
        }
        if (this.commitsAnswered >= this.commitsSent) return;
        this.commitsAnswered += 1;
        this.handlers.committed(text);
        return;
      }
      default:
        this.handlers.failed(`${msg.message_type}: ${msg.error ?? ''}`);
    }
  }
}

function parseMessage(data: unknown): ScribeMessage | null {
  if (typeof data !== 'string') return null;
  try {
    const msg = JSON.parse(data) as ScribeMessage;
    return typeof msg.message_type === 'string' ? msg : null;
  } catch {
    return null;
  }
}

function toHeardWords(words: readonly ScribeWord[], offsetMs: number): HeardWord[] {
  const out: HeardWord[] = [];
  for (const w of words) {
    if (w.type !== undefined && w.type !== 'word') continue;
    const word = (w.text ?? '').trim().slice(0, 64);
    if (!word || w.start === undefined || w.end === undefined) continue;
    const startMs = Math.max(0, Math.round(w.start * 1_000 - offsetMs));
    const endMs = Math.max(startMs, Math.round(w.end * 1_000 - offsetMs));
    out.push({ word, startMs, endMs });
  }
  return out;
}
