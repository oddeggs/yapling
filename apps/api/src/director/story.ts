import { isPlaceId, PLACES } from '@yapling/scene';
import { z } from 'zod';

import { clip } from './clip';
import type { MomentPlan } from './moment';
import type { Stage } from './world';

/*
 * A story: one curriculum unit told in five episodes (four at Visitor), with the learner's
 * companion beside them throughout. The director writes the outline once; each episode is planned
 * while the one before plays, then its way in is rewritten from what really happened.
 */

/** The neighbours a story can bring in as guests. */
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

/** The kinds of story, so the next one is never the same kind as the last few. */
export const STORY_KINDS = [
  'small_crisis',
  'favour',
  'big_day',
  'mix_up',
  'first_time',
  'surprise',
  'repair',
  'celebration',
  'new_arrival',
  'competition',
] as const;

export const StoryScene = z.object({
  episode: z.number().int(),
  place: z.string().refine(isPlaceId),
  situation: clip(500),
  learner_does: clip(400),
  guest: z.enum([...NEIGHBOURS, 'none']),
  the_turn: clip(400),
  ends_with: clip(400),
});
export type StoryScene = z.infer<typeof StoryScene>;

export const StoryOutline = z.object({
  title: clip(80).pipe(z.string().min(1)),
  unit_id: clip(4),
  kind: z.enum(STORY_KINDS),
  grows: clip(400),
  logline: clip(500),
  why_this_learner: clip(600),
  emotional_core: clip(400),
  companion_arc: clip(400),
  scenes: z.array(StoryScene).min(3).max(6),
  twist: clip(400),
  finale_payoff: clip(400),
  epilogue: clip(300),
});
/** The outline as kept: the stage it was written for is stored with it. */
export type StoryOutline = z.infer<typeof StoryOutline> & { readonly stage?: Stage };

export const NewStory = z.object({ outline: StoryOutline });
export type NewStory = { outline: StoryOutline; scene: MomentPlan };

const s = (description: string) => ({ type: 'string', description }) as const;

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
        title: s('The story’s name, 2–6 words, Title Case.'),
        unit_id: s('The unit id given.'),
        kind: { type: 'string', enum: [...STORY_KINDS] },
        grows: s('How this story moves the learner on from the last ones.'),
        logline: s('The whole story in two plain sentences.'),
        why_this_learner: s(
          'How it is built on their goal, their hard situation, job and interests.',
        ),
        emotional_core: s('What the companion or guest feels, and how the learner helps.'),
        companion_arc: s('The companion’s own small step in this story.'),
        scenes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [...Object.keys(StoryScene.shape)],
            properties: {
              episode: { type: 'integer' },
              place: { type: 'string', enum: [...Object.keys(PLACES)] },
              situation: s('What is happening, simple and concrete.'),
              learner_does: s('The episode’s speaking task, using the unit’s language.'),
              guest: { type: 'string', enum: [...NEIGHBOURS, 'none'] },
              the_turn: s('What changes in the middle, or empty.'),
              ends_with: s('The consequence and the step into the next episode.'),
            },
          },
        },
        twist: s('The kind turn in episode 3, and where it is set up.'),
        finale_payoff: s('How the payoff lands because of what the learner said.'),
        epilogue: s('The companion’s last word, with one small thread for next time.'),
      },
    },
  },
} as const;

/** What the learner's last scene changed, written into the next one before it plays. */
export const FollowOn = z.object({
  brief_recap: clip(220),
  brief_happening: clip(260),
  brief_gloss: clip(900),
  situation: clip(500),
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
    brief_recap: { type: 'string' },
    brief_happening: { type: 'string' },
    brief_gloss: { type: 'string' },
    situation: { type: 'string' },
    opening_line: { type: 'string' },
    opening_gloss: { type: 'string' },
    callbacks: { type: 'array', items: { type: 'string' } },
  },
} as const;

/** The chapter line on the card: "Sixty Buns · How much is it? · 2 of 4". */
export const chapterLine = (outline: StoryOutline, unitTitle: string | null, sceneNo: number) =>
  [outline.title, unitTitle, `${sceneNo} of ${outline.scenes.length}`]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 80);

/** What makes a new story a rerun of recent ones: the same kind, an echoing title. */
export function repeatsStories(outline: StoryOutline, past: readonly StoryOutline[]): string[] {
  const problems: string[] = [];
  const kinds = past.slice(0, 3).map((o) => o.kind);
  if (kinds.includes(outline.kind))
    problems.push(
      `The last stories were of kinds ${kinds.join(', ')}; choose another kind than "${outline.kind}".`,
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
