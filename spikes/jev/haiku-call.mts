/*
 * Haiku 5.5 through the real call path: director plan + replyDirection + persona system prompt,
 * the same params the call sends. Records the case tag (or control outcome) and the crisis flag.
 * Usage: tsx haiku-call.mts <set.json> <label> [runs]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { REPO, story, sceneOf, priorFor, TARGETS } from './context.mts';
const director = await import(`${REPO}/apps/api/src/call/director.ts`);
const llm = await import(`${REPO}/apps/api/src/call/llm.ts`);
const splitterMod = await import(`${REPO}/apps/api/src/call/reply-splitter.ts`);
const control = await import(`${REPO}/apps/api/src/call/control.ts`);

const [setPath, label, runsArg] = process.argv.slice(2);
const runs = Number(runsArg ?? 3);
const cases = JSON.parse(readFileSync(setPath!, 'utf8')) as any[];
const client = llm.anthropicClient(process.env.ANTHROPIC_API_KEY ?? '');

const listening = (scene: any, beatId: string) => ({
  version: 1, sceneId: scene.id, stage: 'newcomer', beatId, phase: 'listening', tries: 0, asks: 0, correcting: false, lastLine: null,
});
const learnerCtx = (scene: any, targets: boolean) => ({
  name: 'Khanh', timezone: 'Asia/Ho_Chi_Minh', stage: 'newcomer', firstLanguage: 'vi', pace: null,
  targets: targets ? TARGETS : [],
  duePhrases: scene.phrases.map((id: string) => story.findPhrase(id)).filter(Boolean).map((p: any) => ({ id: p.id, text: p.en })),
});
function promptOf(prior: any[], speaker: string): string | null {
  for (let i = prior.length - 1; i >= 0; i--) {
    const l = prior[i];
    if (l.speaker === 'learner') continue;
    return l.speaker === speaker ? l.text : null;
  }
  return null;
}

async function once(c: any, run: number) {
  const scene = sceneOf(c.beat);
  const d = new director.Director(scene, listening(scene, c.beat), 'newcomer');
  const plan = d.plan();
  const prior = priorFor(c.beat, c.src);
  const targets = c.targets ? TARGETS : [];
  const direction = director.replyDirection(plan, 'newcomer', targets, null, promptOf(prior, plan.speaker), c.said);
  const learnerLine = { speaker: 'learner', text: c.said, at: Date.now(), turn: 1, words: [], beatId: c.beat, outcome: null, phrasesUsed: [], canDo: null, targetId: null, correctionFixed: null };
  const system = llm.systemFor(plan.speaker, scene, learnerCtx(scene, !!c.targets));
  const messages = llm.messagesFor(plan.speaker, [...prior, learnerLine], direction);
  const params = llm.turnParams(system, messages);
  const t0 = performance.now();
  let msg: any;
  for (let attempt = 0; ; attempt++) {
    try { msg = await client.messages.create({ ...params, stream: false }); break; }
    catch (e) { if (attempt >= 3) return { id: c.id, run, error: String(e) }; await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); }
  }
  const ms = performance.now() - t0;
  const raw = msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  const s = new splitterMod.ReplySplitter({ maxWords: 25, speaker: story.CAST[plan.speaker].name });
  for (let i = 0; i < raw.length; i += 3) s.push(raw.slice(i, i + 3));
  const end = s.end();
  const tag = s.caseTag ?? null;
  const parsed = control.parseControl(end.control);
  const outcome = tag && control.OUTCOMES.includes(tag) ? tag : parsed.outcome;
  return {
    id: c.id, run, outcome, tag, controlOutcome: parsed.outcome, crisis: parsed.crisis, spoken: s.text, raw: raw.trim(), ms: Math.round(ms),
    usage: { input: msg.usage.input_tokens, cacheRead: msg.usage.cache_read_input_tokens ?? 0, cacheWrite: msg.usage.cache_creation_input_tokens ?? 0, output: msg.usage.output_tokens },
  };
}

const jobs: [any, number][] = [];
for (let r = 1; r <= runs; r++) for (const c of cases) jobs.push([c, r]);
const results: any[] = [];
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < jobs.length) {
    const [c, r] = jobs[next++]!;
    const res = await once(c, r);
    results.push(res);
    if (results.length % 20 === 0) console.error(`${label}: ${results.length}/${jobs.length}`);
  }
}));
results.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.run - b.run));
writeFileSync(`results/${label}.json`, JSON.stringify(results, null, 1));
console.error(`${label}: done, errors ${results.filter((r) => r.error).length}`);
