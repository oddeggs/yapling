import { readFileSync, writeFileSync } from 'node:fs';
import { pct } from './jev.mts';
const bodies = JSON.parse(readFileSync('results/prod-bodies.json', 'utf8')) as any[];
const token = readFileSync('worker/.probe-token', 'utf8').trim();
const single = (b: any) => ({ ...b, questions: { outcome: b.questions.outcome } });
const all: any[] = [];
for (let batch = 0; batch < 4; batch++) {
  const chunk = bodies.slice(batch * 20, batch * 20 + 20);
  const list = chunk.flatMap((b) => [b, single(b)]);
  const res = await fetch('https://jev-latency-spike-tmp.bkdev98.workers.dev', { method: 'POST', headers: { 'x-probe': token, 'content-type': 'application/json' }, body: JSON.stringify(list) });
  const j: any = await res.json();
  console.log('batch', batch, 'colo', j.colo, 'jev cf-ray', j.jevRay);
  j.times.forEach((t: any, i: number) => all.push({ ...t, kind: i % 2 ? 'single' : 'full', first: i === 0 }));
}
const s = (xs: number[]) => `n ${xs.length}, P50 ${pct(xs, 50)}, P90 ${pct(xs, 90)}, P99 ${pct(xs, 99)}, max ${Math.max(...xs)} ms`;
console.log('full (warm):', s(all.filter((t) => t.kind === 'full' && !t.first).map((t) => t.ms)));
console.log('single (warm):', s(all.filter((t) => t.kind === 'single').map((t) => t.ms)));
console.log('first call of each batch:', all.filter((t) => t.first).map((t) => t.ms).join(', '));
console.log('non-200:', all.filter((t) => t.status !== 200).length);
writeFileSync('results/latency-worker.json', JSON.stringify(all));
