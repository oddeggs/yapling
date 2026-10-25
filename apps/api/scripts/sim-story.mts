// Plays a learner's first story end to end in text, the way the app runs it: the story and its
// first scene are written, each next scene is planned while the one before plays, a simulated
// learner talks with the live actor, the judge reads each scene, and the next scene's way in is
// rewritten to follow on. Prints everything for a read-through. Costs about $1–2 a persona.
// Usage: ANTHROPIC_API_KEY=… pnpm exec tsx scripts/sim-story.mts <persona> [scenes] [stories]
import Anthropic from '@anthropic-ai/sdk';
import type { Arrival } from '@yapling/contracts';
import { PLACES } from '@yapling/scene';
import { CAST } from '@yapling/story';

import { parseControl } from '../src/call/control';
import { messagesFor, turnParams, MOMENT_TURN_MODEL } from '../src/call/llm';
import { NarrationGuard } from '../src/call/narration-guard';
import type { TranscriptLine } from '../src/call/transcript';
import { actorSystem, pickLane, turnDirection, type Lane } from '../src/director/actor';
import { arrivalText } from '../src/director/craft';
import { firstMoment } from '../src/director/fixed';
import { judgeMoment, type JudgedLine } from '../src/director/judge';
import { SONNET } from '../src/director/llm';
import type { MomentPlan } from '../src/director/moment';
import {
  followOn,
  metNeighbours,
  planScene,
  stageFor,
  writeStory,
  type StoryContext,
} from '../src/director/plan';
import type { StoryOutline } from '../src/director/story';
import type { Learner, LearnerModel, Painting } from '../src/director/store';

const PERSONAS: Record<string, { arrival: Arrival; speaks: string }> = {
  khanh: {
    arrival: {
      name: 'Khanh',
      why: ['work', 'interview'],
      doing: 'work',
      field: 'product designer at a startup',
      interests: ['games', 'films', 'food'],
      hard: ['meetings', 'words'],
      level: 3,
      adult: true,
      firstLanguage: 'vi',
      country: 'VN',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    speaks:
      'a 29-year-old Vietnamese product designer at B1: understands most things, answers in 1–2 sentences, sometimes drops past tense and articles ("I haven\'t eat", "I go there yesterday"), sometimes asks "what do you mean?", a bit dry and funny, gets curious when the story is interesting and bored when asked pointless questions',
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
      'a 35-year-old Vietnamese nurse at A1: says 1–4 words, often repeats the words she hears, sometimes answers in Vietnamese ("dạ", "không hiểu"), sometimes says "again please" or "slowly", warm and shy',
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
      'a 33-year-old Brazilian accountant at B2: talks freely in 2–4 sentences, good grammar with occasional Portuguese-flavoured slips ("I have 33 years"), asks questions back, opinionated and warm',
  },
};

const key = process.env['ANTHROPIC_API_KEY'];
if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
const client = new Anthropic({ apiKey: key, maxRetries: 2 });
const [who = 'khanh', scenesArg = '3', storiesArg = '1'] = process.argv.slice(2);
const persona = PERSONAS[who];
if (!persona) throw new Error(`unknown persona ${who}`);

let usd = 0;
/** The live actor's model (the app's own unless ACTOR_MODEL says otherwise). */
const ACTOR = process.env['ACTOR_MODEL'] ?? MOMENT_TURN_MODEL;
let leaks = 0;
let turns = 0;
/** A spoken line that talks about the learner, the beat or the direction instead of to them. */
const leaky = (text: string) =>
  new RegExp(
    `\\b(${persona.arrival.name}'s|${persona.arrival.name} (has|hasn't|is|was|said|asked|gave|offered)|the learner|the beat|the goal|the direction|so I (stay|move|go)|I'll react)`,
    'i',
  ).test(text);
let model: LearnerModel | null = null;
let name: string | null = persona.arrival.name;
const paintings: Painting[] = [];
const pastStories: StoryOutline[] = [];
const recent: MomentPlan[] = [];
const memories: string[] = [];
let played = 0;
const out = (s = '') => console.log(s);

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
  createdAt: 0,
});

const ctx = (): StoryContext => ({
  learner: learner(),
  memories,
  paintings: [...paintings].reverse(),
  pastStories: [...pastStories].reverse(),
  recent: [...recent].reverse(),
  played,
  now: Date.now(),
});

async function learnerSays(lines: TranscriptLine[]): Promise<string> {
  const talk = lines
    .map((l) => (l.speaker === 'learner' ? `YOU: ${l.text}` : `${CAST[l.speaker].name}: ${l.text}`))
    .join('\n');
  const r = await client.messages.create({
    model: SONNET,
    max_tokens: 500,
    system: `You play a real adult learner of English in a voice app: ${persona.speaks}. You are talking out loud with characters in a story. Reply with ONLY what you say next, as speech recognition would write it (no quotes, no actions). Stay true to your level. React like a real person: engage when it's interesting, be short when it isn't.`,
    messages: [{ role: 'user', content: `${talk}\n\nWhat do you say?` }],
  });
  const u = r.usage;
  usd += (u.input_tokens * 2 + u.output_tokens * 10) / 1e6;
  const said = r.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('')
    .trim();
  return said || '...';
}

async function playScene(
  plan: MomentPlan,
  way: string,
  story: StoryOutline | null,
  sceneNo: number,
) {
  const speaker = PLACES[plan.place].resident;
  const stage = plan.stage_aimed;
  const ml = {
    name,
    firstLanguage: persona.arrival.firstLanguage,
    stage,
    country: persona.arrival.country,
  };
  const actorStory = story
    ? {
        title: story.title,
        logline: story.logline,
        sceneNo,
        scenes: story.scenes.length,
        before: paintings.slice(-4).flatMap((p) => (p.record ? [p.record.summary] : [])),
        about: arrivalText(learner()),
        met: metNeighbours([...paintings].reverse()),
      }
    : null;
  const system = actorSystem(plan, ml, 15, actorStory);
  const lines: TranscriptLine[] = [];
  const say = (s: string, text: string) => {
    lines.push({ speaker: s as never, text, at: Date.now(), lineId: null, beatId: null });
    out(`  ${CAST[s as keyof typeof CAST].name.toUpperCase()}: ${text}`);
  };
  out(
    `\n── "${plan.title_open}" · ${PLACES[plan.place].name} with ${CAST[speaker].name} · ${stage}`,
  );
  if (plan.card.length) out(`  ▌CARD: ${plan.card.join(' ')}`);
  if (plan.card_gloss) out(`  ▌GLOSS: ${plan.card_gloss}`);
  if (plan.bridge_card) out(`  [${plan.bridge_card}]`);
  if (way && speaker !== 'pip') say('pip', way);
  say(speaker, plan.opening_line);
  let beat = 0;
  let beatTurns = 0;
  let lane: Lane = 'planned';
  let switched = false;
  const replies: string[] = [];
  for (let turn = 0; turn < 12; turn++) {
    const heard = await learnerSays(lines);
    lines.push({
      speaker: 'learner',
      text: heard,
      at: Date.now(),
      turn,
      words: [],
      beatId: null,
    } as TranscriptLine);
    out(`  ${(name ?? 'LEARNER').toUpperCase()}: ${heard}`);
    replies.push(heard);
    if (replies.length === 2) {
      const next = pickLane(replies, stage);
      switched = next !== lane;
      lane = next;
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
      ...turnParams(system, messagesFor(speaker, lines, direction), ACTOR),
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
    const raw = (at >= 0 ? text.slice(0, at) : text).trim();
    // The live call's narration guard, as the voice would hear it.
    const guard = new NarrationGuard(CAST[speaker].name, name ?? '');
    const spoken = [...raw.split(/\s+/).flatMap((w) => guard.push(w)), ...guard.end()].join(' ');
    if (guard.action) out(`  (guard ${guard.action}: ${guard.dropped.join(' ').slice(0, 160)})`);
    const control = parseControl(at >= 0 ? text.slice(at) : null);
    say(speaker, spoken);
    turns += 1;
    if (guard.action || leaky(spoken)) leaks += 1;
    if (leaky(spoken)) out('  (LEAK spoken)');
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
    lines: judged.filter((_, i) => !(i === 0 && way && speaker !== 'pip')),
    firstLanguage: persona.arrival.firstLanguage,
    openThreads: [],
    name,
  });
  if (j) {
    usd += j.costUsd;
    model = j.model;
    name ??= j.name;
    memories.unshift(...j.facts.map((f) => f.text));
    out(
      `  ⟶ judge: ${j.model.cefr}/${j.model.stage} (${j.model.confidence}) · ${j.record.summary}`,
    );
    paintings.push({
      id: `p${played}`,
      momentId: `m${played}`,
      callId: `c${played}`,
      place: plan.place,
      variant: plan.variant,
      hour: 15,
      localDate: '2026-10-25',
      weather: 'clear',
      speaker,
      titleOpen: plan.title_open,
      title: plan.title_close,
      keptAt: Date.now(),
      status: 'done',
      cut: false,
      canDos: j.canDos,
      words: j.words,
      learned: j.learned,
      record: j.record,
    });
  }
  played += 1;
  recent.push(plan);
  return judged;
}

const t0 = Date.now();
out(`PERSONA ${who}: ${arrivalText(learner())}`);
const first = firstMoment(15, persona.arrival.firstLanguage, name, stageFor(learner()));
let story = await writeStory(client, ctx(), 6);
if (!story) throw new Error('no story');
usd += story.costUsd;
let lastLines = await playScene(first, '', null, 0);
let lastPlan = first;
for (let s = 0; s < Number(storiesArg); s++) {
  const outline = story!.value.outline;
  pastStories.push(outline);
  out(`\n════ STORY: ${outline.title} [${outline.kind}] centred on ${outline.central}`);
  out(`  ${outline.logline}`);
  out(`  why: ${outline.why_this_learner}`);
  out(`  grows: ${outline.grows}`);
  out(`  twist: ${outline.twist}`);
  out(
    `  scenes: ${outline.scenes.map((x, i) => `${i + 1}. ${x.place}: ${x.dramatic_question}`).join(' | ')}`,
  );
  let next: MomentPlan = story!.value.scene;
  const scenes = Math.min(Number(scenesArg), outline.scenes.length);
  for (let n = 1; n <= scenes; n++) {
    // The next scene is written while this one plays (from what was known before it).
    const ahead =
      n < outline.scenes.length
        ? planScene(client, ctx(), outline, n + 1, paintings.slice(-(n - 1) || paintings.length), 6)
        : null;
    const followed = await followOn(client, {
      outline,
      last: lastPlan,
      lines: lastLines,
      next,
      learnerName: name,
    });
    if (followed) {
      usd += followed.costUsd;
      next = followed.plan;
    }
    lastLines = await playScene(next, next.bridge_line, outline, n);
    lastPlan = next;
    const planned = ahead ? await ahead : null;
    if (planned) {
      usd += planned.costUsd;
      next = planned.value;
    }
  }
  if (s + 1 < Number(storiesArg)) {
    story = await writeStory(client, ctx(), 6);
    if (!story) break;
    usd += story.costUsd;
  }
}
out(`\nACTOR ${ACTOR}: ${leaks} of ${turns} replies leaked or were guarded`);
out(`\nDONE in ${Math.round((Date.now() - t0) / 1000)} s, about $${usd.toFixed(2)}`);
