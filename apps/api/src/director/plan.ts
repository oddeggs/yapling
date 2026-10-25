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

import { ARRIVAL_STAGE, arrivalText, SCENE_CRAFT, STORY_CRAFT } from './craft';
import { structured, words, OPUS, SONNET } from './llm';
import { MOMENT_SCHEMA, MomentPlan, speakerOf } from './moment';
import {
  FOLLOW_SCHEMA,
  FollowOn,
  NewStory,
  repeatsStories,
  STORY_SCHEMA,
  type StoryOutline,
} from './story';
import type { Learner, Painting } from './store';
import { BIBLE, CULTURE_RULES, LEVEL_GUIDE, TURN_WORDS, type Stage } from './world';

/*
 * The director: writes the learner's next story (an outline and its first scene), then each next
 * scene while the learner plays the one before, and a light rewrite of that scene once the one
 * before it is played. Opus writes; code checks a plan and asks once for a repair when it must.
 */

const SHARED = `${BIBLE}

${STORY_CRAFT}

${SCENE_CRAFT}

${CULTURE_RULES}

${LEVEL_GUIDE}`;

const PLAN_RULES = `RULES FOR EVERY SCENE PLAN
- Choose a place open at the hour given (PLACES OPEN NOW) and a variant whose prop serves the scene. The neighbour painted there is the one who speaks; others can be talked about but are not there.
- 3 to 5 beats. Each beat's goal is something the learner does with English that the story needs. Mark one beat is_door when the story naturally needs something from the learner's own life (their work, a dish from home, how they would handle it); never a beat that only asks about them.
- Line limits by stage (count the words): Visitor 8, Newcomer 18, others 25 per neighbour line; the opening may be six words longer. Visitor lines are one sentence. Never two questions in one line.
- Aim the scene at the stage given. Write every if_struggling as a Visitor line (at most 8 words, two short choices to repeat) and every if_strong as an open follow-up a B1–B2 speaker could talk about for a minute: the call switches to those when the learner turns out lower or higher.
- Target phrases are 2–5 English chunks the learner gets real chances to use.
- Only Bea says "love". Pip says "I", never "Pip". No stage directions, actions, asterisks or emoji in any line. No phonetic accents.
- Pip's bridge and recap lines and every neighbour line speak TO the learner ("you said…", "your idea"), never about them by name in the third person.
- At most two open threads after the scene.`;

/** The director's own part of each system prompt; the shared world comes first, cached. */
export const STORY_ROLE = `YOUR JOB: you are the story director for Yapling, an English speaking app. You write the outline of the learner's next STORY in Natterwick. Each scene is planned in full later, one at a time, from your outline and from what the learner really says; a faster model plays each neighbour live, and Pip walks with the learner between scenes.

Return only JSON in the given schema: the outline, with exactly the scene count asked for. Every scene's place must be one in the bible; scene 1 starts the story strongly, where the problem lands.`;

export const SCENE_ROLE = `YOUR JOB: you are the story director for Yapling, an English speaking app. The learner is in the middle of a story in Natterwick. You write the full plan for its NEXT scene, following the outline and what has really happened so far. A faster model plays the neighbour live from your plan, one beat at a time; Pip says your bridge line on the way there.

${PLAN_RULES}

Follow the outline's scene, but what really happened wins: build on what the learner actually said and chose, and keep the plants and the twist on track. Return only JSON in the given schema.`;

export const FOLLOW_SYSTEM = `You keep a story continuous in Yapling, an English speaking app. The learner just played a scene; the next scene was written before it happened. Rewrite only the next scene's way in, so it follows on from what REALLY happened: the bridge caption, Pip's line on the way, Pip's recap for a learner coming back later, the situation as we arrive, and the neighbour's opening line (plus its gloss). Keep the next scene's story, goals and first question; change only what what happened makes untrue or flat. Use one specific thing the learner said or did. Keep the same length limits as the originals. Pip and the neighbour speak TO the learner ("you said…"), never about them by name in the third person. Only Bea says "love"; Pip says "I", never "Pip"; no stage directions. Return only JSON in the given schema.

${BIBLE}`;

const SEEDS = [
  'a windy day; hats and paper keep flying down the lanes',
  'rain since morning; everyone is crowding indoors',
  'the harbour fog horn is stuck and hoots every ten minutes',
  'the lantern festival is in a week and nobody has a theme yet',
  'the bakery made far too many buns',
  'Bus 45 has a new route sign that nobody can read',
  'the library is giving away old maps',
  'the radio tower is looking for a new jingle',
  'the town clock is running ten minutes fast',
  'there is a swap day on Market Lane',
  'a talent show sign-up sheet is up in the square',
  'someone is learning the trumpet, badly, somewhere near the burrow',
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
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
 * The stage to aim at: what the conversations showed once they are sure of it, otherwise the
 * learner's own feel for their level, otherwise Visitor.
 */
export function stageFor(learner: Learner): Stage {
  const judged = stageOfModel(learner);
  const own = learner.arrival ? ARRIVAL_STAGE[learner.arrival.level] : undefined;
  if (judged && (learner.model?.confidence !== 'low' || own === undefined)) return judged;
  return own ?? judged ?? 'visitor';
}

/** The story so far, for the director: earlier stories and the scenes played in this one. */
export interface StoryContext {
  readonly learner: Learner;
  /** What the learner told the town (their memory page), newest first. */
  readonly memories: readonly string[];
  /** Earlier paintings, newest first. */
  readonly paintings: readonly Painting[];
  /** Earlier stories' outlines, newest first. */
  readonly pastStories: readonly StoryOutline[];
  /** The plans of the last moments played, newest first. */
  readonly recent: readonly MomentPlan[];
  readonly played: number;
  readonly now: number;
}

function townInput(t: LocalTime, seed: string): string[] {
  const date = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
  const open = openPlaces(t.hour)
    .map((p) => `${p.place} (variants ${p.variants.join(', ')})`)
    .join('; ');
  return [
    `NOW: ${clockLabel(t.hour)} on ${date} on the learner's own clock; the town's weather is ${weatherAt(t)}.`,
    `PLACES OPEN NOW: ${open}.`,
    `TOWN TODAY (use it as texture, or ignore it): ${seed}.`,
  ];
}

function learnerInput(ctx: StoryContext, stage: Stage): string[] {
  const { learner } = ctx;
  return [
    `THE LEARNER, AS THEY INTRODUCED THEMSELVES:\n${arrivalText(learner)}`,
    `AIM AT STAGE: ${stage}. They have played ${ctx.played} conversation(s).`,
    `WHAT THE CONVERSATIONS SHOWED (learner model):\n${learner.model ? str(learner.model) : '(no conversation judged yet)'}`,
    `WHAT THEY TOLD THE TOWN IN CONVERSATION:\n${ctx.memories.length ? ctx.memories.map((m) => `- ${m}`).join('\n') : '(nothing yet)'}`,
  ];
}

const sceneMemory = (p: Painting) => ({
  title: p.title,
  place: p.place,
  with: p.speaker,
  summary: p.record?.summary ?? '(not judged yet)',
  remember: p.record?.remember ?? [],
  learned: p.learned,
});

/** Where the learner is in their long journey, by how many stories they have lived. */
function journeyNote(done: number): string {
  if (done === 0)
    return 'They are brand new: keep it close to home, make them feel welcome and needed, and introduce two or three neighbours.';
  if (done < 3)
    return 'They know a few neighbours now: bring one back, meet someone new, reach a new part of town.';
  if (done < 8)
    return 'They are a regular: neighbours come to them for advice; give them a bigger role and a harder kind of conversation.';
  return 'They are part of the town: they lead, speak for others, welcome newcomers; stories can reach the far edges of Natterwick.';
}

/** The user message for a new story. */
export function storyInput(
  ctx: StoryContext,
  t: LocalTime,
  scenes: number,
  repair?: string,
): string {
  const stage = stageFor(ctx.learner);
  const past = ctx.pastStories.slice(0, 6).map((o) => ({
    title: o.title,
    kind: o.kind,
    central: o.central,
    logline: o.logline,
    grows: o.grows,
    finale: o.finale_payoff,
    epilogue: o.epilogue,
  }));
  return [
    ...townInput(t, SEEDS[hash(`${ctx.learner.userId}#${ctx.played}`) % SEEDS.length]!),
    ...learnerInput(ctx, stage),
    `THE JOURNEY SO FAR: this is story number ${ctx.pastStories.length + 1}. ${journeyNote(ctx.pastStories.length)}`,
    `EARLIER STORIES (newest first; the new one is a different kind, centred on someone else than the last two, grows from them, may bring back their people and things, and may pick up the last epilogue's thread):\n${past.length ? str(past) : '(none: this is their first story)'}`,
    `RECENT SCENES (newest first):\n${ctx.paintings.length ? str(ctx.paintings.slice(0, 4).map(sceneMemory)) : ctx.played > 0 ? '(their first conversation: they just met Pip in the burrow, and Pip wants to go out and see the town with them)' : '(none)'}`,
    `WRITE A STORY OF ${scenes} SCENES.`,
    repair
      ? `YOUR LAST ANSWER FAILED THE CHECK. Fix this and return the whole answer again:\n${repair}`
      : 'Write the story and its first scene.',
  ].join('\n\n');
}

/** The user message for the next scene of a story. */
export function sceneInput(
  ctx: StoryContext,
  outline: StoryOutline,
  sceneNo: number,
  played: readonly Painting[],
  t: LocalTime,
  repair?: string,
): string {
  const stage = stageFor(ctx.learner);
  return [
    ...townInput(t, SEEDS[hash(`${ctx.learner.userId}#${ctx.played}`) % SEEDS.length]!),
    ...learnerInput(ctx, stage),
    `THE STORY (outline):\n${str(outline)}`,
    `THE SCENES PLAYED SO FAR IN THIS STORY (oldest first):\n${played.length ? str(played.map(sceneMemory)) : '(none yet)'}`,
    `THE LAST SCENE'S PLAN ENDED ON: ${ctx.recent[0]?.ending ?? '(nothing)'}`,
    `PLAN SCENE ${sceneNo} OF ${outline.scenes.length}${sceneNo === outline.scenes.length ? ' (THE FINALE: pay off the plants and the emotional core)' : ''}. Its outline: ${str(outline.scenes[sceneNo - 1])}`,
    repair
      ? `YOUR LAST PLAN FAILED THE CHECK. Fix this and return the whole plan again:\n${repair}`
      : 'Plan the scene.',
  ].join('\n\n');
}

/**
 * What a plan must not break: an open place, a playable count of beats. Soft problems (a long
 * line) are fixed only if a repair is asked for anyway.
 */
export function checkPlan(plan: MomentPlan, t: LocalTime): { hard: string[]; soft: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];
  if (!residentIn(plan.place, plan.variant, t.hour)) {
    hard.push(
      `${plan.place} variant ${plan.variant} has nobody in at ${clockLabel(t.hour)}; choose a place open now.`,
    );
  }
  if (plan.beats.length < 3 || plan.beats.length > 5) hard.push('Write 3 to 5 beats.');
  const limit = TURN_WORDS[plan.stage_aimed];
  const lines = [plan.opening_line, ...plan.beats.map((b) => b.example_line)];
  lines.forEach((line, i) => {
    const max = i === 0 ? limit + 6 : limit;
    const n = words(line.replace(/^[A-Z][\w ]{0,20}:\s*/, ''));
    if (n > max) soft.push(`This line has ${n} words, over the ${max}-word limit: ${line}`);
  });
  if (plan.open_threads_after.length > 2) soft.push('At most two open threads after.');
  const speaker = speakerOf(plan);
  const all = [...lines, plan.bridge_line, plan.recap_line].join(' ');
  if (speaker !== 'bea' && /\blove\b/i.test(all)) soft.push('Only Bea says "love"; take it out.');
  if (/\bPip\b/.test([plan.bridge_line, plan.recap_line].join(' ')))
    soft.push('Pip says "I", never its own name, in its bridge and recap lines.');
  return { hard, soft };
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

async function writeChecked<T>(
  client: Anthropic,
  call: {
    role: string;
    schema: Record<string, unknown>;
    input: (repair?: string) => string;
    planOf: (value: T) => MomentPlan;
  },
  parse: (json: unknown) => { success: true; data: T } | { success: false; error: Error },
  t: LocalTime,
  extra: (value: T) => string[] = () => [],
): Promise<Written<T> | null> {
  let cost = 0;
  let repair: string | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await structured<unknown>(client, {
      model: OPUS,
      system: [SHARED, call.role],
      user: call.input(repair),
      schema: call.schema,
      effort: 'medium',
    });
    cost += r.costUsd;
    const parsed = parse(r.json);
    if (!parsed.success) {
      repair = `The JSON did not match the schema: ${parsed.error.message.slice(0, 400)}`;
      continue;
    }
    const plan = call.planOf(parsed.data);
    const checked = checkPlan(plan, t);
    const soft = checked.soft;
    // A rerun of a recent story is sent back once; after that it is played.
    const hard = [...checked.hard, ...(attempt === 0 ? extra(parsed.data) : [])];
    if (soft.length) console.warn('plan soft problems', { soft: soft.map((p) => p.slice(0, 120)) });
    if (hard.length === 0) {
      return { value: parsed.data, hour: t.hour, costUsd: cost, repaired: attempt > 0 };
    }
    console.warn('plan repair', { problems: hard.map((p) => p.slice(0, 160)) });
    repair = [...hard, ...soft].join('\n');
  }
  return null;
}

/** The learner's next story: its outline, then the plan for its first scene. */
export async function writeStory(
  client: Anthropic,
  ctx: StoryContext,
  aheadMin: number,
): Promise<Written<NewStory> | null> {
  const t = planTime(ctx.learner, ctx.now, aheadMin);
  const scenes = stageFor(ctx.learner) === 'visitor' ? 4 : 5;
  let cost = 0;
  let repair: string | undefined;
  let outline: StoryOutline | null = null;
  for (let attempt = 0; attempt < 3 && outline === null; attempt++) {
    const r = await structured<unknown>(client, {
      model: OPUS,
      system: [SHARED, STORY_ROLE],
      user: storyInput(ctx, t, scenes, repair),
      schema: STORY_SCHEMA,
      effort: 'medium',
    });
    cost += r.costUsd;
    const parsed = NewStory.safeParse(r.json);
    if (!parsed.success) {
      repair = `The JSON did not match the schema: ${parsed.error.message.slice(0, 400)}`;
      continue;
    }
    // A rerun of a recent story is sent back once; after that it is told.
    const problems = attempt === 0 ? repeatsStories(parsed.data.outline, ctx.pastStories) : [];
    if (problems.length === 0) outline = parsed.data.outline as StoryOutline;
    else {
      console.warn('story repair', { problems });
      repair = problems.join('\n');
    }
  }
  if (outline === null) return null;
  const scene = await planScene(client, ctx, outline, 1, [], aheadMin);
  if (scene === null) return null;
  return {
    value: { outline, scene: scene.value },
    hour: scene.hour,
    costUsd: cost + scene.costUsd,
    repaired: repair !== undefined || scene.repaired,
  };
}

/** The plan for scene `sceneNo` (1-based) of a story under way. */
export async function planScene(
  client: Anthropic,
  ctx: StoryContext,
  outline: StoryOutline,
  sceneNo: number,
  played: readonly Painting[],
  aheadMin: number,
): Promise<Written<MomentPlan> | null> {
  const t = planTime(ctx.learner, ctx.now, aheadMin);
  return writeChecked(
    client,
    {
      role: SCENE_ROLE,
      schema: MOMENT_SCHEMA,
      input: (repair) => sceneInput(ctx, outline, sceneNo, played, t, repair),
      planOf: (plan) => plan,
    },
    (json) => {
      const r = MomentPlan.safeParse(json);
      return r.success
        ? { success: true, data: r.data as MomentPlan }
        : { success: false, error: r.error };
    },
    t,
  );
}

export interface SpokenLine {
  readonly who: 'learner' | 'character';
  readonly text: string;
}

/** Rewrites the next scene's way in so it follows on from the scene just played. */
export async function followOn(
  client: Anthropic,
  input: {
    readonly outline: StoryOutline;
    readonly last: MomentPlan;
    readonly lines: readonly SpokenLine[];
    readonly next: MomentPlan;
    readonly learnerName: string | null;
  },
): Promise<{ plan: MomentPlan; costUsd: number } | null> {
  const speaker = PLACES[input.last.place].resident;
  const transcript = input.lines
    .slice(-16)
    .map((l) => `${l.who === 'learner' ? 'LEARNER' : speaker.toUpperCase()}: ${l.text}`)
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
      `THE LEARNER: ${input.learnerName ?? 'name not known'}; stage ${next.stage_aimed}.`,
      `THE SCENE JUST PLAYED: "${input.last.title_open}" at ${input.last.place}. It was meant to end on: ${input.last.ending}`,
      `WHAT WAS REALLY SAID (speech recognition; the end of the scene):\n${transcript || '(nothing: the learner left at once)'}`,
      `THE NEXT SCENE'S WAY IN, TO REWRITE:\n${str({
        place: next.place,
        neighbour: speakerOf(next),
        bridge_card: next.bridge_card,
        bridge_line: next.bridge_line,
        recap_line: next.recap_line,
        situation: next.situation,
        opening_line: next.opening_line,
        opening_gloss: next.opening_gloss,
        callbacks: next.callbacks,
        first_beat_goal: next.beats[0]?.goal,
      })}`,
    ].join('\n\n'),
  });
  const parsed = FollowOn.safeParse(r.json);
  if (!parsed.success) return null;
  return { plan: { ...next, ...parsed.data }, costUsd: r.costUsd };
}

/** Whether a ready plan can still be played at this local hour (its resident is in). */
export const playableAt = (plan: MomentPlan, hour: number): boolean =>
  residentIn(plan.place, plan.variant, hour);

export const placeName = (plan: MomentPlan) => PLACES[plan.place].name;
