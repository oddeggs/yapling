import Anthropic from '@anthropic-ai/sdk';
import type { CharacterId } from '@yapling/contracts';
import { CAST, personaPrompt, sceneBrief, type Scene } from '@yapling/story';

import type { LearnerContext } from './learner';
import { isLearnerLine, type TranscriptLine } from './transcript';
import { upstream } from './upstream';

/*
 * Claude for the live turns: Haiku 5.5, thinking off, low effort, a cached persona prefix per
 * character. The system prompt is the persona's static prefix (identical for every learner) and
 * the learner's suffix (stage, scene, due phrases, targets), both cached; what this one turn must
 * do goes last, as a mid-conversation system message, so the cached prefix never changes.
 */

export const TURN_MODEL = 'claude-haiku-5-5';
/** Spoken reply (≤ 25 words) plus the control line. */
const TURN_MAX_TOKENS = 220;
/** Identical requests raced per turn; the first to stream text wins. */
export const HEDGE = 2;

export function anthropicClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    maxRetries: 1,
    fetch: (input: string | URL | Request, init?: RequestInit) => upstream.fetch(input, init),
  });
}

export interface Usage {
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
}

export const noUsage = (): Usage => ({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0 });

/** The cached system blocks for a character in this call. */
export function systemFor(
  character: CharacterId,
  scene: Scene,
  learner: LearnerContext,
): Anthropic.TextBlockParam[] {
  const prompt = personaPrompt(character, {
    stage: learner.stage,
    scene: sceneBrief(scene),
    learnerName: learner.name,
    duePhrases: learner.duePhrases.map((p) => p.text),
    targets: learner.targets,
    firstLanguage: learner.firstLanguage,
  });
  return [
    { type: 'text', text: prompt.cached, cache_control: { type: 'ephemeral' } },
    {
      type: 'text',
      text: `${prompt.dynamic}\n\nThe learner's words come from speech recognition and may hold small recognition mistakes; guess the meaning kindly. Lines from other characters in the scene appear as [Name] in the conversation.`,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

const nameOf = (character: CharacterId): string => CAST[character].name;

/** The conversation as one character sees it: their own lines as assistant turns. */
export function messagesFor(
  speaker: CharacterId,
  transcript: readonly TranscriptLine[],
  direction: string,
): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  const add = (role: 'user' | 'assistant', text: string) => {
    const last = out.at(-1);
    if (last && last.role === role && typeof last.content === 'string') {
      last.content = `${last.content}\n${text}`;
    } else {
      out.push({ role, content: text });
    }
  };
  for (const line of transcript) {
    if (isLearnerLine(line)) add('user', line.text);
    else if (line.speaker === speaker) add('assistant', line.text);
    else add('user', `[${nameOf(line.speaker)}] ${line.text}`);
  }
  if (out[0]?.role !== 'user') out.unshift({ role: 'user', content: '(The call connects.)' });
  if (out.at(-1)?.role !== 'user') add('user', '(The learner is listening.)');
  out.push({ role: 'system', content: direction });
  return out;
}

export function turnParams(
  system: Anthropic.TextBlockParam[],
  messages: Anthropic.MessageParam[],
): Anthropic.MessageStreamParams {
  return {
    model: TURN_MODEL,
    max_tokens: TURN_MAX_TOKENS,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low' },
    cache_control: { type: 'ephemeral' },
    system,
    messages,
  };
}

/** Writes a character's prefix to the cache and warms the connection before the first turn. */
export async function prewarm(
  client: Anthropic,
  system: Anthropic.TextBlockParam[],
  usage: Usage,
): Promise<void> {
  const message = await client.messages.create({
    model: TURN_MODEL,
    max_tokens: 0,
    system,
    messages: [{ role: 'user', content: '(call connected)' }],
  });
  usage.input += message.usage.input_tokens;
  usage.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;
  usage.cacheRead += message.usage.cache_read_input_tokens ?? 0;
}

export interface Explained {
  readonly simple: string;
  readonly gloss: string | null;
}

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

/** "What does that mean?" for a line nobody wrote a meaning for: simple English, then the L1. */
export async function explain(
  client: Anthropic,
  about: string,
  firstLanguage: string,
  usage: Usage,
): Promise<Explained> {
  const language = LANGUAGE_NAMES[firstLanguage] ?? null;
  const message = await client.messages.create({
    model: TURN_MODEL,
    max_tokens: 300,
    thinking: { type: 'disabled' },
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { simple: { type: 'string' }, gloss: { type: ['string', 'null'] } },
          required: ['simple', 'gloss'],
          additionalProperties: false,
        },
      },
    },
    system:
      'You help an English learner in a language-learning app. Explain what an English line means in very simple English (one short sentence, under 15 words, no grammar terms), then give a short natural translation of the line.',
    messages: [
      {
        role: 'user',
        content: `Line: ${JSON.stringify(about)}\nTranslation language: ${language ?? 'none (answer null)'}`,
      },
    ],
  });
  usage.input += message.usage.input_tokens;
  usage.output += message.usage.output_tokens;
  const text = message.content.find((b) => b.type === 'text')?.text ?? '';
  try {
    const parsed = JSON.parse(text) as { simple?: unknown; gloss?: unknown };
    const simple = typeof parsed.simple === 'string' ? parsed.simple.trim() : '';
    const gloss =
      typeof parsed.gloss === 'string' && language !== null ? parsed.gloss.trim() : null;
    if (simple) return { simple, gloss: gloss || null };
  } catch {
    // fall through
  }
  return { simple: about, gloss: null };
}
