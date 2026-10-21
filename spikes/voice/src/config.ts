// Call settings from the socket URL's query string (spike experiments only). Defaults are the
// configuration that passed the latency gate.
import type { CallConfig } from "./protocol";

export function parseConfig(url: URL): CallConfig {
  const q = url.searchParams;
  const commit = q.get("commit") ?? "smart";
  return {
    commit: commit === "vad" || commit === "manual" || commit === "turn_prediction" ? commit : "smart",
    specMs: Number(q.get("spec_ms") ?? "180"),
    holdMs: Number(q.get("hold_ms") ?? "700"),
    holdLongMs: Number(q.get("hold_long_ms") ?? "1200"),
    vadSecs: Number(q.get("vad_secs") ?? "0.7"),
    ttsModel: q.get("tts") ?? "eleven_flash_v2_5",
    ttsStrategy: (["auto", "schedule", "flush1"] as const).find((v) => v === q.get("tts_strategy")) ?? "flush_early",
    // The Singapore residency host rejects this account's key, so global is the default.
    sttRegion: q.get("stt_region") === "sg" ? "sg" : "global",
    outputFormat: q.get("fmt") ?? "pcm_24000",
    merge: q.get("merge") !== "0",
    speed: Number(q.get("speed") ?? "0.92"),
    prewarm: q.get("prewarm") !== "0",
    filler: q.get("filler") !== "0",
    hedge: Math.max(1, Math.min(3, Number(q.get("hedge") ?? "2"))),
  };
}
