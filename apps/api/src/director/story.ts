import { isPlaceId, PLACES } from '@yapling/scene';
import { z } from 'zod';

import { clip } from './clip';

import type { MomentPlan } from './moment';

/*
 * A story: five scenes (four for a Visitor) with a shape, a twist and a payoff, built on what the
 * learner told the town. The director writes the outline and the first scene in one go; each next
 * scene is written while the learner plays the one before, and rewritten lightly once that one is
 * played so it follows on from what really happened.
 */

/** The neighbours a story can be about (everyone in the bible). */
export const NEIGHBOURS = [
  'pip',
  'linh',
  'mei',
  'sol',
  'hank',
  'nell',
  'bea',
  'dex',
  'mags',
] as const;
const CastId = z.enum(NEIGHBOURS);

export const StoryScene = z.object({
  place: z.string().refine(isPlaceId),
  purpose: clip(400),
  dramatic_question: clip(300),
  situation: clip(600),
  learner_does: clip(400),
  the_turn: clip(400),
  ends_with: clip(400),
});
export type StoryScene = z.infer<typeof StoryScene>;

/** The kinds of story, so the next one is never the same kind as the last few. */
export const STORY_KINDS = [
  'mystery',
  'mix_up',
  'rescue',
  'competition',
  'big_day',
  'secret',
  'journey',
  'mentoring',
  'rivals_to_friends',
  'new_arrival',
  'repair',
  'discovery',
  'celebration',
] as const;

export const StoryOutline = z.object({
  title: clip(80).pipe(z.string().min(1)),
  kind: z.enum(STORY_KINDS),
  grows: clip(500),
  logline: clip(500),
  why_this_learner: clip(600),
  emotional_core: clip(500),
  pip_arc: clip(400),
  learning_spine: clip(600),
  central: CastId,
  scenes: z.array(StoryScene).min(3).max(6),
  plants: z
    .array(
      z.object({
        plant: clip(300),
        planted_in: z.number().int(),
        payoff: clip(300),
      }),
    )
    .transform((a) => a.slice(0, 3)),
  twist: clip(500),
  finale_payoff: clip(500),
  epilogue: clip(400),
  town_now: z.array(z.object({ who: CastId, doing: clip(300) })).transform((a) => a.slice(0, 9)),
});
export type StoryOutline = z.infer<typeof StoryOutline>;

export const NewStory = z.object({ outline: StoryOutline });
export type NewStory = { outline: StoryOutline; scene: MomentPlan };

const STORY_SCENE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...Object.keys(StoryScene.shape)],
  properties: {
    place: { type: 'string', enum: [...Object.keys(PLACES)] },
    purpose: { type: 'string', description: 'What this scene does for the story.' },
    dramatic_question: { type: 'string' },
    situation: { type: 'string', description: 'What is already happening when we arrive.' },
    learner_does: {
      type: 'string',
      description: 'The main thing the learner does with English here, as a can-do.',
    },
    the_turn: { type: 'string', description: 'What changes in the middle.' },
    ends_with: {
      type: 'string',
      description: 'How it ends and what pulls the learner into the next scene.',
    },
  },
} as const;

export const STORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['outline'],
  properties: {
    outline: {
      type: 'object',
      additionalProperties: false,
      required: [...Object.keys(StoryOutline.shape)],
      properties: {
        title: { type: 'string', description: 'The story’s name, 2–6 words, Title Case.' },
        kind: {
          type: 'string',
          enum: [...STORY_KINDS],
          description: 'What kind of story it is; never a kind used in the last three stories.',
        },
        grows: {
          type: 'string',
          description:
            'How this story moves the learner’s journey on from the last ones: a bigger role, a deeper friendship, a harder kind of conversation, a new part of town.',
        },
        logline: { type: 'string', description: 'The whole story in two sentences.' },
        why_this_learner: {
          type: 'string',
          description:
            'How this story is built on what the learner told us: their reason for English, the hard situation it rehearses, the interests it uses.',
        },
        emotional_core: { type: 'string' },
        pip_arc: { type: 'string', description: 'Pip’s own small arc through this story.' },
        learning_spine: {
          type: 'string',
          description: 'How the speaking tasks climb across the scenes, ending on the hard one.',
        },
        central: { type: 'string', enum: [...NEIGHBOURS] },
        scenes: { type: 'array', items: STORY_SCENE_SCHEMA },
        plants: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['plant', 'planted_in', 'payoff'],
            properties: {
              plant: {
                type: 'string',
                description: 'Something the learner says or chooses early.',
              },
              planted_in: { type: 'integer' },
              payoff: { type: 'string', description: 'How it matters in the finale.' },
            },
          },
        },
        twist: { type: 'string', description: 'The kind twist, in which scene, set up where.' },
        finale_payoff: { type: 'string' },
        epilogue: {
          type: 'string',
          description: 'Pip’s last word after the finale, with one small thread for next time.',
        },
        town_now: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['who', 'doing'],
            properties: {
              who: { type: 'string', enum: [...NEIGHBOURS] },
              doing: {
                type: 'string',
                description:
                  'What this neighbour is up to while the story runs, for when the learner drops in on them.',
              },
            },
          },
        },
      },
    },
  },
} as const;

/** What the learner's last scene changed, written into the next one before it plays. */
export const FollowOn = z.object({
  bridge_card: clip(80),
  bridge_line: clip(300),
  recap_line: clip(300),
  situation: clip(600),
  opening_line: clip(400),
  opening_gloss: clip(600),
  callbacks: z.array(clip(300)).transform((a) => a.slice(0, 6)),
});
export type FollowOn = z.infer<typeof FollowOn>;

export const FOLLOW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...Object.keys(FollowOn.shape)],
  properties: {
    bridge_card: { type: 'string' },
    bridge_line: { type: 'string' },
    recap_line: { type: 'string' },
    situation: { type: 'string' },
    opening_line: { type: 'string' },
    opening_gloss: { type: 'string' },
    callbacks: { type: 'array', items: { type: 'string' } },
  },
} as const;

/** How many scenes a story has, from its outline. */
export const sceneCount = (outline: StoryOutline): number => outline.scenes.length;

/** The chapter line on the bridge: "The Crate With No Name · 2 of 5". */
export const chapterLine = (outline: StoryOutline, sceneNo: number): string =>
  `${outline.title} · ${sceneNo} of ${sceneCount(outline)}`.slice(0, 80);

/** What makes a new story a rerun of recent ones: the same kind, the same central neighbour. */
export function repeatsStories(outline: StoryOutline, past: readonly StoryOutline[]): string[] {
  const problems: string[] = [];
  const kinds = past.slice(0, 3).map((o) => o.kind);
  if (kinds.includes(outline.kind))
    problems.push(
      `The last stories were of kinds ${kinds.join(', ')}; choose another kind than "${outline.kind}".`,
    );
  if (past.slice(0, 2).some((o) => o.central === outline.central))
    problems.push(
      `${outline.central} was at the centre of one of the last two stories; centre this one on someone else.`,
    );
  const titleWords = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3),
    );
  const mine = titleWords(outline.title);
  const echo = past.find((o) => [...titleWords(o.title)].filter((w) => mine.has(w)).length >= 2);
  if (echo) problems.push(`The title echoes an earlier story ("${echo.title}"); make it new.`);
  return problems;
}
