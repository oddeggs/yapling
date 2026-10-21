import type { HeardWord } from '@yapling/contracts';

import { base64, closeQuietly, openSocket, scribeUrl, UpstreamError } from './upstream';

/*
 * One Scribe v2 Realtime session per phone socket. Audio goes in as it arrives; the call commits
 * a segment itself (`commit`). Scribe answers each commit twice (plain, then with timestamps);
 * the session acts on the first and takes the words from the second.
 *
 * Word times are Scribe's session clock, which is the socket's mic clock plus the 10 ms of
 * silence each commit sends; they are mapped back to the mic clock for `heard`.
 */

/** The audio a commit sends with it: 10 ms of silence. */
const COMMIT_PAD = new Uint8Array(320);
const COMMIT_PAD_MS = 10;

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
  private queue: Uint8Array[] = [];
  private padMs = 0;
  private commitsSent = 0;
  private commitsAnswered = 0;
  private commitsWithWords = 0;
  /** Seconds of audio sent, for cost logging. */
  audioSeconds = 0;

  constructor(
    private readonly key: string,
    private readonly handlers: SttHandlers,
  ) {}

  /** Opens the session; resolves once Scribe confirms it. */
  async open(): Promise<void> {
    const ws = await openSocket(scribeUrl(), this.key);
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
      closeQuietly(ws, 'failed');
      throw error;
    });
    this.ws = ws;
    ws.addEventListener('message', (event) => this.onMessage(event.data));
    ws.addEventListener('close', (event) => {
      if (this.ws === ws) {
        this.ws = null;
        if (event.code !== 1000) this.handlers.failed(`closed ${event.code}`);
      }
    });
    for (const chunk of this.queue) this.send(chunk, false);
    this.queue = [];
  }

  get isOpen(): boolean {
    return this.ws !== null;
  }

  audio(chunk: Uint8Array): void {
    this.audioSeconds += chunk.byteLength / 32_000;
    if (this.ws === null) this.queue.push(chunk.slice());
    else this.send(chunk, false);
  }

  commit(): void {
    this.padMs += COMMIT_PAD_MS;
    this.commitsSent += 1;
    if (this.ws === null) this.queue.push(COMMIT_PAD);
    else this.send(COMMIT_PAD, true);
  }

  close(): void {
    const ws = this.ws;
    this.ws = null;
    closeQuietly(ws, 'call ended');
  }

  private send(bytes: Uint8Array, commit: boolean): void {
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
          // Words in this segment came before this commit's own pad.
          const offset = Math.max(0, this.padMs - COMMIT_PAD_MS);
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
