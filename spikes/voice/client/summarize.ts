// Summarises results/raw/<label>/turns.jsonl into results/summary.json (and prints the tables): latency percentiles, per-stage medians, turn-taking misfires and cost.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./env.ts";

type Row = Record<string, unknown> & {
  label: string;
  utt: string;
  pausesMs: number[];
  e2eFirstAudioMs: number | null;
  e2eFirstCharacterMs: number | null;
  usage: { input: number; cacheRead: number; cacheWrite: number; output: number; ttsChars: number } | null;
  pip: string | null;
};

// Public prices (see REPORT.md for sources).
const PRICE = {
  sttPerHour: 0.39, // Scribe v2 Realtime
  ttsPer1kChars: 0.04, // Flash / Turbo (v4 Turbo is listed at the same rate)
  inPerM: 0.1,
  cacheReadPerM: 0.01,
  cacheWritePerM: 0.125,
  outPerM: 0.5,
};

function pct(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!;
}
const med = (xs: number[]) => pct(xs, 50);
const nums = (rows: Row[], k: string) => rows.map((r) => r[k]).filter((x): x is number => typeof x === "number");

const RAW = join(ROOT, "results/raw");
const labels = existsSync(RAW)
  ? readdirSync(RAW)
      .filter((d) => existsSync(join(RAW, d, "turns.jsonl")))
      .sort()
  : [];
const out: Record<string, unknown>[] = [];
const lines: string[] = [
  "| run | turns | e2e reply P50 | P90 | e2e first character P50 | P90 | STT final | LLM 1st token | TTS 1st audio | cut-offs | false starts | stray replies | no commit | Pip words (median/max) |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
];
const pausedLines: string[] = [];
for (const label of labels) {
  const rows = readFileSync(join(RAW, label, "turns.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as Row);
  const e2e = nums(rows, "e2eFirstAudioMs");
  const ch = nums(rows, "e2eFirstCharacterMs");
  const words = rows.map((r) => (r.pip ?? "").split(/\s+/).filter(Boolean).length).filter((n) => n > 0);
  const count = (k: string) => rows.filter((r) => Boolean(r[k])).length;
  const paused = rows.filter((r) => r.pausesMs.length > 0);
  const s = {
    label,
    turns: rows.length,
    e2eP50: med(e2e),
    e2eP90: pct(e2e, 90),
    e2eMax: pct(e2e, 100),
    charP50: med(ch),
    charP90: pct(ch, 90),
    sttFinalP50: med(nums(rows, "sttFinalClientMs")),
    llmFirstTokenP50: med(nums(rows, "doLlmFirstTokenMs")),
    llmFirstTokenP90: pct(nums(rows, "doLlmFirstTokenMs"), 90),
    ttsFirstAudioP50: med(nums(rows, "doTtsFirstAudioMs")),
    fillerGapP50: med(nums(rows, "fillerGapMs")),
    cutOffs: count("cutOff"),
    falseStarts: rows.reduce((a, r) => a + Number(r.falseStarts ?? 0), 0),
    strayReplies: rows.reduce((a, r) => a + Number(r.strayReplies ?? 0), 0),
    noCommit: count("noCommit"),
    pausedTurns: paused.length,
    pausedMisfires: paused.filter((r) => r.cutOff || Number(r.falseStarts ?? 0) > 0 || Number(r.strayReplies ?? 0) > 0)
      .length,
    pipWordsMedian: med(words),
    pipWordsMax: pct(words, 100),
    over25Words: words.filter((w) => w > 25).length,
    usage: rows.reduce(
      (a, r) => {
        const u = r.usage;
        if (u) {
          a.input += u.input;
          a.cacheRead += u.cacheRead;
          a.cacheWrite += u.cacheWrite;
          a.output += u.output;
          a.ttsChars += u.ttsChars;
        }
        return a;
      },
      { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, ttsChars: 0 },
    ),
  };
  out.push(s);
  lines.push(
    `| ${label} | ${s.turns} | ${s.e2eP50} | ${s.e2eP90} | ${s.charP50 ?? "-"} | ${s.charP90 ?? "-"} | ${s.sttFinalP50} | ${s.llmFirstTokenP50} (P90 ${s.llmFirstTokenP90}) | ${s.ttsFirstAudioP50} | ${s.cutOffs} | ${s.falseStarts} | ${s.strayReplies} | ${s.noCommit} | ${s.pipWordsMedian}/${s.pipWordsMax} |`,
  );
  for (const r of paused) {
    pausedLines.push(
      `| ${label} | ${r.utt} | ${r.pausesMs.join(", ")} | ${String(r.prematureCommits)} | ${r.cutOff ? "yes" : "no"} | ${String(r.falseStarts ?? 0)} | ${String(r.strayReplies ?? 0)} | ${String(r.user)} |`,
    );
  }
}

// Cost per conversation-minute. The bench does not wait for Pip's audio to play, so a minute is
// modelled per turn: learner speech + wait for the reply + Pip's audio + 0.5 s before the learner
// answers. Hands-free keeps the mic (and Scribe) open for the whole minute.
const costLines: string[] = [
  "| run | modelled minutes | TTS chars/min | input+cache tokens/min | output tokens/min | STT $/min | TTS $/min | LLM $/min | total $/min |",
  "|---|---|---|---|---|---|---|---|---|",
];
for (const label of labels) {
  const rows = readFileSync(join(RAW, label, "turns.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as Row);
  const done = rows.filter((r) => r.usage && typeof r.pipAudioMs === "number" && Number(r.pipAudioMs) > 0);
  if (!done.length) continue;
  const ms = done.reduce(
    (a, r) => a + Number(r.speechMs) + Number(r.e2eFirstAudioMs ?? 0) + Number(r.pipAudioMs) + 500,
    0,
  );
  const minutes = ms / 60000;
  const u = done.reduce(
    (a, r) => {
      a.input += r.usage!.input;
      a.cacheRead += r.usage!.cacheRead;
      a.cacheWrite += r.usage!.cacheWrite;
      a.output += r.usage!.output;
      a.ttsChars += r.usage!.ttsChars;
      return a;
    },
    { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, ttsChars: 0 },
  );
  const stt = (PRICE.sttPerHour / 60) * minutes;
  const tts = (u.ttsChars / 1000) * PRICE.ttsPer1kChars;
  const llm =
    (u.input * PRICE.inPerM +
      u.cacheRead * PRICE.cacheReadPerM +
      u.cacheWrite * PRICE.cacheWritePerM +
      u.output * PRICE.outPerM) /
    1e6;
  const per = (x: number) => (x / minutes).toFixed(4);
  costLines.push(
    `| ${label} | ${minutes.toFixed(1)} | ${Math.round(u.ttsChars / minutes)} | ${Math.round((u.input + u.cacheRead + u.cacheWrite) / minutes)} | ${Math.round(u.output / minutes)} | ${per(stt)} | ${per(tts)} | ${per(llm)} | ${per(stt + tts + llm)} |`,
  );
}

const md = [
  "# Voice spike results",
  "",
  "Milliseconds. e2e = end of learner speech (client clock) to the first audio byte at the client. Reply = first generated TTS audio; first character = recorded reaction or reply, whichever comes first.",
  "",
  ...lines,
  "",
  "## Paused utterances",
  "",
  "| run | utt | pauses (ms) | early commits | cut-off | false starts | stray replies | final learner text |",
  "|---|---|---|---|---|---|---|---|",
  ...pausedLines,
  "",
  "## Cost per conversation-minute (modelled from bench turns, public API prices)",
  "",
  ...costLines,
  "",
].join("\n");
writeFileSync(join(ROOT, "results/summary.json"), JSON.stringify(out, null, 2));
console.log(md);
