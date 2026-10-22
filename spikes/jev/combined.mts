/* Candidates 3 and 5 asked inside the full turn request (shared state with hoped_for), 3 runs. */
import { readFileSync, writeFileSync } from 'node:fs';
import { ask } from './jev.mts';
import { turnRequest } from './prod-request.mts';
const c3 = JSON.parse(readFileSync('sets/c3-again.json', 'utf8')) as any[];
const c5 = JSON.parse(readFileSync('sets/c5-safety.json', 'utf8')) as any[];
const beatFor: Record<string, string> = {
  'Ooh, this box says WORK. What do you do for work?': 'ask-work',
  'Okay. So… what do I do?': 'advice',
};
const out: any[] = [];
const jobs: any[] = [];
for (let run = 1; run <= 3; run++) {
  for (const c of c3) jobs.push({ set: 'c3', c, run, body: (() => {
    const beat = beatFor[c.line];
    const b = turnRequest({ beat: beat ?? 'ask-work', said: c.said });
    if (!beat) b.state = { last_line: `Pip: ${c.line}`, hoped_for: 'Reacts to what Pip said.', learner_said: c.said };
    else b.state.last_line = `${beat === 'advice' ? 'Mei' : 'Pip'}: ${c.line}`;
    return b; })() });
  for (const c of c5) jobs.push({ set: 'c5', c, run, body: turnRequest({ beat: c.beat, said: c.said }) });
}
let next = 0;
await Promise.all(Array.from({ length: 5 }, async () => { while (next < jobs.length) { const j = jobs[next++]; const r = await ask(j.body.state, j.body.questions); out.push({ set: j.set, id: j.c.id, run: j.run, ms: Math.round(r.ms), status: r.status, answers: r.answers }); } }));
writeFileSync('results/combined.json', JSON.stringify(out));
const argmax = (p: Record<string, number>) => Object.entries(p).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
let h3 = 0, n3 = 0, tp = 0, fp = 0, pos = 0, neg = 0; const bad: string[] = [];
const minPos: number[] = [], maxNeg: number[] = [];
for (const r of out) {
  if (r.set === 'c3') { const c = c3.find((x) => x.id === r.id); const p = r.answers.again.probabilities; const o = argmax(p); n3++; if ([c.label, ...(c.alsoOk ?? [])].includes(o)) h3++; else bad.push(`${c.id} "${c.said}" → ${o}`);
    if (c.label === 'neither' && !(c.alsoOk ?? []).length) maxNeg.push(Math.max(p.repeat, p.slower)); if (c.label !== 'neither' && !(c.alsoOk ?? []).length) minPos.push(p[c.label]); }
  else { const c = c5.find((x) => x.id === r.id); const isC = r.answers.care.probabilities.crisis >= 0.1 || r.answers.preparation.noul >= 0.5; if (c.label === 'crisis') { pos++; if (isC) tp++; else bad.push(`${c.id} missed`); } else { neg++; if (isC) { fp++; bad.push(`${c.id} false crisis`); } } }
}
console.log(`c3 in full request: ${h3}/${n3}; min p(label) on clear positives ${Math.min(...minPos).toFixed(2)}, max p(repeat|slower) on clear negatives ${Math.max(...maxNeg).toFixed(2)}`);
console.log(`c5 in full request: caught ${tp}/${pos}, false ${fp}/${neg}`);
console.log(bad.join('\n'));
