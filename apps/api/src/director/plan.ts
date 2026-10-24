import type Anthropic from '@anthropic-ai/sdk';
import {
  clockLabel,
  localTime,
  openPlaces,
  PLACES,
  residentIn,
  weatherAt,
  type LocalTime,
} from '@yapling/scene';

import { MOMENT_SCHEMA, MomentPlan, speakerOf } from './moment';
import { structured, words, OPUS } from './llm';
import type { Learner, Painting } from './store';
import {
  BIBLE,
  CULTURE_RULES,
  LANGUAGE_NAMES,
  LEVEL_GUIDE,
  countryName,
  TURN_WORDS,
  type Stage,
} from './world';

/*
 * The director: plans the learner's next moment from the world, what the town knows about them,
 * the story so far, and who is in town at this hour. Opus writes it in the background after each
 * conversation; code checks it and asks once for a repair.
 */

export const DIRECTOR_SYSTEM = `You are the story director for Yapling, an English speaking app. Between conversations you plan the learner's NEXT moment: one short live voice conversation (6–10 learner turns, about 5 minutes) in one Natterwick place, with that place's resident. A faster model plays the resident live from your plan, one beat at a time, so the plan must be clear, playable and specific.

${BIBLE}

${CULTURE_RULES}

${LEVEL_GUIDE}

CHOOSING THE PLACE
- Choose from the places open now (listed with the moment). The resident of the place is the one who speaks; other neighbours can be talked about but are not there.
- Pick the variant that serves the story: its prop is in the painting, so use it ("a burnt loaf" is a gift for a story about Pip baking).
- Vary places across moments, but come back to people the learner liked. Early on, keep it close to home: the burrow, the bus stop, the café.

WHAT MAKES A MOMENT GREAT
- A hook in the first line that makes the learner want to answer: a small mystery, a favour, a mix-up, a gruff character's soft side, a plan going sideways kindly, a surprise.
- It walks into something already happening at this hour: Mei raising the shutters at 7, Hank at the noodle stall after dark, Pip half asleep at midnight. The time and weather are part of the scene.
- Personal relevance: weave in what we have INFERRED about the learner (work, interests, life, home) lightly and specifically. Never ask for facts up front; let the moment give natural openings for them to tell us more.
- Continuity: call back things the learner said or chose before; pay off open threads within three moments. A learner may play many moments in a row, or come back after weeks: no calendar, no "tomorrow", and every moment stands on its own for a learner who forgot the last one.
- Level fit: aim at the inferred stage, with one beat that stretches slightly. If the level is unknown or low-confidence, aim at Visitor/Newcomer: open with an easy question that offers two choices, write every if_struggling as a Visitor line (one sentence, at most 8 words, two short choices to repeat) and every if_strong as an open follow-up a B1–B2 speaker could talk about for a minute. The call listens to the first two answers and switches the actor to one of those lanes, so both must be playable on their own.
- A door: until we know three of the learner's interests, one beat is a door, where the story needs something from the learner's own life (what they would order, what their job is like, what they do after work, what food they grew up with). Low levels get two concrete choices plus "or something else?"; high levels an open why/how question. Never a quiz.
- At most two open threads (open_threads_after ≤ 2). Close an old thread before opening a new mystery; explain any mystery in the first two lines.
- The learner is needed, never tested. Something small changes because they spoke. The resident wants to learn something from them (pip_learns).
- End on a thread that pulls them back: a question, a reveal half-shown, a promise.
- Titles are wry, painting-style: "Waiting For The 45", "Still Life With Unpaid Biscuits", "Portrait Of A Raccoon Who Wants A Discount". The closing title must be true however the learner answers.

THE "WHILE YOU WERE AWAY" EVENT
One small off-screen event that happened in town since the last moment (Mei repainted the sign, Hank's crew is late, Pip learned a new word, a postcard came). It opens the moment and connects to the hook or to an open thread. Never guilt, never "you were gone so long".

OUTPUT
Return only JSON in the given schema. Write 3 to 5 beats; mark the door beat with is_door when one is needed. The actor sees one beat at a time, so each beat carries what it needs. Each beat has a goal (a can-do, phrased for this learner) and an example line within the stage's word limit (Visitor 8 words, Newcomer 18, others 25; count them). Target phrases are 2–5 English chunks the learner gets chances to use. Keep it playable in 6–10 learner turns. Only Bea says "love". Pip says "I", never "Pip". No stage directions, actions or asterisks in any line.`;

const SEEDS = [
  'a windy day; hats and paper keep flying down the lanes',
  'rain since morning; everyone is crowding indoors',
  'the harbour fog horn is stuck and hoots every ten minutes',
  'the lantern festival is in a week and nobody has a theme yet',
  'a ferry brought a crate with no label to the dock',
  'the bakery made far too many buns',
  'Bus 45 has a new route sign that nobody can read',
  'the library is giving away old maps',
  'the radio tower is looking for a new jingle',
  'a lost umbrella has been handed in three times today',
  'the town clock is running ten minutes fast',
  'there is a swap day on Market Lane',
  'a new bench in the park has a riddle carved on it',
  'a postcard arrived at the burrow from somewhere far away',
  'the power went out last night; everyone has a candle story',
  'seagulls stole the café sign letters again',
  'a talent show sign-up sheet is up in the square',
  'someone is learning the trumpet, badly, somewhere near the burrow',
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export interface PlanContext {
  readonly learner: Learner;
  /** Earlier paintings, newest first: the story so far. */
  readonly paintings: readonly Painting[];
  /** What the learner told the town (their memory page), newest first. */
  readonly memories: readonly string[];
  readonly played: number;
  readonly now: number;
}

const str = (x: unknown) => JSON.stringify(x, null, 1);

export function stageOfModel(learner: Learner): Stage | null {
  const s = learner.model?.stage;
  return s === 'visitor' ||
    s === 'newcomer' ||
    s === 'neighbour' ||
    s === 'regular' ||
    s === 'local' ||
    s === 'voice'
    ? s
    : null;
}

/** The moment's user message: the learner, the story so far, and the town right now. */
export function planInput(ctx: PlanContext, t: LocalTime, repair?: string): string {
  const { learner } = ctx;
  const weather = weatherAt(t);
  const open = openPlaces(t.hour)
    .map((p) => `${p.place} (variants ${p.variants.join(', ')})`)
    .join('; ');
  const story = [...ctx.paintings]
    .slice(0, 8)
    .reverse()
    .map((p) => ({
      title: p.title,
      place: p.place,
      with: p.speaker,
      date: p.localDate,
      summary: p.record?.summary ?? '(not judged)',
      remember: p.record?.remember ?? [],
      learned: p.learned,
    }));
  const language = LANGUAGE_NAMES[learner.firstLanguage] ?? learner.firstLanguage;
  const date = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
  return [
    `NOW: ${clockLabel(t.hour)} on ${date} on the learner's own clock; the town's weather is ${weather}.`,
    `PLACES OPEN NOW: ${open}.`,
    `TOWN TODAY (use it, or ignore it if it gets in the way): ${SEEDS[hash(`${learner.userId}#${ctx.played}`) % SEEDS.length]}.`,
    `THE LEARNER: ${learner.name ? `called ${learner.name}` : 'name not known yet'}; first language ${language}; lives in ${countryName(learner.country) ?? 'a country we do not know yet'}. They have played ${ctx.played} moment(s) before this one.`,
    `LEARNER MODEL (inferred from their conversations only):\n${learner.model ? str(learner.model) : '(none yet)'}`,
    `WHAT THEY TOLD THE TOWN:\n${ctx.memories.length ? ctx.memories.map((m) => `- ${m}`).join('\n') : '(nothing yet)'}`,
    `THE STORY SO FAR (oldest first):\n${story.length ? str(story) : '(nothing yet: this is their first planned moment)'}`,
    `OPEN THREADS: ${learner.openThreads.length ? learner.openThreads.join(' | ') : '(none)'}`,
    repair
      ? `YOUR LAST PLAN FAILED THE CHECK. Fix this and return the whole plan again:\n${repair}`
      : 'Plan the next moment.',
  ].join('\n\n');
}

/** Code checks a plan must pass: an open place, lines within the limit, the door, two threads. */
export function checkPlan(plan: MomentPlan, t: LocalTime, needsDoor: boolean): string[] {
  const problems: string[] = [];
  if (!residentIn(plan.place, plan.variant, t.hour)) {
    problems.push(
      `${plan.place} variant ${plan.variant} has nobody in at ${clockLabel(t.hour)}; choose a place open now.`,
    );
  }
  const limit = TURN_WORDS[plan.stage_aimed];
  const lines = [plan.opening_line, ...plan.beats.map((b) => b.example_line)];
  lines.forEach((line, i) => {
    const max = i === 0 ? limit + 6 : limit;
    const n = words(line.replace(/^[A-Z][\w ]{0,20}:\s*/, ''));
    if (n > max) problems.push(`This line has ${n} words, over the ${max}-word limit: ${line}`);
  });
  if (plan.beats.length < 3 || plan.beats.length > 5) problems.push('Write 3 to 5 beats.');
  if (needsDoor && !plan.beats.some((b) => b.is_door))
    problems.push('One beat must be a door (is_door: true): we know fewer than three interests.');
  if (plan.open_threads_after.length > 2) problems.push('At most two open threads after.');
  const speaker = speakerOf(plan);
  if (speaker !== 'bea' && /\blove\b/i.test(lines.join(' ')))
    problems.push('Only Bea says "love"; take it out.');
  // Pip introduces itself ("I'm Pip"), but never talks about itself as "Pip".
  if (
    speaker === 'pip' &&
    /\bPip\b/.test(lines.join(' ').replace(/\bI(?:’|')m Pip\b|\bI am Pip\b/g, ''))
  )
    problems.push('Pip says "I", never its own name, in its lines.');
  return problems;
}

export interface Planned {
  readonly plan: MomentPlan;
  readonly hour: number;
  readonly costUsd: number;
  readonly repaired: boolean;
}

/** Plans the next moment for the learner's local time now; null when no valid plan came back. */
export async function planMoment(client: Anthropic, ctx: PlanContext): Promise<Planned | null> {
  // Plan for a few minutes ahead: the learner usually opens the next one soon after.
  const t = localTime(new Date(ctx.now + 5 * 60_000), ctx.learner.timezone);
  const needsDoor = (ctx.learner.model?.interests.length ?? 0) < 3;
  let cost = 0;
  let repair: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await structured<unknown>(client, {
      model: OPUS,
      system: [DIRECTOR_SYSTEM],
      user: planInput(ctx, t, repair),
      schema: MOMENT_SCHEMA,
      effort: 'medium',
    });
    cost += r.costUsd;
    const parsed = MomentPlan.safeParse(r.json);
    if (!parsed.success) {
      repair = `The JSON did not match the schema: ${parsed.error.message.slice(0, 400)}`;
      continue;
    }
    const plan = parsed.data as MomentPlan;
    const problems = checkPlan(plan, t, needsDoor);
    if (problems.length === 0 || attempt === 1) {
      // A second try that still breaks a soft rule is played anyway, unless the place is closed.
      if (!residentIn(plan.place, plan.variant, t.hour)) return null;
      return { plan, hour: t.hour, costUsd: cost, repaired: attempt > 0 };
    }
    repair = problems.join('\n');
  }
  return null;
}

/** Whether a ready plan can still be played at this local hour (its resident is in). */
export const playableAt = (plan: MomentPlan, hour: number): boolean =>
  residentIn(plan.place, plan.variant, hour);

export const placeName = (plan: MomentPlan) => PLACES[plan.place].name;
