import type Anthropic from '@anthropic-ai/sdk';

/*
 * One structured Claude call for the director and the judge: a cached system prompt, JSON out
 * through the response schema, usage priced in dollars.
 */

export const OPUS = 'claude-opus-5-5';
export const SONNET = 'claude-sonnet-5-5';
export const HAIKU = 'claude-haiku-5-5';

/** $ per million tokens: input, output, cache write, cache read. */
const PRICE: Readonly<Record<string, readonly [number, number, number, number]>> = {
  [HAIKU]: [0.1, 0.5, 0.125, 0.01],
  [SONNET]: [2, 10, 2.5, 0.2],
  [OPUS]: [4, 20, 5, 0.2],
};

export interface StructuredCall {
  readonly model: string;
  readonly system: readonly string[];
  readonly user: string;
  readonly schema: Record<string, unknown>;
  readonly effort: 'low' | 'medium' | 'high';
  readonly maxTokens?: number;
}

export interface StructuredResult<T> {
  readonly json: T | null;
  readonly text: string;
  readonly costUsd: number;
  readonly ms: number;
}

export async function structured<T>(
  client: Anthropic,
  call: StructuredCall,
): Promise<StructuredResult<T>> {
  const started = Date.now();
  // Each block is cached on its own, so prompts that share a first block share its cache.
  const system: Anthropic.TextBlockParam[] = call.system.map((text) => ({
    type: 'text',
    text,
    cache_control: { type: 'ephemeral' as const },
  }));
  // Streamed, so a long plan keeps bytes flowing: a quiet request is cut at 100 s.
  const message = await client.messages
    .stream({
      model: call.model,
      max_tokens: call.maxTokens ?? 16_000,
      system,
      messages: [{ role: 'user', content: call.user }],
      output_config: { effort: call.effort, format: { type: 'json_schema', schema: call.schema } },
    })
    .finalMessage();
  const u = message.usage;
  const p = PRICE[call.model] ?? PRICE[SONNET]!;
  const costUsd =
    (u.input_tokens * p[0] +
      u.output_tokens * p[1] +
      (u.cache_creation_input_tokens ?? 0) * p[2] +
      (u.cache_read_input_tokens ?? 0) * p[3]) /
    1e6;
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  let json: T | null = null;
  try {
    json = JSON.parse(text) as T;
  } catch {
    json = null;
  }
  return { json, text, costUsd, ms: Date.now() - started };
}

export const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
