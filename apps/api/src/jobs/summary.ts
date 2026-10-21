import type Anthropic from '@anthropic-ai/sdk';
import { CAST, findPhrase, type Scene } from '@yapling/story';
import { z } from 'zod';

import { tokenUsd, PRICES } from '../call/costs';
import type { Usage } from '../call/llm';
import { ERROR_TARGETS } from '../call/targets';
import { isLearnerLine, type TranscriptFile } from '../call/transcript';

/*
 * The post-call read of a transcript by Claude Sonnet 5.5: two wins, one fix, can-do evidence with
 * the neighbour who heard it, recurring errors, phrases used, and what Pip should remember. The
 * model answers in a JSON schema; the job checks every id against the story before using it.
 */

export const SUMMARY_MODEL = 'claude-sonnet-5-5';

const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  vi: 'Vietnamese',
  id: 'Indonesian',
  th: 'Thai',
  pt: 'Portuguese',
  es: 'Spanish',
  ja: 'Japanese',
  ko: 'Korean',
  tr: 'Turkish',
};

export const Draft = z.object({
  wins: z.array(z.string().min(1).max(300)).max(2),
  fix: z
    .object({
      from: z.string().min(1).max(500),
      to: z.string().min(1).max(500),
      targetId: z.string().max(64).nullable(),
      explanation: z.string().max(500).nullable(),
    })
    .nullable(),
  phrasesUsed: z.array(z.string().max(64)).max(20),
  recurringErrors: z.array(z.string().max(64)).max(5),
  canDoEvidence: z
    .array(
      z.object({
        canDoId: z.string().max(64),
        quote: z.string().min(1).max(500),
        witness: z.string().max(16),
      }),
    )
    .max(5),
  memories: z
    .array(
      z.object({
        text: z.string().min(1).max(300),
        category: z.enum(['about_you', 'coming_up', 'about_us']),
      }),
    )
    .max(5),
});
export type Draft = z.infer<typeof Draft>;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['wins', 'fix', 'phrasesUsed', 'recurringErrors', 'canDoEvidence', 'memories'],
  properties: {
    wins: { type: 'array', items: { type: 'string' } },
    fix: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['from', 'to', 'targetId', 'explanation'],
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            targetId: { type: ['string', 'null'] },
            explanation: { type: ['string', 'null'] },
          },
        },
      ],
    },
    phrasesUsed: { type: 'array', items: { type: 'string' } },
    recurringErrors: { type: 'array', items: { type: 'string' } },
    canDoEvidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['canDoId', 'quote', 'witness'],
        properties: {
          canDoId: { type: 'string' },
          quote: { type: 'string' },
          witness: { type: 'string' },
        },
      },
    },
    memories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'category'],
        properties: {
          text: { type: 'string' },
          category: { type: 'string', enum: ['about_you', 'coming_up', 'about_us'] },
        },
      },
    },
  },
} as const;

const SYSTEM = `You read the transcript of a live practice call in Yapling, an app where English learners talk with AI characters in a cosy town. Write the post-call card. Be warm and specific; never mention levels, scores or failure.

- wins: at most two short lines (under 15 words each), in simple English, quoting or naming something the learner actually did well.
- fix: the one most useful correction from what the learner said: "from" is their words, "to" the better way. Prefer one of their target errors when it came up. targetId is that target's id or null. explanation is one short line in the language given (null when none is given). Null when there was nothing worth fixing.
- phrasesUsed: ids from the phrase list that the learner said correctly.
- recurringErrors: ids from the error list the learner made more than once.
- canDoEvidence: for each can-do the learner showed, their own words as the quote, and the id of the character who heard it (from the cast list).
- memories: up to five short facts worth remembering about the learner (job, goals, likes, dated plans), written as "You ..." for about_you, "Your ... on <day>" for coming_up, or shared moments for about_us. Only things the learner said themselves.`;

export interface SummaryResult {
  readonly draft: Draft | null;
  readonly usage: Usage;
  readonly usd: number;
}

export async function summarise(
  client: Anthropic,
  file: TranscriptFile,
  scene: Scene,
  targets: readonly string[],
): Promise<SummaryResult> {
  const language = LANGUAGE_NAMES[file.firstLanguage];
  const englishFixes = ['regular', 'local', 'voice'].includes(file.stage);
  const lines = file.lines
    .map((l) => (isLearnerLine(l) ? `Learner: ${l.text}` : `${CAST[l.speaker].name}: ${l.text}`))
    .join('\n');
  const phrases = scene.phrases
    .map((id) => findPhrase(id))
    .filter((p) => p !== undefined)
    .map((p) => `${p.id}: "${p.en}"`)
    .join('; ');
  const errors = Object.entries(ERROR_TARGETS)
    .map(([id, d]) => `${id}${targets.includes(id) ? ' (active target)' : ''}: ${d}`)
    .join('; ');
  const cast = scene.cast.map((c) => `${c} (${CAST[c].name})`).join(', ');
  const user = [
    `Scene: ${scene.title}. ${scene.summary}`,
    `Goal: ${scene.goal}`,
    `Can-dos: ${scene.canDos.join(', ') || 'none'}`,
    `Cast: ${cast}`,
    `Phrases: ${phrases || 'none'}`,
    `Errors: ${errors}`,
    `Explanation language: ${englishFixes ? 'English' : (language ?? 'none')}`,
    '',
    'Transcript:',
    lines,
  ].join('\n');
  const message = await client.beta.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 4_000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  });
  const usage: Usage = {
    input: message.usage.input_tokens,
    cacheRead: message.usage.cache_read_input_tokens ?? 0,
    cacheWrite: message.usage.cache_creation_input_tokens ?? 0,
    output: message.usage.output_tokens,
  };
  const usd = Math.round(tokenUsd(usage, PRICES.sonnet) * 100_000) / 100_000;
  if (message.stop_reason === 'refusal') return { draft: null, usage, usd };
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  try {
    const parsed = Draft.safeParse(JSON.parse(text));
    return { draft: parsed.success ? parsed.data : null, usage, usd };
  } catch {
    return { draft: null, usage, usd };
  }
}
