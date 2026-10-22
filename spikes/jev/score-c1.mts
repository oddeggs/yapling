/* Scores candidate 1: Haiku's case tag vs Jev decision rules, per run and across runs. */
import { readFileSync } from 'node:fs';
const set = JSON.parse(readFileSync(process.argv[2] ?? 'sets/c1-outcome.json', 'utf8')) as any[];
const haiku = JSON.parse(readFileSync(process.argv[3] ?? 'results/c1-haiku.json', 'utf8')) as any[];
const jev = JSON.parse(readFileSync(process.argv[4] ?? 'results/c1-jev.json', 'utf8')) as any[];
const byId = Object.fromEntries(set.map((c) => [c.id, c]));
const event = (o: string) => (o === 'fine' ? 'fine' : o === 'target_error' ? 'target_error' : 'not_yet');
const ok = (c: any, o: string) => o === c.label || (c.alsoOk ?? []).includes(o);
const okEvent = (c: any, o: string) => [c.label, ...(c.alsoOk ?? [])].map(event).includes(event(o));
const argmax = (p: Record<string, number>) => Object.entries(p).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
const avg = (a: Record<string, number>, b: Record<string, number>) => Object.fromEntries(Object.keys(a).map((k) => [k, (a[k]! + b[k]!) / 2]));

type Rule = (r: any, c: any) => string;
const withTargets = (base: (r: any) => string, t = 0.5): Rule => (r, c) => {
  const o = base(r);
  if (o === 'fine' && c.targets && Math.max(...Object.values(r.targets as Record<string, number>).map((x) => x ?? 0)) >= t) return 'target_error';
  return o;
};
const notFine = (p: Record<string, number>) => argmax(Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'fine')));
export const rules: Record<string, Rule> = {
  'jev argmax (fine first)': withTargets((r) => argmax(r.outcome)),
  'jev argmax (fine last)': withTargets((r) => argmax(r.outcome_r)),
  'jev argmax (both orders)': withTargets((r) => argmax(avg(r.outcome, r.outcome_r))),
  'jev fine if p>=0.7 (both)': withTargets((r) => { const p = avg(r.outcome, r.outcome_r); return p.fine! >= 0.7 ? 'fine' : notFine(p); }),
  'jev fine if p>=0.5 & hoped>=0.5': withTargets((r) => { const p = avg(r.outcome, r.outcome_r); return p.fine! >= 0.5 && r.hoped >= 0.5 ? 'fine' : notFine(p); }),
  'jev fine if hoped>=0.5': withTargets((r) => { const p = avg(r.outcome, r.outcome_r); return r.hoped >= 0.5 ? 'fine' : notFine(p); }),
  'jev fine if hoped>=0.3': withTargets((r) => { const p = avg(r.outcome, r.outcome_r); return r.hoped >= 0.3 ? 'fine' : notFine(p); }),
};

function report(name: string, decide: (id: string, run: number) => string | null, ids = set.map((c) => c.id)) {
  const runs = [1, 2, 3];
  let n = 0, hit = 0, hitEv = 0, falseFine = 0, falseNot = 0, notFineN = 0, fineN = 0, tagMissing = 0;
  let same = 0, sameEv = 0;
  const wrong: Record<string, string[]> = {};
  for (const id of ids) {
    const c = byId[id];
    const outs = runs.map((r) => decide(id, r));
    if (new Set(outs).size === 1) same++;
    if (new Set(outs.map((o) => event(o ?? 'fine'))).size === 1) sameEv++;
    for (const o0 of outs) {
      const o = o0 ?? 'fine';
      if (o0 === null) tagMissing++;
      n++;
      if (ok(c, o)) hit++; else (wrong[id] ??= []).push(o);
      if (okEvent(c, o)) hitEv++;
      const labelFine = event(c.label) === 'fine';
      if (labelFine) fineN++; else notFineN++;
      if (!labelFine && event(o) === 'fine' && !okEvent(c, o)) falseFine++;
      if (labelFine && event(o) !== 'fine' && !okEvent(c, o)) falseNot++;
    }
  }
  const pc = (a: number, b: number) => `${((100 * a) / b).toFixed(1)}%`;
  console.log(`\n### ${name}\noutcome ${hit}/${n} (${pc(hit, n)}) · runner event ${hitEv}/${n} (${pc(hitEv, n)}) · false fine ${falseFine}/${notFineN} · false not-fine ${falseNot}/${fineN} · same answer all 3 runs ${same}/${ids.length} (event ${sameEv}/${ids.length})${tagMissing ? ` · no tag ${tagMissing}` : ''}`);
  console.log('wrong: ' + Object.entries(wrong).map(([id, o]) => `${id}[${byId[id].label}] "${byId[id].said}" → ${o.join(',')}`).join(' | '));
}

const H = Object.fromEntries(haiku.map((r) => [`${r.id}#${r.run}`, r]));
const J = Object.fromEntries(jev.map((r) => [`${r.id}#${r.run}`, r]));
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const ids = set.map((c) => c.id).filter((id) => !only || only.test(id));
report('haiku 5.5 (call path, case tag)', (id, r) => H[`${id}#${r}`]?.outcome ?? null, ids);
for (const [name, rule] of Object.entries(rules)) report(name, (id, r) => rule(J[`${id}#${r}`], byId[id]), ids);
