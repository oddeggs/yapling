/* Latency of the production-shaped request from this Mac, sequential (one turn at a time). */
import { readFileSync, writeFileSync } from 'node:fs';
import { JEV_URL, pct } from './jev.mts';
const bodies = JSON.parse(readFileSync('results/prod-bodies.json', 'utf8')) as any[];
const single = (b: any) => ({ ...b, questions: { outcome: b.questions.outcome } });
const out: Record<string, number[]> = { full: [], single: [] };
const tokens: number[] = [];
for (let i = 0; i < 80; i++) {
  const b = bodies[i % bodies.length];
  for (const [kind, body] of [['full', b], ['single', single(b)]] as const) {
    const t0 = performance.now();
    const res = await fetch(JEV_URL, { method: 'POST', headers: { authorization: `Bearer ${process.env.JEV_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j: any = await res.json();
    out[kind]!.push(performance.now() - t0);
    if (kind === 'full') tokens.push(j.usage?.input_tokens ?? 0);
    if (!res.ok) console.error(kind, res.status);
  }
}
const s = (xs: number[]) => `n ${xs.length}, P50 ${pct(xs, 50).toFixed(0)}, P90 ${pct(xs, 90).toFixed(0)}, P99 ${pct(xs, 99).toFixed(0)}, max ${Math.max(...xs).toFixed(0)} ms`;
console.log('full turn request (7–9 questions):', s(out.full!));
console.log('single outcome question:', s(out.single!));
console.log('full request input tokens: median', pct(tokens, 50), 'max', Math.max(...tokens));
writeFileSync('results/latency-local.json', JSON.stringify({ ...out, tokens }));
