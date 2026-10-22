/* Final candidate-1 rules, with the garbled noul and the target threshold, on main and holdout. */
import { readFileSync } from 'node:fs';
const load = (f: string) => JSON.parse(readFileSync(f, 'utf8')) as any[];
const argmax = (p: Record<string, number>) => Object.entries(p).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
const avg = (a: Record<string, number>, b: Record<string, number>) => Object.fromEntries(Object.keys(a).map((k) => [k, (a[k]! + b[k]!) / 2]));
const notFine = (p: Record<string, number>) => argmax(Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'fine')));
const event = (o: string) => (o === 'fine' ? 'fine' : o === 'target_error' ? 'target_error' : 'not_yet');

function score(name: string, set: any[], decide: (c: any, run: number) => string) {
  let n = 0, hit = 0, hitEv = 0, falseFine = 0, missedErr = 0, falseNot = 0, nf = 0, f = 0, te = 0, same = 0;
  for (const c of set) {
    const outs = [1, 2, 3].map((r) => decide(c, r));
    if (new Set(outs.map(event)).size === 1) same++;
    const okSet = [c.label, ...(c.alsoOk ?? [])];
    for (const o of outs) {
      n++;
      if (okSet.includes(o)) hit++;
      const evOk = okSet.map(event).includes(event(o));
      if (evOk) hitEv++;
      const le = event(c.label);
      if (le === 'not_yet') { nf++; if (!evOk && event(o) !== 'not_yet') falseFine++; }
      if (le === 'fine') { f++; if (!evOk) falseNot++; }
      if (le === 'target_error') { te++; if (!evOk) missedErr++; }
    }
  }
  const pc = (a: number, b: number) => `${((100 * a) / b).toFixed(1)}%`;
  return `| ${name} | ${pc(hit, n)} | ${pc(hitEv, n)} | ${falseFine}/${nf} | ${falseNot}/${f} | ${missedErr}/${te} | ${same}/${set.length} |`;
}

const sets = [
  { name: 'main (86)', set: load('sets/c1-outcome.json'), haiku: load('results/c1-haiku.json'), v1: load('results/c1-jev.json'), v2: load('results/c1-jev-v2.json'), g: load('results/c1-garbled.json') },
  { name: 'holdout (30)', set: load('sets/c1-holdout.json'), haiku: load('results/c1h-haiku.json'), v1: load('results/c1h-jev.json'), v2: load('results/c1h-jev-v2.json'), g: load('results/c1h-garbled.json') },
];
for (const s of sets) {
  const key = (xs: any[]) => Object.fromEntries(xs.map((r) => [`${r.id}#${r.run}`, r]));
  const H = key(s.haiku), V1 = key(s.v1), V2 = key(s.v2), G = key(s.g);
  const tgt = (r: any, c: any, t: number) => c.targets && Math.max(...Object.values(r.targets as Record<string, number>)) >= t;
  const jev = (V: any, opts: { order: 'first' | 'both'; fineAt?: number; hopedAt?: number; garbledAt?: number; targetAt: number }) => (c: any, run: number) => {
    const r = V[`${c.id}#${run}`];
    const p = opts.order === 'both' ? avg(r.outcome, r.outcome_r) : r.outcome;
    if (opts.garbledAt !== undefined && G[`${c.id}#${run}`].garbled >= opts.garbledAt) return 'unclear';
    const fine = opts.fineAt === undefined ? argmax(p) === 'fine' : p.fine! >= opts.fineAt && (opts.hopedAt === undefined || r.hoped >= opts.hopedAt);
    if (!fine) return notFine(p);
    return tgt(r, c, opts.targetAt) ? 'target_error' : 'fine';
  };
  const rows = [
    score('Haiku 5.5, call path (case tag)', s.set, (c, run) => H[`${c.id}#${run}`].outcome),
    score('Jev v1 untuned: argmax, targets ≥ 0.5', s.set, jev(V1, { order: 'first', targetAt: 0.5 })),
    score('Jev v2: argmax both orders, targets ≥ 0.35', s.set, jev(V2, { order: 'both', targetAt: 0.35 })),
    score('Jev v2: fine ≥ 0.7, targets ≥ 0.35', s.set, jev(V2, { order: 'both', fineAt: 0.7, targetAt: 0.35 })),
    score('Jev v2: fine ≥ 0.7, garbled ≥ 0.5 → unclear, targets ≥ 0.35', s.set, jev(V2, { order: 'both', fineAt: 0.7, garbledAt: 0.5, targetAt: 0.35 })),
    score('Jev v2: fine ≥ 0.5 & hoped ≥ 0.5, targets ≥ 0.35', s.set, jev(V2, { order: 'both', fineAt: 0.5, hopedAt: 0.5, targetAt: 0.35 })),
    score('Jev v2: fine ≥ 0.5 & hoped ≥ 0.5, garbled ≥ 0.5 → unclear, targets ≥ 0.35', s.set, jev(V2, { order: 'both', fineAt: 0.5, hopedAt: 0.5, garbledAt: 0.5, targetAt: 0.35 })),
    score('Jev v2 + Haiku: fine only if both say fine', s.set, (c, run) => { const j = jev(V2, { order: 'both', fineAt: 0.7, garbledAt: 0.5, targetAt: 0.35 })(c, run); const h = H[`${c.id}#${run}`].outcome; return event(j) === 'not_yet' ? j : event(h) === 'not_yet' ? h : j; }),
  ];
  console.log(`\n**${s.name}**\n\n| Rule | Outcome (6-way) | Runner event | False fine | False not-fine | Missed target error | Same event in all 3 runs |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}`);
}
