import { upstream } from '../../src/call/upstream';

/*
 * In-process fakes of the call's providers, speaking their wire protocols: Scribe v2 Realtime and
 * Flash stream-input as WebSockets, the Anthropic Messages API as JSON and SSE. Installed on the
 * call's upstream `fetch`, so the protocol tests spend no credits.
 */

interface ClaudeRequest {
  readonly model: string;
  readonly max_tokens: number;
  readonly stream?: boolean;
  readonly system?: { text: string }[] | string;
  readonly messages: { role: string; content: unknown }[];
  readonly output_config?: { format?: unknown };
}

/** The scripted answers and the record of what each fake received. */
export class Providers {
  /** What the learner "says": the text of each committed segment, in order. */
  readonly speech: string[] = [];
  /** Text each TTS socket received, by socket. */
  readonly ttsTexts: string[][] = [];
  readonly ttsVoices: { voice: string; speed: number }[] = [];
  readonly claudeRequests: ClaudeRequest[] = [];
  readonly scribeCommits: number[] = [];
  /** Scribe sessions opened, and the keepalives (10 ms of digital silence, uncommitted) they got. */
  scribeSessions = 0;
  scribeKeepalives = 0;
  /** Scribe closes a session that hears nothing for this long (off when null). */
  scribeIdleCloseMs: number | null = null;
  /** Decides each streamed reply: the spoken text and the control line. */
  reply: (request: ClaudeRequest) => string = defaultReply;
  /** Answers non-streamed structured requests (meaning, summary). */
  structured: (request: ClaudeRequest) => unknown = () => ({
    simple: 'It means money.',
    gloss: 'tiền',
  });
  /** Milliseconds before the first streamed token. */
  firstTokenDelayMs = 5;
  install(): this {
    upstream.fetch = (input, init) => this.fetch(new Request(input, init));
    return this;
  }

  /** Tests never reach the real providers, even from work still running after a test. */
  uninstall(): void {
    upstream.fetch = () => Promise.reject(new Error('no providers outside a test'));
  }

  /** The direction (last system message) of every streamed turn. */
  directions(): string[] {
    return this.claudeRequests
      .filter((r) => r.stream)
      .map((r) => {
        const last = r.messages.at(-1);
        return last?.role === 'system' && typeof last.content === 'string' ? last.content : '';
      });
  }

  private async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === 'api.elevenlabs.io' && url.pathname === '/v1/speech-to-text/realtime') {
      return this.scribe();
    }
    const tts = /^\/v1\/text-to-speech\/([^/]+)\/stream-input$/.exec(url.pathname);
    if (url.hostname === 'api.elevenlabs.io' && tts) {
      return this.tts(decodeURIComponent(tts[1] ?? ''), url);
    }
    if (url.hostname === 'api.anthropic.com' && url.pathname === '/v1/messages') {
      return this.claude(await request.json<ClaudeRequest>());
    }
    return new Response('not faked', { status: 599 });
  }

  private scribe(): Response {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();
    this.scribeSessions += 1;
    let idle: ReturnType<typeof setTimeout> | null = null;
    const heardSomething = () => {
      if (idle !== null) clearTimeout(idle);
      const after = this.scribeIdleCloseMs;
      if (after !== null) idle = setTimeout(() => server.close(1000, 'session timed out'), after);
    };
    heardSomething();
    let audioMs = 0;
    let segmentStart = 0;
    server.send(JSON.stringify({ message_type: 'session_started', session_id: 'fake' }));
    server.addEventListener('message', (event) => {
      heardSomething();
      const msg = JSON.parse(String(event.data)) as { audio_base_64: string; commit: boolean };
      const raw = atob(msg.audio_base_64);
      const ms = (raw.length / 32) | 0;
      audioMs += ms;
      if (!msg.commit && raw.length === 320 && /^\0+$/.test(raw)) this.scribeKeepalives += 1;
      if (!msg.commit) return;
      this.scribeCommits.push(audioMs);
      const text = this.speech.shift() ?? '';
      const words = text.split(/\s+/).filter((w) => w !== '');
      const span = Math.max(1, audioMs - segmentStart - 200);
      const step = span / Math.max(1, words.length);
      const timed = words.map((w, i) => ({
        text: w,
        start: (segmentStart + i * step) / 1_000,
        end: (segmentStart + (i + 0.8) * step) / 1_000,
        type: 'word',
      }));
      segmentStart = audioMs;
      if (text) server.send(JSON.stringify({ message_type: 'partial_transcript', text }));
      server.send(JSON.stringify({ message_type: 'committed_transcript', text }));
      server.send(
        JSON.stringify({
          message_type: 'committed_transcript_with_timestamps',
          text,
          words: timed,
        }),
      );
    });
    return new Response(null, { status: 101, webSocket: client });
  }

  private tts(voice: string, url: URL): Response {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();
    const texts: string[] = [];
    this.ttsTexts.push(texts);
    let pending = '';
    const emit = () => {
      if (pending === '') return;
      // 10 ms of audio per character, alignment over the characters as Flash sends them.
      const chars = [...pending];
      const pcm = new Uint8Array(chars.length * 10 * 48);
      for (let i = 0; i < pcm.length; i += 2) pcm[i] = (i * 7) & 0xff;
      let s = '';
      for (const byte of pcm) s += String.fromCharCode(byte);
      server.send(
        JSON.stringify({
          audio: btoa(s),
          isFinal: null,
          alignment: {
            chars,
            charStartTimesMs: chars.map((_, i) => i * 10),
            charDurationsMs: chars.map(() => 10),
          },
        }),
      );
      pending = '';
    };
    server.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data)) as {
        text: string;
        flush?: boolean;
        voice_settings?: { speed: number };
      };
      if (msg.voice_settings) {
        this.ttsVoices.push({ voice, speed: msg.voice_settings.speed });
        if (url.searchParams.get('enable_ssml_parsing') !== 'true') throw new Error('ssml off');
        return;
      }
      if (msg.text === '') {
        emit();
        server.send(JSON.stringify({ isFinal: true }));
        return;
      }
      texts.push(msg.text);
      pending += msg.text;
      if (msg.flush) emit();
    });
    return new Response(null, { status: 101, webSocket: client });
  }

  private claude(body: ClaudeRequest): Response {
    this.claudeRequests.push(body);
    const usage = {
      input_tokens: 40,
      output_tokens: 0,
      cache_read_input_tokens: 900,
      cache_creation_input_tokens: 0,
    };
    if (body.max_tokens === 0) return Response.json(message('', usage));
    if (!body.stream) {
      const text = JSON.stringify(this.structured(body));
      return Response.json(message(text, { ...usage, output_tokens: 30 }));
    }
    const reply = this.reply(body);
    const delay = this.firstTokenDelayMs;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (type: string, data: object) =>
          controller.enqueue(
            encoder.encode(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`),
          );
        send('message_start', { message: { ...message('', usage), content: [] } });
        send('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
        await new Promise((r) => setTimeout(r, delay));
        for (let i = 0; i < reply.length; i += 7) {
          send('content_block_delta', {
            index: 0,
            delta: { type: 'text_delta', text: reply.slice(i, i + 7) },
          });
        }
        send('content_block_stop', { index: 0 });
        send('message_delta', {
          delta: { stop_reason: 'end_turn', stop_sequence: null },
          usage: { output_tokens: 30 },
        });
        send('message_stop', {});
        controller.close();
      },
    });
    return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
  }
}

function message(text: string, usage: object) {
  return {
    id: `msg_${crypto.randomUUID()}`,
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content: text ? [{ type: 'text', text }] : [],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage,
  };
}

/** A reply that judges the learner fine and says one short line. */
export function defaultReply(): string {
  return 'Okay, that sounds good. What next?\n§{"outcome":"fine","phrasesUsed":[]}';
}

/** A control line for scripted replies. */
export const control = (c: Record<string, unknown>) => `\n§${JSON.stringify(c)}`;
