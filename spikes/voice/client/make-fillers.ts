// Pre-bakes Pip's reaction clips (the ones the call plays from the app bundle at release) with the
// live-call voice and model, and records their durations for the bench's gap measure.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT, loadVars } from "./env.ts";

const PIP = "EloPaUZKG0CW1gv8SwPD";
const DIR = join(ROOT, "fixtures/fillers");
mkdirSync(DIR, { recursive: true });
const key = loadVars().ELEVENLABS_API_KEY!;
const fillers = ["Ooh,", "Oh!", "Mm,", "Hmm,"];
const durations: Record<string, number> = {};
for (const f of fillers) {
  const file = join(DIR, `${f.replace(/\W/g, "").toLowerCase()}.mp3`);
  if (!existsSync(file)) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${PIP}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text: f,
        model_id: "eleven_flash_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 0.92 },
      }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}: ${await res.text()}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  // Duration after trimming trailing silence, as the app would ship it.
  const pcm = execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    file,
    "-af",
    "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-f",
    "s16le",
    "-",
  ]);
  durations[f] = Math.round(pcm.length / 32);
  console.log(f, durations[f], "ms");
}
writeFileSync(join(DIR, "durations.json"), JSON.stringify(durations, null, 2));
