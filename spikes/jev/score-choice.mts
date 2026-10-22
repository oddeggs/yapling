/* Scores candidates 2, 3 and 4: Jev (argmax and tuned), Haiku, and the plain-code baselines. */
import { readFileSync } from 'node:fs';
import { hasRealWords } from '/Users/kbm5pro/oddeggs/yapling/apps/api/src/call/real-words.ts';
const load = (f: string) => JSON.parse(readFileSync(f, 'utf8')) as any[];
const argmax = (p: Record<string, number>) => Object.entries(p).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

function table(title: string, set: any[], rows: [string, (c: any, run: number) => string, boolean][], extra?: (c: any) => string) {
  const lines = [`\n**${title}** (${set.length} cases × 3 runs)\n`, '| Method | Accuracy | Same in all 3 runs | Wrong |', '|---|---|---|---|'];
  for (const [name, f, perRun] of rows) {
    let n = 0, hit = 0, same = 0;
    const wrong: string[] = [];
    for (const c of set) {
      const outs = [1, 2, 3].map((r) => f(c, r));
      if (new Set(outs).size === 1) same++;
      const okSet = [c.label, ...(c.alsoOk ?? [])];
      const bad = outs.filter((o) => !okSet.includes(o));
      n += 3; hit += 3 - bad.length;
      if (bad.length) wrong.push(`${c.id} "${c.said}" [${c.label}] → ${perRun ? bad.join(',') : bad[0]}${extra ? extra(c) : ''}`);
    }
    lines.push(`| ${name} | ${((100 * hit) / n).toFixed(1)}% | ${perRun ? `${same}/${set.length}` : 'deterministic'} | ${wrong.join('; ')} |`);
  }
  console.log(lines.join('\n'));
}
const idx = (rows: any[]) => Object.fromEntries(rows.map((r) => [`${r.id}#${r.run}`, r]));

// Candidate 2
{
  const set = load('sets/c2-real-words.json'), R = idx(load('results/c2.json'));
  const VI = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/iu;
  const code = (c: any) => (!hasRealWords(c.said) ? 'noise' : 'english');
  const codeVi = (c: any) => (!hasRealWords(c.said) ? 'noise' : VI.test(c.said) ? 'vietnamese' : 'english');
  const jev = (c: any, r: number) => argmax(R[`${c.id}#${r}`].jev.kind.probabilities);
  // Code first; Jev only for text with real words and no Vietnamese marks.
  const codeThenJev = (c: any, r: number) => { const k = codeVi(c); return k === 'english' ? jev(c, r) : k; };
  table('Candidate 2: English attempt, Vietnamese or noise', set, [
    ['Code: real-words check (lane version)', (c) => code(c), false],
    ['Code: real words + Vietnamese marks', (c) => codeVi(c), false],
    ['Jev, argmax', jev, true],
    ['Haiku 5.5, same question', (c, r) => R[`${c.id}#${r}`].haiku.label, true],
    ['Code, then Jev on what code calls English', codeThenJev, true],
  ], (c) => ` (${c.src})`);
}
// Candidate 3
{
  const set = load('sets/c3-again.json'), R = idx(load('results/c3.json'));
  const w = (s: string) => ` ${s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ')} `;
  const doc = (c: any) => (/ (slow|slowly) /.test(w(c.said)) ? 'slower' : / (sorry|again|pardon|repeat) /.test(w(c.said)) ? 'repeat' : 'neither');
  const better = (c: any) => {
    const t = w(c.said);
    if (/ (slow|slowly|slower|too fast|so fast|very fast|chậm|nhanh quá) /u.test(t)) return 'slower';
    if (/^ (sorry|pardon|excuse me|what|huh) $/.test(t) || / (again|pardon|repeat|say that again|what did you say|one more time|nói lại) /u.test(t) || /^ sorry (again|please)/.test(t)) return 'repeat';
    return 'neither';
  };
  const jev = (c: any, r: number) => argmax(R[`${c.id}#${r}`].jev.ask.probabilities);
  table('Candidate 3: "again" / "slowly"', set, [
    ['Code: the doc\'s word list (sorry, again, pardon, repeat / slow, slowly)', doc, false],
    ['Code: a fuller phrase list (written for this set)', better, false],
    ['Jev, argmax', jev, true],
    ['Haiku 5.5, same question', (c, r) => R[`${c.id}#${r}`].haiku.label, true],
  ]);
}
// Candidate 4
{
  const set = load('sets/c4-card.json'), R = idx(load('results/c4.json'));
  const map: Record<string, string> = { card_a: 'a', card_b: 'b', neither: 'neither' };
  const jevP = (c: any, r: number) => R[`${c.id}#${r}`].jev.card.probabilities as Record<string, number>;
  const jev = (c: any, r: number) => map[argmax(jevP(c, r))]!;
  const jevAt = (t: number) => (c: any, r: number) => { const p = jevP(c, r); const best = argmax(p); return best !== 'neither' && p[best]! >= t ? map[best]! : 'neither'; };
  const misses = set.filter((c) => c.wordMatch === 'neither');
  const rows: [string, (c: any, run: number) => string, boolean][] = [
    ['Code: word match', (c) => c.wordMatch, false],
    ['Jev, argmax', jev, true],
    ['Jev, a card only at p ≥ 0.6', jevAt(0.6), true],
    ['Jev, a card only at p ≥ 0.75', jevAt(0.75), true],
    ['Haiku 5.5, same question', (c, r) => map[R[`${c.id}#${r}`].haiku.label] ?? 'neither', true],
    ['Word match, then Jev ≥ 0.6 on a miss', (c, r) => (c.wordMatch !== 'neither' ? c.wordMatch : jevAt(0.6)(c, r)), true],
  ];
  table('Candidate 4: card match fallback, all cases', set, rows);
  table('Candidate 4: only the turns word match missed (where the fallback runs)', misses, rows.slice(1, 5));
}
