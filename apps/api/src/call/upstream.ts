/*
 * Every request the call makes to its providers (ElevenLabs sockets, the Anthropic API) goes
 * through `upstream.fetch`. It is the platform's `fetch`; the protocol tests point it at
 * in-process fakes of the providers so they never spend credits.
 */

export const upstream: { fetch: typeof fetch } = {
  fetch: (input, init) => fetch(input, init),
};

const ELEVENLABS = 'https://api.elevenlabs.io';

/** Thrown when a provider socket can't be opened. */
export class UpstreamError extends Error {
  override readonly name = 'UpstreamError';
}

/** Opens an outbound WebSocket with the ElevenLabs key; binary frames arrive as ArrayBuffer. */
export async function openSocket(url: string, key: string): Promise<WebSocket> {
  const response = await upstream.fetch(url, {
    headers: { Upgrade: 'websocket', 'xi-api-key': key },
  });
  const ws = response.webSocket;
  if (response.status !== 101 || !ws) {
    const body = await response.text().catch(() => '');
    throw new UpstreamError(`upgrade ${response.status}: ${body.slice(0, 200)}`);
  }
  ws.accept();
  ws.binaryType = 'arraybuffer';
  return ws;
}

/**
 * Scribe v2 Realtime on the global host (the Singapore residency host rejects this account's
 * key), committed by the call itself, with word timestamps.
 */
export function scribeUrl(): string {
  const q = new URLSearchParams({
    model_id: 'scribe_v2_realtime',
    audio_format: 'pcm_16000',
    commit_strategy: 'manual',
    include_timestamps: 'true',
    language_code: 'en',
  });
  return `${ELEVENLABS}/v1/speech-to-text/realtime?${q}`;
}

/** The TTS model for generated turns: alignment for captions and mouths, and a speed setting. */
export const TTS_MODEL = 'eleven_flash_v2_5';
export const TTS_SAMPLE_RATE = 24_000;

/** Flash stream-input for one voice; SSML parsing on for phrase breaks. */
export function ttsUrl(voiceId: string): string {
  const q = new URLSearchParams({
    model_id: TTS_MODEL,
    output_format: `pcm_${TTS_SAMPLE_RATE}`,
    inactivity_timeout: '180',
    enable_ssml_parsing: 'true',
  });
  return `${ELEVENLABS}/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream-input?${q}`;
}

export function base64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromBase64(text: string): Uint8Array {
  const raw = atob(text);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Closes a socket, ignoring one already gone. */
export function closeQuietly(ws: WebSocket | null | undefined, reason = 'done'): void {
  try {
    ws?.close(1000, reason);
  } catch {
    // already closed
  }
}
