/* Candidate 1 on Jev: the outcome choice (two option orders), the hoped noul, the target nouls. */
import { readFileSync, writeFileSync } from 'node:fs';
import { ask } from './jev.mts';
import { answerOf, lastLineFor, TARGETS } from './context.mts';
import { outcomeV1, outcomeV1r, hopedV1, outcomeV2, outcomeV2r, hopedV2, targetQ } from './questions.mts';
const V2 = process.env.V === '2';

const [setPath, label, runsArg] = process.argv.slice(2);
const runs = Number(runsArg ?? 3);
const cases = JSON.parse(readFileSync(setPath!, 'utf8')) as any[];
export const stateOf = (c: any) => {
  const { expects } = answerOf(c.beat);
  return { last_line: lastLineFor(c.beat, c.src), hoped_for: expects, learner_said: c.said };
};
const results: any[] = [];
const jobs: [any, number][] = [];
for (let r = 1; r <= runs; r++) for (const c of cases) jobs.push([c, r]);
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < jobs.length) {
    const [c, run] = jobs[next++]!;
    const questions: Record<string, any> = V2 ? { outcome: outcomeV2, outcome_r: outcomeV2r, hoped: hopedV2 } : { outcome: outcomeV1, outcome_r: outcomeV1r, hoped: hopedV1 };
    if (c.targets) for (const t of TARGETS) questions[`target_${t.id}`] = targetQ(t.description);
    const res = await ask(stateOf(c), questions);
    results.push({ id: c.id, run, status: res.status, ms: Math.round(res.ms), usage: res.usage, error: res.error,
      outcome: res.answers.outcome?.probabilities, outcome_r: res.answers.outcome_r?.probabilities, hoped: res.answers.hoped?.noul,
      targets: Object.fromEntries(TARGETS.map((t) => [t.id, res.answers[`target_${t.id}`]?.noul ?? null])) });
  }
}));
results.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.run - b.run));
writeFileSync(`results/${label}.json`, JSON.stringify(results, null, 1));
console.error(`${label}: ${results.length} answers, errors ${results.filter((r) => r.status !== 200).length}`);
