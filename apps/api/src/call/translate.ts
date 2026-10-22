import type Anthropic from '@anthropic-ai/sdk';
import type { FirstLanguage, Stage } from '@yapling/contracts';
import { glossPolicy } from '@yapling/domain';
import { glossFor, STORY_LINES } from '@yapling/story';

import { TURN_MODEL, type Usage } from './llm';

/*
 * A spoken line's gloss on a tap: the learner taps a character's line in the call (or in the
 * list of what was said) and sees it in their first language. Lines the story wrote a gloss for
 * use it; anything else (a generated line, a line still waiting for its written gloss) is
 * translated by Haiku once and kept for the rest of the call. Line-level glosses are for the
 * stages that get them (journey §1.8 "Fade by stage"): none from Local, none for `other`.
 */

/** The longest line a tap may ask about: two sentences of a character's turn, with room. */
export const TRANSLATE_TEXT_MAX = 600;
/** Taps answered per call: far more than a learner taps, low enough that nobody farms it. */
export const TRANSLATIONS_PER_CALL = 120;

const LANGUAGE_NAMES: Readonly<Partial<Record<FirstLanguage, string>>> = {
  vi: 'Vietnamese',
  id: 'Indonesian',
  th: 'Thai',
  pt: 'Portuguese',
  es: 'Spanish',
  ja: 'Japanese',
  ko: 'Korean',
  tr: 'Turkish',
};

/** The app's own register in a language, so a translated line sounds like the rest of the app. */
const REGISTER: Readonly<Partial<Record<FirstLanguage, string>>> = {
  vi: ' Warm and peer to peer: the speaker calls themself "mình" and the learner "bạn"; never "tớ", "cậu", "tôi" or "quý khách" unless the line is formal (an office on the phone).',
};

/** Whether a learner at this stage gets a spoken line in their first language on a tap. */
export function lineGlossAllowed(stage: Stage, firstLanguage: FirstLanguage): boolean {
  const policy = glossPolicy(stage, 'captions', { firstLanguage });
  return policy.unit === 'line' && policy.layers.includes('l1');
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

let written: Map<string, (typeof STORY_LINES)[number]['glosses']> | null = null;

/** The story's own gloss for a line it wrote, matched on the caption the phone showed. */
export function writtenGloss(text: string, firstLanguage: FirstLanguage): string | null {
  written ??= new Map(
    STORY_LINES.filter((l) => Object.keys(l.glosses).length > 0).map((l) => [
      squash(l.caption).toLowerCase(),
      l.glosses,
    ]),
  );
  const glosses = written.get(squash(text).toLowerCase());
  return glosses ? glossFor(glosses, firstLanguage) : null;
}

/** Haiku's natural translation of one spoken line, or null when it gives none. */
export async function translateLine(
  client: Anthropic,
  text: string,
  firstLanguage: FirstLanguage,
  usage: Usage,
): Promise<string | null> {
  const language = LANGUAGE_NAMES[firstLanguage];
  if (!language) return null;
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
          properties: { translation: { type: 'string' } },
          required: ['translation'],
          additionalProperties: false,
        },
      },
    },
    system: `You help an English learner in a language-learning app. Translate the line a friendly character just said into short, natural, everyday ${language}, the way a friend would say it. Keep names as they are. Translate only; add no notes.${REGISTER[firstLanguage] ?? ''}`,
    messages: [{ role: 'user', content: `Line: ${JSON.stringify(text)}` }],
  });
  usage.input += message.usage.input_tokens;
  usage.output += message.usage.output_tokens;
  const body = message.content.find((b) => b.type === 'text')?.text ?? '';
  try {
    const parsed = JSON.parse(body) as { translation?: unknown };
    const translation =
      typeof parsed.translation === 'string' ? parsed.translation.trim().slice(0, 2_000) : '';
    return translation || null;
  } catch {
    return null;
  }
}

export interface LineGlossContext {
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  readonly llm: Anthropic;
  readonly usage: Usage;
  /** This call's answers so far, by line. */
  readonly cache: Map<string, string | null>;
}

/** The gloss for a tapped line: the story's, this call's earlier answer, or a fresh one. */
export async function lineGloss(text: string, ctx: LineGlossContext): Promise<string | null> {
  if (!lineGlossAllowed(ctx.stage, ctx.firstLanguage)) return null;
  const key = squash(text);
  if (key === '') return null;
  const known = writtenGloss(key, ctx.firstLanguage);
  if (known !== null) return known;
  if (ctx.cache.has(key)) return ctx.cache.get(key) ?? null;
  const gloss = await translateLine(ctx.llm, key, ctx.firstLanguage, ctx.usage);
  ctx.cache.set(key, gloss);
  return gloss;
}
