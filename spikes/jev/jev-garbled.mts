import { readFileSync, writeFileSync } from 'node:fs';
import { ask } from './jev.mts';
import { answerOf, lastLineFor } from './context.mts';
import { garbledV1 } from './questions.mts';
const [setPath, label] = process.argv.slice(2);
const cases = JSON.parse(readFileSync(setPath!, 'utf8')) as any[];
const out: any[] = [];
for (let run = 1; run <= 3; run++) await Promise.all(cases.map(async (c) => {
  const r = await ask({ last_line: lastLineFor(c.beat, c.src), hoped_for: answerOf(c.beat).expects, learner_said: c.said }, { garbled: garbledV1 });
  out.push({ id: c.id, run, garbled: r.answers.garbled?.noul ?? null, ms: Math.round(r.ms) });
}));
writeFileSync(`results/${label}.json`, JSON.stringify(out, null, 1));
const by: Record<string, number[]> = {};
for (const x of out) (by[x.id] ??= []).push(x.garbled);
for (const c of cases) console.log(c.id, c.label.padEnd(12), by[c.id]!.map((v) => v.toFixed(2)).join(' '), JSON.stringify(c.said));
