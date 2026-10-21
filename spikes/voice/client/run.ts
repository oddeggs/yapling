// Bench client: plays the learner utterances into a CallDO at real-time pace (20 ms PCM16 frames,
// then trailing silence) and measures end of learner speech -> first TTS audio byte on this machine.
//
//   node client/run.ts --url ws://localhost:8799/call --label local-tp --rounds 1 \
//     [--commit turn_prediction|vad|manual] [--vad_secs 0.7] [--tts eleven_flash_v2_5|eleven_v4_turbo]
//     [--mode handsfree|ptt] [--utts u02,u06] [--tts_strategy schedule|auto] [--save]
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { ROOT, loadVars } from "./env.ts";

const { values: args } = parseArgs({
  options: {
    url: { type: "string", default: "ws://localhost:8799/call" },
    label: { type: "string", default: "run" },
    rounds: { type: "string", default: "1" },
    commit: { type: "string", default: "smart" },
    vad_secs: { type: "string", default: "0.7" },
    tts: { type: "string", default: "eleven_flash_v2_5" },
    tts_strategy: { type: "string", default: "flush_early" },
    stt_region: { type: "string", default: "global" },
    mode: { type: "string", default: "handsfree" },
    utts: { type: "string", default: "" },
    merge: { type: "string", default: "1" },
    filler: { type: "string", default: "1" },
    save: { type: "boolean", default: false },
  },
});

type Manifest = { id: string; text: string; speechMs: number; pausesMs: number[] }[];
const PCM_DIR = join(ROOT, "fixtures/pcm");
const manifest = JSON.parse(readFileSync(join(PCM_DIR, "manifest.json"), "utf8")) as Manifest;
const selected = args.utts ? manifest.filter((m) => args.utts!.split(",").includes(m.id)) : manifest;
const OUT_DIR = join(ROOT, "results/raw", args.label!);
mkdirSync(OUT_DIR, { recursive: true });
const OUT = join(OUT_DIR, "turns.jsonl");

const FILLER_MS = JSON.parse(readFileSync(join(ROOT, "fixtures/fillers/durations.json"), "utf8")) as Record<
  string,
  number
>;
const FRAME = 640; // 20 ms of PCM16 16 kHz mono
const NO_COMMIT_MS = 6000;

// Deterministic low noise floor (about -55 dBFS) so silence looks like a real phone mic.
let seed = 12345;
function noise(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return Math.round(((seed / 0x7fffffff) * 2 - 1) * 60);
}
function withNoise(pcm: Buffer): Buffer {
  const out = Buffer.alloc(pcm.length);
  for (let i = 0; i < pcm.length; i += 2) {
    const v = pcm.readInt16LE(i) + noise();
    out.writeInt16LE(Math.max(-32768, Math.min(32767, v)), i);
  }
  return out;
}
function silenceFrame(): Buffer {
  return withNoise(Buffer.alloc(FRAME));
}
// Index of the last 20 ms frame whose RMS is above about -40 dBFS.
function lastSpeechFrame(pcm: Buffer): number {
  let last = 0;
  for (let f = 0; f * FRAME < pcm.length; f++) {
    let sum = 0;
    let n = 0;
    for (let i = f * FRAME; i < Math.min(pcm.length, (f + 1) * FRAME); i += 2) {
      const v = pcm.readInt16LE(i);
      sum += v * v;
      n++;
    }
    if (Math.sqrt(sum / Math.max(1, n)) > 330) last = f;
  }
  return last;
}

const sleepUntil = (t: number) => new Promise((r) => setTimeout(r, Math.max(0, t - performance.now())));
const now = () => performance.now();

type Ev = { kind: string; t: number; [k: string]: unknown };

async function runRound(round: number): Promise<void> {
  const token = loadVars().SPIKE_TOKEN ?? "";
  const q = new URLSearchParams({
    token,
    commit: args.mode === "ptt" ? "manual" : args.commit!,
    ...(process.env.SPIKE_QUERY ? Object.fromEntries(new URLSearchParams(process.env.SPIKE_QUERY)) : {}),
    vad_secs: args.vad_secs!,
    tts: args.tts!,
    tts_strategy: args.tts_strategy!,
    stt_region: args.stt_region!,
    merge: args.merge!,
    filler: args.filler!,
    debug: process.env.DEBUG ? "1" : "0",
  });
  const ws = new WebSocket(`${args.url}?${q}`);
  ws.binaryType = "arraybuffer";
  const tOpen = now();
  let events: Ev[] = [];
  let ready: Record<string, unknown> | null = null;
  const audioByTurn = new Map<number, Buffer[]>();
  let waiter: (() => void) | null = null;
  let summary: unknown = null;

  ws.addEventListener("message", (e) => {
    const t = now();
    const msg = JSON.parse(String(e.data)) as Record<string, unknown> & { type: string };
    if (process.env.DEBUG && msg.type !== "tts_audio")
      console.log("    <", Math.round(t), msg.type, String(msg.text ?? msg.reason ?? "").slice(0, 80));
    if (msg.type === "ready") ready = msg;
    if (msg.type === "call_summary") summary = msg;
    if (msg.type === "info") console.log(`  info ${String(msg.what)} ${String(msg.ms)} ms `);
    if (msg.type === "tts_audio") {
      const turn = msg.turn as number;
      if (!audioByTurn.has(turn)) audioByTurn.set(turn, []);
      audioByTurn.get(turn)!.push(Buffer.from(msg.audio as string, "base64"));
      events.push({ kind: "tts_audio", t, turn, seq: msg.seq, bytes: (msg.audio as string).length });
    } else if (msg.type === "error") {
      console.error(`  ! ${msg.where}: ${msg.detail}`);
      events.push({ ...msg, kind: "error", t });
    } else {
      events.push({ ...msg, kind: msg.type, t });
    }
    waiter?.();
  });
  await new Promise<void>((res, rej) => {
    ws.addEventListener("open", () => res(), { once: true });
    ws.addEventListener("error", () => rej(new Error("socket error")), { once: true });
  });
  const tConnected = now();
  const t0 = now();
  let next = t0;
  const sendFrame = async (frame: Buffer): Promise<number> => {
    next += 20;
    await sleepUntil(next);
    ws.send(frame);
    return now();
  };
  // Lead-in silence while the DO connects upstream.
  while (!ready) await sendFrame(silenceFrame());
  console.log(
    `round ${round}: ready in ${Math.round(now() - tOpen)} ms (ws ${Math.round(tConnected - tOpen)}), stt ${String((ready as Record<string, unknown>).sttRegion)}, colo ${String((ready as Record<string, unknown>).colo)}`,
  );
  if ((ready as Record<string, unknown>).sttFallbackReason)
    console.log(`  stt fallback: ${String((ready as Record<string, unknown>).sttFallbackReason)}`);
  for (let i = 0; i < 15; i++) await sendFrame(silenceFrame());

  for (const u of selected) {
    const raw = readFileSync(join(PCM_DIR, `${u.id}.pcm`));
    const pcm = withNoise(raw);
    const lastFrame = lastSpeechFrame(raw);
    events = [];
    let tSpeechEnd = 0;
    const tSpeechStart = now();
    for (let f = 0; f * FRAME < pcm.length; f++) {
      const frame = Buffer.alloc(FRAME);
      pcm.copy(frame, 0, f * FRAME, Math.min(pcm.length, (f + 1) * FRAME));
      const sent = await sendFrame(frame);
      if (f === lastFrame) {
        tSpeechEnd = sent;
        ws.send(JSON.stringify(args.mode === "ptt" ? { type: "end_turn" } : { type: "mark", name: "speech_end" }));
      }
    }
    // Trailing silence (hands-free) or nothing (hold-to-talk) until the reply finishes.
    let answerTurn: number | null = null;
    let done = false;
    let noCommit = false;
    let forcedCommit = false;
    while (!done) {
      const finals = events.filter((e) => e.kind === "final" && e.t >= tSpeechEnd);
      if (answerTurn === null && finals.length) answerTurn = finals[0]!.turn as number;
      const lastFinal = finals.at(-1);
      if (lastFinal) answerTurn = lastFinal.turn as number;
      done = answerTurn !== null && events.some((e) => e.kind === "turn_done" && e.turn === answerTurn);
      if (done) break;
      if (!finals.length && now() - tSpeechEnd > NO_COMMIT_MS && !forcedCommit) {
        noCommit = true;
        forcedCommit = true;
        ws.send(JSON.stringify({ type: "end_turn" }));
      }
      if (now() - tSpeechEnd > 20000) break;
      if (args.mode === "ptt") {
        await new Promise<void>((r) => {
          waiter = r;
          setTimeout(r, 50);
        });
        waiter = null;
        next = now();
      } else {
        await sendFrame(silenceFrame());
      }
    }
    const premature = events.filter((e) => e.kind === "final" && e.t < tSpeechEnd);
    const earlyAudio = events.filter((e) => e.kind === "tts_audio" && e.t < tSpeechEnd);
    const firstAudio = events.find((e) => e.kind === "tts_audio" && e.turn === answerTurn);
    const finalEv = events.find((e) => e.kind === "final" && e.turn === answerTurn);
    const doneEv = events.find((e) => e.kind === "turn_done" && e.turn === answerTurn) as
      | (Ev & { timings: Record<string, number>; usage: Record<string, number>; user: string; pip: string })
      | undefined;
    const firstPartial = events.find((e) => e.kind === "partial");
    const rec = events.find((e) => e.kind === "play_rec" && e.turn === answerTurn);
    const firstChar = [firstAudio?.t, rec?.t].filter((x): x is number => x !== undefined);
    const tm = doneEv?.timings;
    const rel = (a?: number, b?: number) => (a !== undefined && b !== undefined ? a - b : null);
    const row = {
      label: args.label,
      round,
      utt: u.id,
      mode: args.mode,
      commit: args.mode === "ptt" ? "manual" : args.commit,
      vadSecs: args.commit === "vad" ? Number(args.vad_secs) : null,
      tts: args.tts,
      ttsStrategy: args.tts_strategy,
      sttRegion: (ready as Record<string, unknown>).sttRegion,
      colo: (ready as Record<string, unknown>).colo,
      pausesMs: u.pausesMs,
      speechMs: Math.round(tSpeechEnd - tSpeechStart),
      // Client clock, from the moment the frame holding the last speech sample was sent.
      e2eFirstAudioMs: firstAudio ? Math.round(firstAudio.t - tSpeechEnd) : null,
      // First character audio of any kind (recorded reaction or generated reply).
      e2eFirstCharacterMs: firstChar.length ? Math.round(Math.min(...firstChar) - tSpeechEnd) : null,
      filler: rec ? rec.id : null,
      // Silence between the end of the recorded reaction and the first generated audio (negative = queued).
      fillerGapMs: rec && firstAudio ? Math.round(firstAudio.t - (rec.t + (FILLER_MS[rec.id as string] ?? 400))) : null,
      fillersOnAbortedTurns: events.filter((e) => e.kind === "play_rec" && e.turn !== answerTurn).length,
      sttFinalClientMs: finalEv ? Math.round(finalEv.t - tSpeechEnd) : null,
      firstPartialMs: firstPartial ? Math.round(firstPartial.t - tSpeechStart) : null,
      // DO clock, relative stage durations.
      doSttFinalMs: tm ? rel(tm.commit, tm.speechEnd) : null,
      doLlmFirstTokenMs: tm ? rel(tm.llmFirstToken, tm.llmStart) : null,
      doTtsFirstAudioMs: tm ? rel(tm.ttsFirstAudio, tm.ttsFirstText) : null,
      doCommitToAudioMs: tm ? rel(tm.firstAudioOut, tm.commit) : null,
      doSpeechEndToAudioMs: tm ? rel(tm.firstAudioOut, tm.speechEnd) : null,
      doAudioReadyMs: tm ? rel(tm.ttsFirstAudio, tm.speechEnd) : null,
      doReleaseMs: tm ? rel(tm.release, tm.speechEnd) : null,
      doLlmTotalMs: tm ? rel(tm.llmDone, tm.llmStart) : null,
      prematureCommits: premature.length,
      prematureTexts: premature.map((p) => p.text),
      abortedTurns: events
        .filter((e) => e.kind === "turn_aborted")
        .map((e) => ({ reason: e.reason, audioSent: e.audioSent })),
      cutOff: earlyAudio.length > 0,
      falseStarts: events.filter((e) => e.kind === "turn_aborted" && e.audioSent).length,
      // Length of Pip's generated reply audio (pcm_24000: 48 bytes per ms).
      pipAudioMs: Math.round(
        events
          .filter((e) => e.kind === "tts_audio" && e.turn === answerTurn)
          .reduce((a, e) => a + (Number(e.bytes) * 3) / 4, 0) / 48,
      ),
      // Replies to a fragment that reached the phone besides the real answer.
      strayReplies: new Set(events.filter((e) => e.kind === "tts_audio" && e.turn !== answerTurn).map((e) => e.turn))
        .size,
      noCommit,
      user: doneEv?.user ?? null,
      pip: doneEv?.pip ?? null,
      usage: doneEv?.usage ?? null,
    };
    appendFileSync(OUT, `${JSON.stringify(row)}\n`);
    console.log(
      `  ${u.id} e2e=${row.e2eFirstAudioMs}ms char=${row.e2eFirstCharacterMs} gap=${row.fillerGapMs} stt=${row.sttFinalClientMs} llm1=${row.doLlmFirstTokenMs} tts1=${row.doTtsFirstAudioMs}` +
        ` ready=${row.doAudioReadyMs} rel=${row.doReleaseMs} premature=${row.prematureCommits}${row.cutOff ? " CUT-OFF" : ""}${row.falseStarts ? " FALSE-START" : ""}${row.strayReplies ? " STRAY-REPLY" : ""}${noCommit ? " NO-COMMIT" : ""}` +
        `\n      learner: ${row.user}\n      pip:     ${row.pip}`,
    );
    if (args.save && answerTurn !== null && audioByTurn.has(answerTurn)) {
      writeFileSync(join(OUT_DIR, `${u.id}-r${round}.pcm`), Buffer.concat(audioByTurn.get(answerTurn)!));
    }
    for (let i = 0; i < 25; i++) await sendFrame(silenceFrame());
  }
  ws.send(JSON.stringify({ type: "hangup" }));
  await new Promise((r) => setTimeout(r, 500));
  if (summary) appendFileSync(join(OUT_DIR, "calls.jsonl"), `${JSON.stringify({ round, ...(summary as object) })}\n`);
  ws.close();
}

for (let r = 1; r <= Number(args.rounds); r++) await runRound(r);
