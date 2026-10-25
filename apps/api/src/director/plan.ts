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
import { CAST } from '@yapling/story';

import { COMPANION, STANCE_TEXT, stanceFor, type CompanionId } from '../curriculum/companion';
import { episodeJob, STAGE_DIALS, type Unit } from '../curriculum/units';
import { ARRIVAL_STAGE, arrivalText, SCENE_RULES, STORY_CRAFT } from './craft';
import { structured, words, OPUS, SONNET } from './llm';
import { MOMENT_SCHEMA, MomentPlan } from './moment';
import {
  FOLLOW_SCHEMA,
  FollowOn,
  NewStory,
  repeatsStories,
  STORY_SCHEMA,
  type StoryOutline,
} from './story';
import type { Learner, Painting } from './store';
import { BIBLE, CULTURE_RULES, LANGUAGE_NAMES, LEVEL_GUIDE, type Stage } from './world';

/*
 * The director: writes the learner's next story from the next curriculum unit (an outline), then
 * each episode while the one before plays, checks each episode against the scene rules (code for
 * what code can see, a fast critic for the rest), and lightly rewrites the next episode's way in
 * once the one before it is played. Opus writes; Sonnet checks and follows on.
 */

const SHARED = `${BIBLE}

${STORY_CRAFT}

${SCENE_RULES}

${CULTURE_RULES}

${LEVEL_GUIDE}`;

export const STORY_ROLE = `YOUR JOB: you are the story director for Yapling, an English speaking app. Write the outline of the learner's next story: the curriculum unit given, told in the number of episodes given, with their companion beside them in every episode. Each episode is planned in full later, from your outline and from what the learner really says.

Return only JSON in the given schema: the outline, with exactly the episodes asked for, numbered from 1, each with a place from the companion's places where possible. Guests only where the stage allows them.`;

export const SCENE_ROLE = `YOUR JOB: you are the story director for Yapling, an English speaking app. Plan the next episode of the learner's story in full: the scene template. The curriculum fields (unit, can-do, target chunks, recycled chunks, strategy, the episode's job, the stage's settings) are fixed: copy them and build the scene so that using that language is the natural way through it. A faster model plays the companion (and the guest) live from your plan, one beat at a time.

Write 4 to 6 beats in this order: open, success_first, then the task beat(s), the turn where the episode has one, and close. The opening line is the companion's, spoken as written. Every line within the stage's word limit. Only Bea says "love"; Pip says "I", never "Pip"; no stage directions, asterisks or emoji. Return only JSON in the given schema.`;

export const FOLLOW_SYSTEM = `You keep a story continuous in Yapling, an English speaking app. The learner just played a scene; the next scene was planned before it happened. Rewrite only the next scene's way in so it follows on from what REALLY happened: the brief's recap (one sentence, second person: what happened last time), the brief's "what is happening now", the brief in the learner's language, the situation as we arrive, and the companion's opening line (plus its gloss). Keep the next scene's tasks, phrases, facts and first question. Use one specific thing the learner said or did. Never add a fact the learner could not know, nothing only visible, no new names. Same length limits as the originals. Return only JSON in the given schema.

${BIBLE}`;

const CRITIC_SYSTEM = `You check one planned scene of Yapling, an English speaking app played by voice only, against its rules. Read the plan like a strict editor and list every line that breaks a rule, with a concrete fix. Be precise; do not invent problems.

${SCENE_RULES}

Return only JSON: {"ok": boolean, "problems": [{"rule": number, "line": "the offending text", "fix": "what to write instead"}]}. ok is true only when there are no problems.`;

const CRITIC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'problems'],
  properties: {
    ok: { type: 'boolean' },
    problems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['rule', 'line', 'fix'],
        properties: {
          rule: { type: 'integer' },
          line: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
  },
} as const;

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

/**
 * Where the conversations place the learner: what they showed once the judge is sure, otherwise
 * their own feel for their level, otherwise Visitor.
 */
export function stageFor(learner: Learner): Stage {
  const judged = stageOfModel(learner);
  const own = learner.arrival ? ARRIVAL_STAGE[learner.arrival.level] : undefined;
  if (judged && (learner.model?.confidence !== 'low' || own === undefined)) return judged;
  return own ?? judged ?? 'visitor';
}

/** Everything the director knows when it writes. */
export interface StoryContext {
  readonly learner: Learner;
  readonly companion: CompanionId;
  /** The stage taught at (from the learner's progress and placement). */
  readonly stage: Stage;
  /** What the learner told the town (their memory page), newest first. */
  readonly memories: readonly string[];
  /** Earlier paintings, newest first. */
  readonly paintings: readonly Painting[];
  /** Earlier stories' outlines, newest first. */
  readonly pastStories: readonly StoryOutline[];
  readonly played: number;
  readonly now: number;
}

function townInput(t: LocalTime): string[] {
  const date = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
  const open = openPlaces(t.hour)
    .map((p) => `${p.place} (variants ${p.variants.join(', ')})`)
    .join('; ');
  return [
    `NOW: ${clockLabel(t.hour)} on ${date} on the learner's own clock; the town's weather is ${weatherAt(t)}.`,
    `PLACES OPEN NOW (the companion is painted into whichever you choose): ${open}.`,
  ];
}

function companionInput(ctx: StoryContext): string {
  const c = COMPANION[ctx.companion];
  const stance = stanceFor(ctx.learner.arrival, ctx.stage);
  return [
    `THE COMPANION: ${c.who}.`,
    `Their world: ${c.world}. Their places: ${c.places.join(', ')}. Guests who fit their stories: ${c.guests.join(', ')}.`,
    `Manner (never changes): ${c.manner}.`,
    `Stance with this learner: ${STANCE_TEXT[stance]}.`,
  ].join('\n');
}

function stageInput(stage: Stage): string {
  const d = STAGE_DIALS[stage];
  const guests =
    d.guests === 'none'
      ? 'none at all (the companion only)'
      : d.guests === 'episode4'
        ? 'one, only in episode 4, speaking only to the learner'
        : d.guests === 'one'
          ? 'at most one per scene'
          : 'at most two';
  return `STAGE: ${stage}. Speech: ${d.speech}. Character turns at most ${d.turnWords} words. Guests: ${guests}. Two-choice questions: ${d.choices === 'allowed' ? 'allowed' : 'only as a rescue'}. Planning time before the hard task: ${d.planningSeconds} seconds. Characters talking to each other: ${d.overheard ? 'allowed, briefly' : 'never'}. Listening questions at this stage: ${d.listening}. Longest learner turn asked: ${d.longestTurn}.`;
}

function unitInput(unit: Unit, due: readonly string[]): string {
  return [
    `THE UNIT: ${unit.id} "${unit.title}".`,
    `Can-do: the learner can ${unit.canDo}.`,
    `Function: ${unit.fn}. Target chunks: ${unit.chunks.join(' | ')}. Strategy: ${unit.strategy}.`,
    `Chunks due for review from earlier units: ${due.length ? due.join(' | ') : 'none'}.`,
  ].join('\n');
}

function learnerInput(ctx: StoryContext): string[] {
  const { learner } = ctx;
  return [
    `THE LEARNER, AS THEY INTRODUCED THEMSELVES:\n${arrivalText(learner)}`,
    `WHAT THE CONVERSATIONS SHOWED (learner model):\n${learner.model ? str(learner.model) : '(no conversation judged yet)'}`,
    `WHAT THEY TOLD THE TOWN IN CONVERSATION:\n${ctx.memories.length ? ctx.memories.map((m) => `- ${m}`).join('\n') : '(nothing yet)'}`,
  ];
}

const sceneMemory = (p: Painting) => ({
  title: p.title,
  place: p.place,
  summary: p.record?.summary ?? '(not judged yet)',
  remember: p.record?.remember ?? [],
});

/** The user message for a new story. */
export function storyInput(
  ctx: StoryContext,
  unit: Unit,
  due: readonly string[],
  t: LocalTime,
  repair?: string,
): string {
  const past = ctx.pastStories.slice(0, 6).map((o) => ({
    title: o.title,
    unit: o.unit_id,
    kind: o.kind,
    logline: o.logline,
    epilogue: o.epilogue,
  }));
  return [
    ...townInput(t),
    stageInput(ctx.stage),
    unitInput(unit, due),
    companionInput(ctx),
    ...learnerInput(ctx),
    `EARLIER STORIES (newest first; this one is a different kind, may pick up the last epilogue's thread):\n${past.length ? str(past) : '(none: this is their first story)'}`,
    `RECENT SCENES (newest first):\n${ctx.paintings.length ? str(ctx.paintings.slice(0, 3).map(sceneMemory)) : '(none)'}`,
    `WRITE A STORY OF ${STAGE_DIALS[ctx.stage].episodes} EPISODES for unit ${unit.id}.`,
    repair
      ? `YOUR LAST ANSWER FAILED THE CHECK. Fix this and return the whole answer again:\n${repair}`
      : 'Write the outline.',
  ].join('\n\n');
}

/** The user message for an episode of a story under way. */
export function sceneInput(
  ctx: StoryContext,
  outline: StoryOutline,
  unit: Unit,
  due: readonly string[],
  episode: number,
  played: readonly Painting[],
  t: LocalTime,
  repair?: string,
): string {
  const job = episodeJob(ctx.stage, episode);
  return [
    ...townInput(t),
    stageInput(ctx.stage),
    unitInput(unit, due),
    companionInput(ctx),
    ...learnerInput(ctx),
    `THE STORY (outline):\n${str(outline)}`,
    `THE EPISODES PLAYED SO FAR (oldest first; facts said there are source S):\n${played.length ? str(played.map(sceneMemory)) : '(none yet)'}`,
    `PLAN EPISODE ${episode} OF ${outline.scenes.length}: ${str(outline.scenes[episode - 1])}`,
    `THIS EPISODE'S JOB (${job.beat}): ${job.job}. Listening: ${job.listening}. Speaking: ${job.speaking}. Feedback: ${job.feedback}.`,
    `FIXED FIELDS TO COPY: unit_id "${unit.id}", episode ${episode}, stage_aimed "${ctx.stage}", companion "${ctx.companion}", target_chunks ${JSON.stringify(unit.chunks)}, recycled_chunks ${JSON.stringify(due)}.`,
    repair
      ? `YOUR LAST PLAN FAILED THE CHECK. Fix these and return the whole plan again:\n${repair}`
      : 'Plan the episode.',
  ].join('\n\n');
}

const VISUAL =
  /\b(look at|look!|see this|see that|over there|this one|that one|which one|what does the (sign|board|screen|poster|note|map) say)\b/i;

/** What code can check in a plan: an open place, the cast budget, the brief, what is visual-only. */
export function checkPlan(
  plan: MomentPlan,
  t: LocalTime,
  stage: Stage = plan.stage_aimed,
): { hard: string[]; soft: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];
  if (!residentIn(plan.place, plan.variant, t.hour)) {
    hard.push(
      `${plan.place} variant ${plan.variant} is closed at ${clockLabel(t.hour)}; choose a place open now.`,
    );
  }
  if (plan.beats.length < 3) hard.push('Write 4 to 6 beats.');
  const dials = STAGE_DIALS[stage];
  if (plan.guest !== 'none') {
    if (dials.guests === 'none') hard.push('No guest at this stage: the companion only.');
    if (dials.guests === 'episode4' && plan.episode !== 4)
      hard.push('A guest only in episode 4 at this stage.');
    if (!plan.guest_intro.trim()) hard.push('Introduce the guest by name, role and relation.');
  }
  if (plan.brief.tasks.length === 0) hard.push('The brief needs 1–3 tasks.');
  if (plan.brief.try_saying.length === 0) hard.push('The brief needs 1–2 phrases to try.');
  const lines = [plan.opening_line, ...plan.beats.map((b) => b.example_line)];
  for (const line of lines) {
    if (VISUAL.test(line))
      hard.push(`Visual-only, but the learner may see nothing: "${line}". Say it aloud instead.`);
  }
  lines.forEach((line, i) => {
    const max = i === 0 ? dials.turnWords + 6 : dials.turnWords;
    const n = words(line);
    if (n > max) soft.push(`This line has ${n} words, over the ${max}-word limit: ${line}`);
  });
  if (plan.companion !== 'bea' && plan.guest !== 'bea' && /\blove\b/i.test(lines.join(' ')))
    soft.push('Only Bea says "love".');
  return { hard, soft };
}

/** The fast critic: the rules code cannot check (genuine questions, the ledger, the brief). */
async function critic(
  client: Anthropic,
  plan: MomentPlan,
  ctx: StoryContext,
  played: readonly Painting[],
): Promise<{ problems: string[]; costUsd: number }> {
  try {
    const r = await structured<{
      ok: boolean;
      problems: { rule: number; line: string; fix: string }[];
    }>(client, {
      model: SONNET,
      system: [CRITIC_SYSTEM],
      effort: 'low',
      maxTokens: 3_000,
      schema: CRITIC_SCHEMA,
      user: [
        `THE LEARNER (what they know about themselves): ${arrivalText(ctx.learner)}`,
        `WHAT THE LEARNER HEARD AND SAID IN EARLIER SCENES (source S; these count as known):\n${played.length ? str(played.map(sceneMemory)) : '(none)'}`,
        `STAGE: ${plan.stage_aimed}.`,
        `THE PLAN:\n${str(plan)}`,
      ].join('\n\n'),
    });
    const problems = (r.json?.problems ?? []).map(
      (p) => `Rule ${p.rule}: "${p.line}". Fix: ${p.fix}`,
    );
    return { problems: r.json?.ok ? [] : problems, costUsd: r.costUsd };
  } catch (error) {
    console.warn('critic failed', { error: String(error).slice(0, 200) });
    return { problems: [], costUsd: 0 };
  }
}

/** The hour a plan is written for: a few minutes ahead, when the learner will likely play it. */
const planTime = (learner: Learner, now: number, aheadMin: number) =>
  localTime(new Date(now + aheadMin * 60_000), learner.timezone);

export interface Written<T> {
  readonly value: T;
  readonly hour: number;
  readonly costUsd: number;
  readonly repaired: boolean;
}

/** The learner's next story: the outline for `unit`, then its first episode. */
export async function writeStory(
  client: Anthropic,
  ctx: StoryContext,
  unit: Unit,
  due: readonly string[],
  aheadMin: number,
): Promise<Written<NewStory> | null> {
  const t = planTime(ctx.learner, ctx.now, aheadMin);
  let cost = 0;
  let repair: string | undefined;
  let outline: StoryOutline | null = null;
  for (let attempt = 0; attempt < 3 && outline === null; attempt++) {
    const r = await structured<unknown>(client, {
      model: OPUS,
      system: [SHARED, STORY_ROLE],
      user: storyInput(ctx, unit, due, t, repair),
      schema: STORY_SCHEMA,
      effort: 'medium',
    });
    cost += r.costUsd;
    const parsed = NewStory.safeParse(r.json);
    if (!parsed.success) {
      console.warn('story schema', { error: parsed.error.message.slice(0, 300) });
      repair = `The JSON did not match the schema: ${parsed.error.message.slice(0, 400)}`;
      continue;
    }
    const problems = attempt === 0 ? repeatsStories(parsed.data.outline, ctx.pastStories) : [];
    if (problems.length === 0) outline = { ...parsed.data.outline, unit_id: unit.id };
    else {
      console.warn('story repair', { problems });
      repair = problems.join('\n');
    }
  }
  if (outline === null) return null;
  // Episode 1 follows on from the last scenes the learner played, before this story.
  const before = [...ctx.paintings.slice(0, 2)].reverse();
  const scene = await planScene(client, ctx, outline, unit, due, 1, before, aheadMin);
  if (scene === null) return null;
  return {
    value: { outline, scene: scene.value },
    hour: scene.hour,
    costUsd: cost + scene.costUsd,
    repaired: repair !== undefined || scene.repaired,
  };
}

/** The plan for episode `episode` (1-based) of a story under way, checked before it is kept. */
export async function planScene(
  client: Anthropic,
  ctx: StoryContext,
  outline: StoryOutline,
  unit: Unit,
  due: readonly string[],
  episode: number,
  played: readonly Painting[],
  aheadMin: number,
): Promise<Written<MomentPlan> | null> {
  const t = planTime(ctx.learner, ctx.now, aheadMin);
  let cost = 0;
  let repair: string | undefined;
  let best: MomentPlan | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    // Scenes are written by Sonnet: fast enough to be ready before the scene before ends; the
    // critic and the code checks hold the quality line.
    const r = await structured<unknown>(client, {
      model: SONNET,
      system: [SHARED, SCENE_ROLE],
      user: sceneInput(ctx, outline, unit, due, episode, played, t, repair),
      schema: MOMENT_SCHEMA,
      effort: 'medium',
    });
    cost += r.costUsd;
    const parsed = MomentPlan.safeParse(r.json);
    if (!parsed.success) {
      console.warn('plan schema', { error: parsed.error.message.slice(0, 300) });
      repair = `The JSON did not match the schema: ${parsed.error.message.slice(0, 400)}`;
      continue;
    }
    // The curriculum's fields are the curriculum's, whatever the plan wrote.
    const plan = {
      ...parsed.data,
      unit_id: unit.id,
      episode,
      stage_aimed: ctx.stage,
      companion: ctx.companion,
      target_chunks: [...unit.chunks],
      recycled_chunks: [...due],
    } as MomentPlan;
    const { hard, soft } = checkPlan(plan, t, ctx.stage);
    if (soft.length) console.warn('plan soft problems', { soft: soft.map((p) => p.slice(0, 120)) });
    const open = residentIn(plan.place, plan.variant, t.hour);
    if (hard.length > 0 && attempt < 2) {
      console.warn('plan repair', { problems: hard.map((p) => p.slice(0, 160)) });
      repair = [...hard, ...soft].join('\n');
      if (open) best = plan;
      continue;
    }
    if (!open) continue;
    // The rules code can't see: one critic pass, one repair.
    if (attempt === 0) {
      const c = await critic(client, plan, ctx, played);
      cost += c.costUsd;
      if (c.problems.length > 0) {
        console.warn('plan critic', { problems: c.problems.map((p) => p.slice(0, 160)) });
        repair = c.problems.join('\n');
        best = plan;
        continue;
      }
    }
    return { value: plan, hour: t.hour, costUsd: cost, repaired: attempt > 0 };
  }
  return best ? { value: best, hour: t.hour, costUsd: cost, repaired: true } : null;
}

export interface SpokenLine {
  readonly who: 'learner' | 'character';
  readonly text: string;
}

/** Rewrites the next episode's way in so it follows on from the episode just played. */
export async function followOn(
  client: Anthropic,
  input: {
    readonly outline: StoryOutline;
    readonly last: MomentPlan;
    readonly lines: readonly SpokenLine[];
    readonly next: MomentPlan;
    readonly learnerName: string | null;
    readonly firstLanguage: string;
  },
): Promise<{ plan: MomentPlan; costUsd: number } | null> {
  const companion = CAST[input.last.companion].name;
  const transcript = input.lines
    .slice(-16)
    .map((l) => `${l.who === 'learner' ? 'LEARNER' : companion.toUpperCase()}: ${l.text}`)
    .join('\n');
  const { next } = input;
  const r = await structured<unknown>(client, {
    model: SONNET,
    system: [FOLLOW_SYSTEM],
    effort: 'low',
    maxTokens: 3_000,
    schema: FOLLOW_SCHEMA,
    user: [
      `THE STORY: "${input.outline.title}": ${input.outline.logline}`,
      `THE LEARNER: ${input.learnerName ?? 'name not known'}; stage ${next.stage_aimed}; first language ${LANGUAGE_NAMES[input.firstLanguage] ?? input.firstLanguage}.`,
      `THE SCENE JUST PLAYED: "${input.last.title_open}". It was meant to end on: ${input.last.ending}`,
      `WHAT WAS REALLY SAID (speech recognition; the end of the scene):\n${transcript || '(nothing: the learner left at once)'}`,
      `THE NEXT SCENE'S WAY IN, TO REWRITE:\n${str({
        brief: next.brief,
        brief_gloss: next.brief_gloss,
        situation: next.situation,
        opening_line: next.opening_line,
        opening_gloss: next.opening_gloss,
        callbacks: next.callbacks,
        first_task: next.beats[1]?.goal,
      })}`,
    ].join('\n\n'),
  });
  const parsed = FollowOn.safeParse(r.json);
  if (!parsed.success) return null;
  const f = parsed.data;
  return {
    plan: {
      ...next,
      brief: { ...next.brief, recap: f.brief_recap, happening: f.brief_happening },
      brief_gloss: f.brief_gloss,
      situation: f.situation,
      opening_line: f.opening_line,
      opening_gloss: f.opening_gloss,
      callbacks: f.callbacks,
    },
    costUsd: r.costUsd,
  };
}

/** Whether a ready plan can still be played at this local hour (its place is open). */
export const playableAt = (plan: MomentPlan, hour: number): boolean =>
  residentIn(plan.place, plan.variant, hour);

export const placeName = (plan: MomentPlan) => PLACES[plan.place].name;
