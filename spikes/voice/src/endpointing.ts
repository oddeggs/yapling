// Smart endpointing helpers: an energy gate over 20 ms PCM16 frames and a patience rule.
import type { CallConfig } from "./protocol";

// Words a learner's sentence rarely ends on: a pause after them means "still thinking".
export const DANGLING = new Set(
  "a an the and or but so because to of in on at for with from about into is am are was were be i my your his her our their this that very some want like go think um uh er".split(
    " ",
  ),
);

// RMS of one PCM16LE frame (about 400 is the voiced threshold for a close phone mic).
export function frameRms(bytes: Uint8Array): number {
  const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 1);
  let sum = 0;
  for (const v of pcm) sum += v * v;
  return Math.sqrt(sum / Math.max(1, pcm.length));
}

// Longer patience when the learner's words stop on a word that cannot end a sentence.
export function holdFor(text: string, cfg: Pick<CallConfig, "holdMs" | "holdLongMs">): number {
  const last =
    text
      .toLowerCase()
      .replace(/[^a-z' ]/g, " ")
      .trim()
      .split(/\s+/)
      .at(-1) ?? "";
  return DANGLING.has(last) ? cfg.holdLongMs : cfg.holdMs;
}

// Pre-recorded reactions in Pip's voice; the bench client measures them as character audio.
export const FILLERS = ["Ooh,", "Oh!", "Mm,", "Hmm,"] as const;

export function pickFiller(text: string, seq: number): string {
  if (/\?\s*$/.test(text)) return "Hmm,";
  return FILLERS[seq % 3] ?? "Ooh,";
}

// Joins committed segments split by a learner's pause. Scribe closes each segment with a full stop,
// which reads to the model like a finished sentence ("I think we put the books. On the shelf.");
// show the pause as a hesitation instead.
export function joinSegments(before: string, next: string): string {
  if (!before) return next;
  const head = before.replace(/[.,]+\s*$/, "").replace(/\.\.\.$/, "");
  const tail = /^(I|I'm|I've|I'll|I'd)\b/.test(next) ? next : next.charAt(0).toLowerCase() + next.slice(1);
  return `${head}... ${tail}`;
}
