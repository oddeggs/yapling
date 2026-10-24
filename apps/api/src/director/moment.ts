import { isPlaceId, PLACES, type PlaceId } from '@yapling/scene';
import { z } from 'zod';

import { STAGES, type Stage } from './world';

/*
 * A moment: one conversation in one place, planned for one learner. The director writes it; the
 * live call plays it one beat at a time; the judge reads what happened.
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
  while_you_were_away: z.string().max(600),
  hook: z.string().max(600),
  opening_line: z.string().max(400),
  opening_gloss: z.string().max(600),
  beats: z.array(Beat).min(1).max(6),
  target_phrases: z.array(z.string().max(80)).max(6),
  target_errors: z.array(z.string().max(160)).max(2),
  personal_threads_used: z.array(z.string().max(300)).max(6),
  callbacks: z.array(z.string().max(300)).max(6),
  culture_touch: z.string().max(400),
  pip_learns: z.string().max(200),
  cliffhanger: z.string().max(400),
  open_threads_after: z.array(z.string().max(300)).max(2),
  director_notes: z.string().max(800),
});
export type MomentPlan = z.infer<typeof MomentPlan> & { place: PlaceId };

/** The JSON schema the director writes to (structured output). */
export const MOMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title_open',
    'title_close',
    'place',
    'variant',
    'stage_aimed',
    'while_you_were_away',
    'hook',
    'opening_line',
    'opening_gloss',
    'beats',
    'target_phrases',
    'target_errors',
    'personal_threads_used',
    'callbacks',
    'culture_touch',
    'pip_learns',
    'cliffhanger',
    'open_threads_after',
    'director_notes',
  ],
  properties: {
    title_open: {
      type: 'string',
      description: 'The painting title the moment opens with, wry, 2–6 words, Title Case.',
    },
    title_close: {
      type: 'string',
      description:
        'The painting title it closes with, the one the learner keeps: wry, 2–6 words, Title Case, true whatever the learner says.',
    },
    place: { type: 'string', enum: [...Object.keys(PLACES)] },
    variant: { type: 'integer', description: 'Which of the place’s three variants is painted.' },
    stage_aimed: { type: 'string', enum: [...STAGES] },
    while_you_were_away: { type: 'string' },
    hook: { type: 'string' },
    opening_line: {
      type: 'string',
      description:
        'The resident’s whole first turn, spoken as written when the moment opens, without a speaker prefix: the while-you-were-away moment and the hook, ending with beat 1’s first question. Within the word limit plus six.',
    },
    opening_gloss: {
      type: 'string',
      description:
        'The opening line in the learner’s first language, natural and short, for the caption under it; empty when that is English or unknown.',
    },
    beats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['what_happens', 'goal', 'is_door', 'example_line', 'if_struggling', 'if_strong'],
        properties: {
          what_happens: { type: 'string' },
          goal: {
            type: 'string',
            description:
              'What the learner does in this beat, as a can-do ("say what they would order and why"). The beat is done when they have done it.',
          },
          is_door: {
            type: 'boolean',
            description: 'True for the beat that invites the learner’s own life in.',
          },
          example_line: {
            type: 'string',
            description: 'One resident line, within the word limit.',
          },
          if_struggling: { type: 'string' },
          if_strong: { type: 'string' },
        },
      },
    },
    target_phrases: { type: 'array', items: { type: 'string' } },
    target_errors: { type: 'array', items: { type: 'string' } },
    personal_threads_used: { type: 'array', items: { type: 'string' } },
    callbacks: { type: 'array', items: { type: 'string' } },
    culture_touch: {
      type: 'string',
      description:
        'How the learner’s own country or culture comes in this time (one small thing), or an empty string when it doesn’t.',
    },
    pip_learns: {
      type: 'string',
      description:
        'What the resident hopes to learn from the learner in this moment (a word, a how-to, a fact about their life).',
    },
    cliffhanger: { type: 'string' },
    open_threads_after: { type: 'array', items: { type: 'string' } },
    director_notes: { type: 'string' },
  },
} as const;

export const speakerOf = (plan: Pick<MomentPlan, 'place'>) => PLACES[plan.place].resident;

export const isStage = (x: unknown): x is Stage =>
  typeof x === 'string' && (STAGES as readonly string[]).includes(x);
