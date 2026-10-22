import { readFileSync } from 'node:fs';
const load = (f: string) => JSON.parse(readFileSync(f, 'utf8')) as any[];
const avg = (a: any, b: any) => Object.fromEntries(Object.keys(a).map((k) => [k, (a[k] + b[k]) / 2]));
const event = (o: string) => (o === 'fine' ? 'fine' : o === 'target_error' ? 'target_error' : 'not_yet');
let n = 0, dis = 0, jevRight = 0, haikuRight = 0, neither = 0;
for (const [s, h, v, g] of [['c1-outcome', 'c1-haiku', 'c1-jev-v2', 'c1-garbled'], ['c1-holdout', 'c1h-haiku', 'c1h-jev-v2', 'c1h-garbled']]) {
  const set = Object.fromEntries(load(`sets/${s}.json`).map((c) => [c.id, c]));
  const H = Object.fromEntries(load(`results/${h}.json`).map((r) => [`${r.id}#${r.run}`, r]));
  const G = Object.fromEntries(load(`results/${g}.json`).map((r) => [`${r.id}#${r.run}`, r]));
  for (const r of load(`results/${v}.json`)) {
    const c = set[r.id]; const p = avg(r.outcome, r.outcome_r);
    let j = G[`${r.id}#${r.run}`].garbled >= 0.5 ? 'not_yet' : p.fine >= 0.5 && r.hoped >= 0.5 ? 'fine' : 'not_yet';
    if (j === 'fine' && c.targets && Math.max(...Object.values(r.targets as Record<string, number>)) >= 0.35) j = 'target_error';
    const hv = event(H[`${r.id}#${r.run}`].outcome);
    const ok = [c.label, ...(c.alsoOk ?? [])].map(event);
    n++;
    if (hv !== j) { dis++; if (ok.includes(j)) jevRight++; else if (ok.includes(hv)) haikuRight++; else neither++; }
  }
}
console.log({ turns: n, disagree: dis, rate: (dis / n).toFixed(3), jevRight, haikuRight, neither });
