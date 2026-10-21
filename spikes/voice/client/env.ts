// Reads KEY=value lines from spikes/voice/.dev.vars without ever printing them.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadVars(): Record<string, string> {
  const out: Record<string, string> = {};
  const text = readFileSync(join(ROOT, ".dev.vars"), "utf8");
  for (const line of text.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && m[1] && m[2] !== undefined) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
