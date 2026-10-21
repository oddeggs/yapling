// Renders the learner utterances with Linh's Vietnamese-accented voice (ElevenLabs TTS),
// trims each segment with ffmpeg, and assembles PCM16 16 kHz mono files with the scripted
// mid-sentence pauses. Segment mp3s are cached in fixtures/src so re-runs cost no credits.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT, loadVars } from "./env.ts";

const LINH = "E9HIgK7B4p9tu2BOAMvK";
const MODEL = "eleven_v4";
const SRC = join(ROOT, "fixtures/src");
const PCM = join(ROOT, "fixtures/pcm");
mkdirSync(SRC, { recursive: true });
mkdirSync(PCM, { recursive: true });

type Utt = { id: string; parts: (string | number)[] };
const { utterances } = JSON.parse(readFileSync(join(ROOT, "client/utterances.json"), "utf8")) as {
  utterances: Utt[];
};
const key = loadVars().ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY missing in .dev.vars");

let chars = 0;
async function renderSegment(file: string, text: string): Promise<void> {
  if (existsSync(file)) return;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${LINH}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key!, "content-type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 0.85 },
    }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}: ${await res.text()}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  chars += text.length;
}

function toTrimmedPcm(mp3: string): Buffer {
  // Decode to s16le 16 kHz mono and strip leading and trailing silence below -45 dB.
  return execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    mp3,
    "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-f",
    "s16le",
    "-",
  ]);
}

const manifest: { id: string; text: string; speechMs: number; pausesMs: number[] }[] = [];
for (const u of utterances) {
  const chunks: Buffer[] = [];
  const pauses: number[] = [];
  let seg = 0;
  for (const p of u.parts) {
    if (typeof p === "number") {
      chunks.push(Buffer.alloc(Math.round((p / 1000) * 16000) * 2));
      pauses.push(p);
      continue;
    }
    const file = join(SRC, `${u.id}-${seg++}.mp3`);
    await renderSegment(file, p);
    chunks.push(toTrimmedPcm(file));
  }
  const pcm = Buffer.concat(chunks);
  writeFileSync(join(PCM, `${u.id}.pcm`), pcm);
  const text = u.parts.filter((p) => typeof p === "string").join(" ");
  manifest.push({ id: u.id, text, speechMs: Math.round(pcm.length / 32), pausesMs: pauses });
  console.log(`${u.id} ${Math.round(pcm.length / 32)} ms  pauses=${pauses.join(",") || "-"}  "${text}"`);
}
writeFileSync(join(PCM, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`new TTS characters billed this run: ${chars} (model ${MODEL})`);
