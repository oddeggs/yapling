// Outbound sockets to ElevenLabs (Scribe and TTS) from the Worker runtime.
import type { CallConfig } from "./protocol";
import { PIP_VOICE_ID } from "./persona";

const STT_HOSTS = { sg: "api.sg.residency.elevenlabs.io", global: "api.elevenlabs.io" } as const;

export function b64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function sttUrl(cfg: CallConfig, region: "sg" | "global"): string {
  const q = new URLSearchParams({
    model_id: "scribe_v2_realtime",
    audio_format: "pcm_16000",
    commit_strategy: cfg.commit === "smart" ? "manual" : cfg.commit,
    include_timestamps: "true",
    language_code: "en",
  });
  if (cfg.commit === "vad") q.set("vad_silence_threshold_secs", String(cfg.vadSecs));
  return `https://${STT_HOSTS[region]}/v1/speech-to-text/realtime?${q}`;
}

export async function openUpstream(url: string, key: string): Promise<WebSocket> {
  const res = await fetch(url, { headers: { Upgrade: "websocket", "xi-api-key": key } });
  const ws = res.webSocket;
  if (res.status !== 101 || !ws) {
    const body = await res.text().catch(() => "");
    throw new Error(`upgrade ${res.status}: ${body.slice(0, 300)}`);
  }
  ws.accept();
  ws.binaryType = "arraybuffer";
  return ws;
}

// Eleven v3/v4 models only stream over the text-to-dialogue socket; Flash uses stream-input.
export function isDialogue(cfg: CallConfig): boolean {
  return /^eleven_v[34]/.test(cfg.ttsModel);
}

export function ttsTextFrame(cfg: CallConfig, text: string, flush: boolean): object {
  if (isDialogue(cfg)) {
    return { inputs: [{ text, voice_id: PIP_VOICE_ID, new_turn: false }], ...(flush ? { flush: true } : {}) };
  }
  return flush ? { text, flush: true } : { text };
}

export async function openTts(cfg: CallConfig, key: string): Promise<WebSocket> {
  if (isDialogue(cfg)) {
    const q = new URLSearchParams({ model_id: cfg.ttsModel, output_format: cfg.outputFormat, sync_alignment: "true" });
    const ws = await openUpstream(`https://api.elevenlabs.io/v1/text-to-dialogue/stream-input?${q}`, key);
    // v4 has no speed setting; stage pace has to come from the text.
    ws.send(JSON.stringify({ voices: [PIP_VOICE_ID], voice_settings: { stability: 0.5, similarity_boost: 0.75 } }));
    // The dialogue socket closes after 20 s without a client message.
    const keepAlive = setInterval(() => {
      try {
        ws.send(JSON.stringify({ keep_alive: true }));
      } catch {
        clearInterval(keepAlive);
      }
    }, 10_000);
    ws.addEventListener("close", () => clearInterval(keepAlive));
    return ws;
  }
  const q = new URLSearchParams({
    model_id: cfg.ttsModel,
    output_format: cfg.outputFormat,
    inactivity_timeout: "180",
  });
  if (cfg.ttsStrategy === "auto") q.set("auto_mode", "true");
  const ws = await openUpstream(`https://api.elevenlabs.io/v1/text-to-speech/${PIP_VOICE_ID}/stream-input?${q}`, key);
  ws.send(
    JSON.stringify({
      text: " ",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: cfg.speed },
      ...(cfg.ttsStrategy !== "auto" ? { generation_config: { chunk_length_schedule: [50, 120, 160, 250] } } : {}),
    }),
  );
  return ws;
}
