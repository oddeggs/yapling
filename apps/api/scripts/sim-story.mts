// Plays a learner's first curriculum story in text, the way the app runs it: the companion is
// matched from the arrival answers, the next unit is picked from the syllabus, the story and each
// episode are written and checked, a simulated learner talks with the live actor (companion and
// guest), the judge reads each scene, and the next episode's way in follows on. Prints everything.
// Usage: ANTHROPIC_API_KEY=… pnpm exec tsx scripts/sim-story.mts <persona> [episodes]
import Anthropic from '@anthropic-ai/sdk';
import type { Arrival } from '@yapling/contracts';
import { PLACES } from '@yapling/scene';
import { CAST } from '@yapling/story';

import { parseControl } from '../src/call/control';
import { messagesFor, turnParams, MOMENT_TURN_MODEL } from '../src/call/llm';
import { NarrationGuard } from '../src/call/narration-guard';
import type { TranscriptLine } from '../src/call/transcript';
import { matchCompanions, stanceFor } from '../src/curriculum/companion';
import { dueChunks, nextUnit, START, teachingStage } from '../src/curriculum/progress';
import { actorSystem, pickLane, turnDirection, type Lane } from '../src/director/actor';
import { arrivalText } from '../src/director/craft';
import { firstMoment } from '../src/director/fixed';
import { judgeMoment, type JudgedLine } from '../src/director/judge';
import { SONNET } from '../src/director/llm';
import type { MomentPlan } from '../src/director/moment';
import { followOn, planScene, stageFor, writeStory, type StoryContext } from '../src/director/plan';
import type { Learner, LearnerModel, Painting } from '../src/director/store';

const PERSONAS: Record<string, { arrival: Arrival; speaks: string }> = {
  khanh: {
    arrival: {
      name: 'Khanh',
      why: ['work', 'interview'],
      doing: 'work',
      field: 'software developer',
      interests: ['games', 'films', 'food'],
      hard: ['meetings', 'words'],
      level: 3,
      adult: true,
      firstLanguage: 'vi',
      country: 'VN',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    speaks:
      'a 29-year-old Vietnamese software developer at B1: understands most things, answers in 1–2 sentences, sometimes drops past tense and articles, sometimes asks "what do you mean?", a bit dry, gets impatient with pointless or confusing questions and says so',
  },
  lan: {
    arrival: {
      name: 'Lan',
      why: ['travel', 'friends'],
      doing: 'work',
      field: 'nurse',
      interests: ['food', 'pets', 'music'],
      hard: ['fast_speech', 'nerves'],
      level: 1,
      adult: true,
      firstLanguage: 'vi',
      country: 'VN',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    speaks:
      'a 35-year-old Vietnamese nurse at A1: says 1–4 words, often repeats words she hears, sometimes answers in Vietnamese ("dạ", "không hiểu"), sometimes says "again please" or "slowly", warm and shy',
  },
  ana: {
    arrival: {
      name: 'Ana',
      why: ['move', 'work'],
      doing: 'work',
      field: 'accountant',
      interests: ['books', 'fitness', 'travel'],
      hard: ['small_talk', 'phone'],
      level: 4,
      adult: true,
      firstLanguage: 'pt',
      country: 'BR',
      timezone: 'America/Sao_Paulo',
    },
    speaks:
      'a 33-year-old Brazilian accountant at B2: talks freely in 2–3 sentences, occasional Portuguese-flavoured slips, asks questions back, opinionated and warm',
  },
};

const key = process.env['ANTHROPIC_API_KEY'];
if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
const client = new Anthropic({ apiKey: key, maxRetries: 2 });
const [who = 'khanh', episodesArg = '3'] = process.argv.slice(2);
const persona = PERSONAS[who];
if (!persona) throw new Error(`unknown persona ${who}`);
const ACTOR = process.env['ACTOR_MODEL'] ?? MOMENT_TURN_MODEL;

let usd = 0;
let model: LearnerModel | null = null;
const name = persona.arrival.name;
const paintings: Painting[] = [];
const memories: string[] = [];
let played = 0;
let leaks = 0;
let turns = 0;
const out = (s = '') => console.log(s);
const [companion] = matchCompanions(persona.arrival);

const learner = (): Learner => ({
  userId: `sim-${who}`,
  name,
  firstLanguage: persona.arrival.firstLanguage,
  country: persona.arrival.country,
  timezone: persona.arrival.timezone,
  model,
  openThreads: [],
  arrival: persona.arrival,
  arrivedAt: 0,
  companion,
  progress: START,
  createdAt: 0,
});

const stage = () => teachingStage(START, stageFor(learner()));
const ctx = (): StoryContext => ({
  learner: learner(),
  companion,
  stage: stage(),
  memories,
  paintings: [...paintings].reverse(),
  pastStories: [],
  played,
  now: Date.now(),
});

async function learnerSays(lines: TranscriptLine[], brief: string): Promise<string> {
  const talk = lines
    .map((l) => (l.speaker === 'learner' ? `YOU: ${l.text}` : `${CAST[l.speaker].name}: ${l.text}`))
    .join('\n');
  const r = await client.messages.create({
    model: SONNET,
    max_tokens: 500,
    system: `You play a real adult learner of English in a voice app: ${persona.speaks}. You read this brief before the scene: "${brief}". You are talking out loud with characters. Reply with ONLY what you say next, as speech recognition would write it (no quotes, no actions). Stay true to your level. If something makes no sense or you can't know it, say so the way a real person would.`,
    messages: [{ role: 'user', content: `${talk}\n\nWhat do you say?` }],
  });
  usd += (r.usage.input_tokens * 2 + r.usage.output_tokens * 10) / 1e6;
  return (
    r.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim() || '...'
  );
}

const briefText = (p: MomentPlan) =>
  [
    p.brief.recap,
    `${p.brief.where}.`,
    p.brief.happening,
    p.brief.your_role,
    `Tasks: ${p.brief.tasks.join(' ')}`,
    `Try: ${p.brief.try_saying.join(' / ')}`,
  ]
    .filter(Boolean)
    .join(' ');

async function playScene(plan: MomentPlan, title: string | null, sceneNo: number, scenes: number) {
  const st = plan.stage_aimed;
  const ml = {
    name,
    firstLanguage: persona.arrival.firstLanguage,
    stage: st,
    country: persona.arrival.country,
  };
  const story = title
    ? {
        title,
        logline: '',
        sceneNo,
        scenes,
        before: paintings.slice(-4).flatMap((p) => (p.record ? [p.record.summary] : [])),
        about: arrivalText(learner()),
        stance: stanceFor(persona.arrival, st),
      }
    : null;
  const system = actorSystem(plan, ml, 15, story);
  const lines: TranscriptLine[] = [];
  const say = (s: string, text: string) => {
    lines.push({ speaker: s as never, text, at: Date.now(), lineId: null, beatId: null });
    out(`  ${CAST[s as keyof typeof CAST].name.toUpperCase()}: ${text}`);
  };
  const guest = plan.guest !== 'none' ? plan.guest : null;
  out(
    `\n── ${plan.unit_id || 'fixed'} ep ${plan.episode} "${plan.title_open}" · ${PLACES[plan.place].name} · ${st}${guest ? ` · guest ${guest} (${plan.guest_how})` : ''}`,
  );
  out(`  ▌BRIEF: ${briefText(plan)}`);
  if (plan.brief_gloss) out(`  ▌GLOSS: ${plan.brief_gloss}`);
  out(`  ▌LEDGER: ${plan.knowledge_ledger.map((f) => `${f.source}:${f.fact}`).join(' | ')}`);
  say(plan.companion, plan.opening_line);
  let beat = 0;
  let beatTurns = 0;
  let lane: Lane = 'planned';
  let switched = false;
  const replies: string[] = [];
  for (let turn = 0; turn < 12; turn++) {
    const heard = await learnerSays(lines, briefText(plan));
    lines.push({
      speaker: 'learner',
      text: heard,
      at: Date.now(),
      turn,
      words: [],
      beatId: null,
    } as TranscriptLine);
    out(`  ${name.toUpperCase()}: ${heard}`);
    replies.push(heard);
    if (replies.length === 2) {
      const nextLane = pickLane(replies, st);
      switched = nextLane !== lane;
      lane = nextLane;
    } else switched = false;
    const { direction } = turnDirection(plan, ml, {
      beat,
      beatTurns,
      lane,
      laneSwitched: switched,
      landNow: replies.length >= 10,
      wrapUp: false,
    });
    const r = await client.messages.create({
      ...turnParams(system, messagesFor(plan.companion, lines, direction, guest), ACTOR),
      stream: false,
    } as Anthropic.MessageCreateParamsNonStreaming);
    const u = r.usage;
    usd +=
      (u.input_tokens * 2 +
        u.output_tokens * 10 +
        (u.cache_read_input_tokens ?? 0) * 0.2 +
        (u.cache_creation_input_tokens ?? 0) * 2.5) /
      1e6;
    const text = r.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const at = text.indexOf('§');
    let raw = (at >= 0 ? text.slice(0, at) : text).trim();
    let speaker: string = plan.companion;
    const tag = /^\[(\w+)\]\s*/.exec(raw);
    if (tag) {
      raw = raw.slice(tag[0].length);
      if (tag[1] === 'guest' && guest) speaker = guest;
    }
    const g = new NarrationGuard(CAST[speaker as keyof typeof CAST].name, name, heard);
    const spoken = [...raw.split(/\s+/).flatMap((w) => g.push(w)), ...g.end()].join(' ');
    turns += 1;
    if (g.action) {
      leaks += 1;
      out(`  (guard ${g.action}: ${g.dropped.join(' ').slice(0, 160)})`);
    }
    say(speaker, spoken);
    const control = parseControl(at >= 0 ? text.slice(at) : null);
    beatTurns += 1;
    if (control.beat === 'end') break;
    if (control.beat === 'next' || beatTurns >= 3) {
      beat += 1;
      beatTurns = 0;
    }
  }
  const judged: JudgedLine[] = lines.map((l) =>
    l.speaker === 'learner' ? { who: 'learner', text: l.text } : { who: 'character', text: l.text },
  );
  const j = await judgeMoment(client, {
    previous: model,
    plan,
    lines: judged,
    firstLanguage: persona.arrival.firstLanguage,
    openThreads: [],
    name,
  });
  if (j) {
    usd += j.costUsd;
    model = j.model;
    memories.unshift(...j.facts.map((f) => f.text));
    out(
      `  ⟶ judge: ${j.model.cefr}/${j.model.stage} · shown ${j.canDoShown} · ${j.record.summary}`,
    );
    out(
      `  ⟶ look-back: ${j.canDos.join(' / ')} · fix: ${j.fix ? `"${j.fix.said}" → "${j.fix.better}"` : '-'}`,
    );
    paintings.push({
      id: `p${played}`,
      momentId: `m${played}`,
      callId: `c${played}`,
      place: plan.place,
      variant: plan.variant,
      hour: 15,
      localDate: '2026-10-26',
      weather: 'clear',
      speaker: plan.companion,
      titleOpen: plan.title_open,
      title: plan.title_close,
      keptAt: Date.now(),
      status: 'done',
      cut: false,
      canDos: j.canDos,
      words: j.words,
      learned: j.learned,
      record: j.record,
      fix: j.fix,
    });
  }
  played += 1;
  return judged;
}

const t0 = Date.now();
out(`PERSONA ${who}: ${arrivalText(learner())}`);
out(`COMPANION: ${companion} (stance ${stanceFor(persona.arrival, stage())}), stage ${stage()}`);
const unit = nextUnit(START, stageFor(learner()), persona.arrival);
const due = dueChunks(START);
out(`UNIT: ${unit.id} "${unit.title}" — ${unit.canDo}`);
const storyP = writeStory(client, ctx(), unit, due, 6);
const first = firstMoment(companion, name, stage(), persona.arrival.firstLanguage, 15);
let lastLines = await playScene(first, null, 0, 0);
let lastPlan: MomentPlan = first;
const story = await storyP;
if (!story) throw new Error('no story');
usd += story.costUsd;
const outline = story.value.outline;
out(`\n════ STORY: ${outline.title} [${outline.kind}] unit ${outline.unit_id}`);
out(`  ${outline.logline}`);
out(`  why: ${outline.why_this_learner}`);
out(
  `  episodes: ${outline.scenes.map((x) => `${x.episode}. ${x.place}${x.guest !== 'none' ? `+${x.guest}` : ''}: ${x.learner_does}`).join(' | ')}`,
);
let next: MomentPlan = story.value.scene;
const n = Math.min(Number(episodesArg), outline.scenes.length);
for (let e = 1; e <= n; e++) {
  const ahead =
    e < outline.scenes.length
      ? planScene(client, ctx(), outline, unit, due, e + 1, [...paintings], 6)
      : null;
  const followed = await followOn(client, {
    outline,
    last: lastPlan,
    lines: lastLines,
    next,
    learnerName: name,
    firstLanguage: persona.arrival.firstLanguage,
  });
  if (followed) {
    usd += followed.costUsd;
    next = followed.plan;
  }
  lastLines = await playScene(next, outline.title, e, outline.scenes.length);
  lastPlan = next;
  const planned = ahead ? await ahead : null;
  if (planned) {
    usd += planned.costUsd;
    next = planned.value;
  }
}
out(`\nACTOR ${ACTOR}: ${leaks} of ${turns} replies guarded`);
out(`DONE in ${Math.round((Date.now() - t0) / 1000)} s, about $${usd.toFixed(2)}`);
