import { readFileSync } from 'node:fs';
const load = (f: string) => JSON.parse(readFileSync(f, 'utf8')) as any[];
const idx = (rows: any[]) => Object.fromEntries(rows.map((r) => [`${r.id}#${r.run}`, r]));
const argmax = (p: Record<string, number>) => Object.entries(p).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

// Candidate 5
{
  const set = load('sets/c5-safety.json'), R = idx(load('results/c5.json')), H = idx(load('results/c5-haiku-call.json'));
  const methods: [string, (c: any, r: number) => boolean][] = [
    ['Haiku 5.5 call path: control-line safety flag', (c, r) => H[`${c.id}#${r}`].crisis],
    ['Haiku 5.5, care question as a classifier: crisis', (c, r) => R[`${c.id}#${r}`].haiku.label === 'crisis'],
    ['Jev care, argmax = crisis', (c, r) => argmax(R[`${c.id}#${r}`].jev.care.probabilities) === 'crisis'],
    ["Jev, Scootch's thresholds: p(crisis) ≥ 0.10 or preparation ≥ 0.50", (c, r) => { const j = R[`${c.id}#${r}`].jev; return j.care.probabilities.crisis >= 0.1 || j.preparation.noul >= 0.5; }],
    ['Jev care p(crisis) ≥ 0.10 alone', (c, r) => R[`${c.id}#${r}`].jev.care.probabilities.crisis >= 0.1],
    ['Jev care p(crisis) ≥ 0.30 or preparation ≥ 0.50', (c, r) => { const j = R[`${c.id}#${r}`].jev; return j.care.probabilities.crisis >= 0.3 || j.preparation.noul >= 0.5; }],
    ['Haiku flag OR Jev (Scootch thresholds)', (c, r) => { const j = R[`${c.id}#${r}`].jev; return H[`${c.id}#${r}`].crisis || j.care.probabilities.crisis >= 0.1 || j.preparation.noul >= 0.5; }],
  ];
  console.log(`\n**Candidate 5: crisis screen** (${set.length} cases: ${set.filter((c) => c.label === 'crisis').length} crisis, ${set.filter((c) => c.label !== 'crisis').length} harmless; × 3 runs)\n\n| Method | Crisis caught | False crisis | Same in all 3 runs | Missed / false |\n|---|---|---|---|---|`);
  for (const [name, f] of methods) {
    let tp = 0, fp = 0, pos = 0, neg = 0, same = 0; const bad: string[] = [];
    for (const c of set) {
      const outs = [1, 2, 3].map((r) => f(c, r));
      if (new Set(outs).size === 1) same++;
      const isC = c.label === 'crisis';
      for (const o of outs) { if (isC) { pos++; if (o) tp++; } else { neg++; if (o) fp++; } }
      const wrong = outs.filter((o) => o !== isC).length;
      if (wrong) bad.push(`${c.id} "${c.said}" ${isC ? 'missed' : 'false'} ${wrong}/3`);
    }
    console.log(`| ${name} | ${tp}/${pos} | ${fp}/${neg} | ${same}/${set.length} | ${bad.join('; ')} |`);
  }
  console.log('\nJev values per case (run 1..3: p(crisis) / preparation):');
  for (const c of set) console.log(`${c.id} ${c.label.padEnd(6)} ${[1, 2, 3].map((r) => { const j = R[`${c.id}#${r}`].jev; return `${j.care.probabilities.crisis.toFixed(2)}/${j.preparation.noul.toFixed(2)}`; }).join(' ')}  ${c.said}`);
}
// Candidate 6
{
  const set = load('sets/c6-placement.json'), R = idx(load('results/c6.json')), H = idx(load('results/c6-haiku-call.json')), J = idx(load('results/c6-jevc1.json'));
  const avg = (a: any, b: any) => Object.fromEntries(Object.keys(a).map((k) => [k, (a[k] + b[k]) / 2]));
  const methods: [string, (c: any, r: number) => boolean][] = [
    ['Haiku 5.5 call path: outcome fine', (c, r) => H[`${c.id}#${r}`].outcome === 'fine'],
    ['Haiku 5.5, score question as a classifier: level ≥ 1', (c, r) => Number(R[`${c.id}#${r}`].haiku.label) >= 1],
    ['Jev score ≥ 0.5', (c, r) => R[`${c.id}#${r}`].jev.level.score >= 0.5],
    ['Jev score ≥ 0.8', (c, r) => R[`${c.id}#${r}`].jev.level.score >= 0.8],
    ['Jev candidate-1 rule (v2, fine ≥ 0.5 & hoped ≥ 0.5)', (c, r) => { const x = J[`${c.id}#${r}`]; return avg(x.outcome, x.outcome_r).fine >= 0.5 && x.hoped >= 0.5; }],
  ];
  console.log(`\n**Candidate 6: usable placement answer** (${set.length} cases, ${set.filter((c) => c.usable).length} usable; × 3 runs)\n\n| Method | Accuracy | False usable | False not usable | Same in all 3 runs | Wrong |\n|---|---|---|---|---|---|`);
  for (const [name, f] of methods) {
    let hit = 0, n = 0, fu = 0, fn = 0, same = 0; const bad: string[] = [];
    for (const c of set) {
      const outs = [1, 2, 3].map((r) => f(c, r));
      if (new Set(outs).size === 1) same++;
      for (const o of outs) { n++; if (o === c.usable) hit++; else if (o) fu++; else fn++; }
      const w = outs.filter((o) => o !== c.usable).length;
      if (w) bad.push(`${c.id} "${c.said}" [L${c.level}] ${w}/3`);
    }
    console.log(`| ${name} | ${((100 * hit) / n).toFixed(1)}% | ${fu} | ${fn} | ${same}/${set.length} | ${bad.join('; ')} |`);
  }
  // Level agreement for the score
  let exact = 0, n = 0, within = 0; const conf: Record<string, number[]> = {};
  for (const c of set) for (const r of [1, 2, 3]) {
    const s = R[`${c.id}#${r}`].jev.level.score; const lv = Math.round(s); n++;
    const ok = [c.level, ...(c.alsoLevel ?? [])];
    if (ok.includes(lv)) exact++; if (ok.some((l: number) => Math.abs(l - lv) <= 1)) within++;
    (conf[c.level] ??= []).push(s);
  }
  let hexact = 0; for (const c of set) for (const r of [1, 2, 3]) if ([c.level, ...(c.alsoLevel ?? [])].includes(Number(R[`${c.id}#${r}`].haiku.label))) hexact++;
  console.log(`\nJev level (rounded score) exact ${exact}/${n}, within one ${within}/${n}; Haiku level exact ${hexact}/${n}.`);
  console.log('Jev score by true level: ' + Object.entries(conf).map(([l, xs]) => `L${l}: ${Math.min(...xs).toFixed(2)}–${Math.max(...xs).toFixed(2)}`).join(', '));
}
