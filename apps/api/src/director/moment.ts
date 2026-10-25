import { isPlaceId, PLACES, type PlaceId } from '@yapling/scene';
import { z } from 'zod';

import { STAGES, type Stage } from './world';

/*
 * A moment: one conversation in one place, planned for one learner. In a story it is one scene.
 * The director writes it; the live call plays it one beat at a time, after Pip's line on the way
 * there; the judge reads what happened.
 */

export const Beat = z.object({
  what_happens: z.string().max(600),
  goal: z.string().max(300),
  is_door: z.boolean(),
  example_line: z.string().max(400),
  if_struggling: z.string().max(400),
  if_strong: z.string().max(400),
});
export type Beat = z.infer<typeof Beat>;

export const MomentPlan = z.object({
  title_open: z.string().min(1).max(80),
  title_close: z.string().min(1).max(80),
  place: z.string().refine(isPlaceId),
  variant: z.number().int().min(0).max(2),
  stage_aimed: z.enum(STAGES),
  bridge_card: z.string().max(80),
  bridge_line: z.string().max(300),
  recap_line: z.string().max(300),
  situation: z.string().max(600),
  character_wants: z.string().max(400),
  dramatic_question: z.string().max(300),
  hook: z.string().max(600),
  opening_line: z.string().max(400),
  opening_gloss: z.string().max(600),
  beats: z.array(Beat).min(1).max(6),
  the_turn: z.string().max(400),
  target_phrases: z.array(z.string().max(80)).max(6),
  target_errors: z.array(z.string().max(160)).max(2),
  personal_threads_used: z.array(z.string().max(300)).max(6),
  callbacks: z.array(z.string().max(300)).max(6),
  culture_touch: z.string().max(400),
  pip_learns: z.string().max(200),
  ending: z.string().max(400),
  open_threads_after: z.array(z.string().max(300)).max(2),
  director_notes: z.string().max(800),
});
export type MomentPlan = z.infer<typeof MomentPlan> & { place: PlaceId };

const BEAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['what_happens', 'goal', 'is_door', 'example_line', 'if_struggling', 'if_strong'],
  properties: {
    what_happens: {
      type: 'string',
      description: 'What happens in this beat of the story, and what the neighbour does.',
    },
    goal: {
      type: 'string',
      description:
        'What the learner does with English in this beat, as a can-do the story needs ("explain to Mei why the sign is upside down"). The beat is done when they have done it.',
    },
    is_door: {
      type: 'boolean',
      description: 'True for the beat that invites the learner’s own life in.',
    },
    example_line: {
      type: 'string',
      description: 'One neighbour line for this beat at the aimed stage, within the word limit.',
    },
    if_struggling: {
      type: 'string',
      description:
        'The same beat for a learner who is lost: one sentence, at most 8 words, with two short choices they can repeat.',
    },
    if_strong: {
      type: 'string',
      description:
        'The same beat for a strong speaker: an open why/how question they could talk about for a minute.',
    },
  },
} as const;

/** The scene plan's JSON schema (structured output). */
export const MOMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...Object.keys(MomentPlan.shape)],
  properties: {
    title_open: {
      type: 'string',
      description: 'The painting title the scene opens with, wry, 2–6 words, Title Case.',
    },
    title_close: {
      type: 'string',
      description:
        'The painting title it closes with, the one the learner keeps: wry, 2–6 words, Title Case, true whatever the learner says.',
    },
    place: { type: 'string', enum: [...Object.keys(PLACES)] },
    variant: { type: 'integer', description: 'Which of the place’s three variants is painted.' },
    stage_aimed: { type: 'string', enum: [...STAGES] },
    bridge_card: {
      type: 'string',
      description:
        'The caption over the new place as the learner arrives: when and where, at most 8 words ("A little later, at the harbour").',
    },
    bridge_line: {
      type: 'string',
      description:
        'What Pip says on the way there, walking with the learner, so they know why they are going and what is at stake: one or two short sentences at the learner’s stage (Visitor at most 10 words). Empty when Pip is the scene’s own neighbour.',
    },
    recap_line: {
      type: 'string',
      description:
        'What Pip says instead if the learner comes back after a long time away: what happened last time in one sentence, then why we are going here. Same length rule. Empty for a story’s first scene.',
    },
    situation: {
      type: 'string',
      description: 'What is already happening at the place when the learner arrives.',
    },
    character_wants: {
      type: 'string',
      description: 'What the neighbour wants in this scene, and what they secretly feel.',
    },
    dramatic_question: {
      type: 'string',
      description: 'The question this scene answers ("Will Mei let someone help her?").',
    },
    hook: { type: 'string', description: 'Why the learner can’t help leaning in.' },
    opening_line: {
      type: 'string',
      description:
        'The neighbour’s whole first turn, spoken as written when the scene opens, without a speaker prefix: in the middle of the situation, turning to the learner for a reason, ending with something the learner must answer. Within the word limit plus six.',
    },
    opening_gloss: {
      type: 'string',
      description:
        'The opening line in the learner’s first language, natural and short, for the caption under it; empty when that is English or unknown.',
    },
    beats: { type: 'array', items: BEAT_SCHEMA },
    the_turn: {
      type: 'string',
      description: 'What changes in the middle of the scene, and in which beat.',
    },
    target_phrases: {
      type: 'array',
      items: { type: 'string' },
      description: '2–5 English chunks the learner gets real chances to use in this scene.',
    },
    target_errors: { type: 'array', items: { type: 'string' } },
    personal_threads_used: {
      type: 'array',
      items: { type: 'string' },
      description: 'What we know about the learner that this scene uses, and how.',
    },
    callbacks: {
      type: 'array',
      items: { type: 'string' },
      description: 'Things the learner said or did before that this scene brings back.',
    },
    culture_touch: {
      type: 'string',
      description:
        'How the learner’s own country or culture comes in this time (one small thing), or an empty string when it doesn’t.',
    },
    pip_learns: {
      type: 'string',
      description: 'What the neighbour hopes to learn from the learner in this scene.',
    },
    ending: {
      type: 'string',
      description:
        'How the scene closes: what changed because of what the learner said, then the next step of the story, said by the neighbour.',
    },
    open_threads_after: { type: 'array', items: { type: 'string' } },
    director_notes: {
      type: 'string',
      description: 'Notes for the actor: the feeling of the scene, what to listen for.',
    },
  },
} as const;

export const speakerOf = (plan: Pick<MomentPlan, 'place'>) => PLACES[plan.place].resident;

export const isStage = (x: unknown): x is Stage =>
  typeof x === 'string' && (STAGES as readonly string[]).includes(x);
