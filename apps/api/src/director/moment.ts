import { isPlaceId, PLACES, type PlaceId } from '@yapling/scene';
import { z } from 'zod';

import { clip } from './clip';
import { STAGES, type Stage } from './world';

/*
 * A moment: one conversation in one place, with the learner's companion (and at most one guest).
 * In a story it is one episode of a curriculum unit: the unit fixes the can-do, the chunks and the
 * strategy; the director writes the situation, the brief, what the learner knows, and the beats.
 */

const NEIGHBOURS = ['pip', 'linh', 'mei', 'sol', 'hank', 'nell', 'bea', 'dex', 'mags'] as const;
const short = <T extends z.ZodTypeAny>(item: T, n: number) =>
  z.array(item).transform((a) => a.slice(0, n));

export const Beat = z.object({
  kind: z.enum(['open', 'success_first', 'task', 'turn', 'close']),
  speaker: z.enum(['companion', 'guest']),
  what_happens: clip(500),
  goal: clip(300),
  example_line: clip(300),
  rescue: clip(300),
});
export type Beat = z.infer<typeof Beat>;

export const Brief = z.object({
  recap: clip(220),
  where: clip(120),
  happening: clip(260),
  your_role: clip(160),
  tasks: short(clip(140), 3),
  try_saying: short(clip(80), 2),
});
export type Brief = z.infer<typeof Brief>;

export const MomentPlan = z.object({
  title_open: clip(80).pipe(z.string().min(1)),
  title_close: clip(80).pipe(z.string().min(1)),
  place: z.string().refine(isPlaceId),
  variant: z
    .number()
    .int()
    .transform((v) => Math.min(2, Math.max(0, v))),
  stage_aimed: z.enum(STAGES),
  companion: z.enum(NEIGHBOURS),
  unit_id: clip(4),
  episode: z.number().int(),
  brief: Brief,
  brief_gloss: clip(900),
  situation: clip(500),
  why_the_learner: clip(300),
  knowledge_ledger: short(z.object({ fact: clip(200), source: z.enum(['L', 'B', 'S', 'W']) }), 12),
  guest: z.enum([...NEIGHBOURS, 'none']),
  guest_intro: clip(200),
  guest_how: z.enum(['here', 'phone', 'voicemail', 'none']),
  gap: clip(300),
  opening_line: clip(400),
  opening_gloss: clip(600),
  beats: z.array(Beat).min(1).max(7),
  target_chunks: short(clip(80), 5),
  recycled_chunks: short(clip(80), 3),
  prompt_forms: short(clip(120), 2),
  listening_task: clip(300),
  end_condition: clip(300),
  ending: clip(400),
  companion_learns: clip(200),
  culture_touch: clip(300),
  callbacks: short(clip(300), 6),
  director_notes: clip(600),
});
export type MomentPlan = z.infer<typeof MomentPlan> & { place: PlaceId };

const BEAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...Object.keys(Beat.shape)],
  properties: {
    kind: { type: 'string', enum: ['open', 'success_first', 'task', 'turn', 'close'] },
    speaker: { type: 'string', enum: ['companion', 'guest'] },
    what_happens: { type: 'string', description: 'What happens in this beat.' },
    goal: {
      type: 'string',
      description: 'What the learner does with English here, as a can-do. Done when they did it.',
    },
    example_line: {
      type: 'string',
      description: 'One line for this beat at the learner’s stage, within the word limit.',
    },
    rescue: {
      type: 'string',
      description:
        'If the learner is stuck: a model sentence they can copy, then two short choices. Never answers for them.',
    },
  },
} as const;

const s = (description: string) => ({ type: 'string', description }) as const;
const list = (description: string) =>
  ({ type: 'array', items: { type: 'string' }, description }) as const;

/** The scene plan's JSON schema (structured output). */
export const MOMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...Object.keys(MomentPlan.shape)],
  properties: {
    title_open: s('The painting title the scene opens with, wry, 2–6 words, Title Case.'),
    title_close: s('The title it closes with, the one the learner keeps; true whatever they say.'),
    place: { type: 'string', enum: [...Object.keys(PLACES)] },
    variant: { type: 'integer', description: 'Which of the place’s three variants is painted.' },
    stage_aimed: { type: 'string', enum: [...STAGES] },
    companion: { type: 'string', enum: [...NEIGHBOURS] },
    unit_id: s('The curriculum unit id given.'),
    episode: { type: 'integer', description: 'The episode number given.' },
    brief: {
      type: 'object',
      additionalProperties: false,
      required: [...Object.keys(Brief.shape)],
      properties: {
        recap: s(
          'One sentence: what happened last time, in the second person. Empty for the first episode.',
        ),
        where: s('Where we are, in a few words.'),
        happening: s('What is happening right now, one or two short sentences.'),
        your_role: s(
          'The learner’s role here, in the second person ("You are Mei’s first customer.").',
        ),
        tasks: list('1–3 short tasks the learner will do, in the second person, plain words.'),
        try_saying: list('1–2 of the target chunks to try.'),
      },
    },
    brief_gloss: s(
      'The whole brief in the learner’s first language, natural and short; empty when that is English.',
    ),
    situation: s('What is already happening when the scene opens; follows from the last scene.'),
    why_the_learner: s(
      'Why their voice is needed here: their job, their opinion, a promise from earlier.',
    ),
    knowledge_ledger: {
      type: 'array',
      description:
        'Every fact the scene relies on, with where the learner got it: L their own life or arrival answers, B told in this brief or scene, S said in an earlier scene, W everyday world knowledge.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fact', 'source'],
        properties: {
          fact: { type: 'string' },
          source: { type: 'string', enum: ['L', 'B', 'S', 'W'] },
        },
      },
    },
    guest: {
      type: 'string',
      enum: [...NEIGHBOURS, 'none'],
      description: 'The one guest, or none.',
    },
    guest_intro: s(
      'How the guest is introduced: name, role and relation ("Dex, the manager who made the poster"). Empty for none.',
    ),
    guest_how: { type: 'string', enum: ['here', 'phone', 'voicemail', 'none'] },
    gap: s(
      'The information, opinion or reasoning gap: who holds what, and why the question is real.',
    ),
    opening_line: s(
      'The companion’s first turn, spoken as written: arriving mid-situation, then a question the learner can surely answer. Within the word limit plus six.',
    ),
    opening_gloss: s('The opening line in the learner’s first language; empty when English.'),
    beats: { type: 'array', items: BEAT_SCHEMA },
    target_chunks: list('The unit’s target chunks, as given.'),
    recycled_chunks: list('The chunks due for review, as given.'),
    prompt_forms: list(
      'The 1–2 target forms the companion prompts on if the learner gets them wrong.',
    ),
    listening_task: s(
      'What the learner must catch by ear in this scene, and how the story checks it.',
    ),
    end_condition: s('The outcome that ends the scene, caused by what the learner says.'),
    ending: s('The consequence of what the learner said, then the pull into the next episode.'),
    companion_learns: s('What the companion learns from the learner in this scene.'),
    culture_touch: s('How the learner’s own country comes in (one small thing), or empty.'),
    callbacks: list('Things the learner said or did before that this scene brings back.'),
    director_notes: s('Notes for the actor: the feeling of the scene, what to listen for.'),
  },
} as const;

/** Who speaks in a moment: the learner's companion. */
export const speakerOf = (plan: Pick<MomentPlan, 'companion'>) => plan.companion;

export const isStage = (x: unknown): x is Stage =>
  typeof x === 'string' && (STAGES as readonly string[]).includes(x);
