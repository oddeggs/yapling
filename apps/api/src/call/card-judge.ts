import { z } from 'zod';

import { JEV_MODEL, JEV_TIMEOUT_MS, JEV_URL, type JudgeFailure, type JudgeOptions } from './judge';
import { upstream } from './upstream';

/*
 * Jev's card question, for a card turn whose words didn't match: which card did the learner most
 * likely read, even if speech recognition misheard it as similar-sounding words? Asked only for an
 * English try (text with Vietnamese marks never is: without that check Jev passes "Trà" as "Tea").
 * The state is the spike's (the cards and what was heard), so its threshold holds. "Again" and
 * "slowly" were read before this, by the phrase list.
 *
 * Wording and threshold from the turn judge spike (`spikes/jev/tasks.mts`, candidate 4): a card at
 * p ≥ 0.75 rescued 70 of 90 misheard reads with no false pass.
 */

/** A card at or over this passes the turn. */
export const CARD_THRESHOLD = 0.75;

const cardQuestion = (two: boolean) => ({
  type: 'choice' as const,
  instructions: two
    ? 'A beginner learner of English was shown two cards, card_a and card_b, and asked to read one aloud. learner_said is what speech recognition heard; accented speech is often written down as similar-sounding words. Which card did they most likely say?'
    : 'A beginner learner of English was shown card_a and asked to read it aloud. learner_said is what speech recognition heard; accented speech is often written down as similar-sounding words. Did they most likely say the card?',
  criteria: {
    card_a: 'They said card_a, even if speech recognition misheard it as similar-sounding words.',
    ...(two
      ? {
          card_b:
            'They said card_b, even if speech recognition misheard it as similar-sounding words.',
        }
      : {}),
    neither:
      'They said something else: other English words, Vietnamese, or a different number or word.',
  },
});

export interface CardToJudge {
  /** The cards as shown, one or two (names filled in). */
  readonly cards: readonly string[];
  readonly said: string;
}

export interface CardJudgement {
  /** The card read (0 or 1), or null for neither or below the threshold. */
  readonly card: number | null;
  readonly probabilities: { readonly cards: readonly number[]; readonly neither: number };
  readonly ms: number;
  readonly inputTokens: number;
}

export function cardRequest(turn: CardToJudge) {
  const two = turn.cards.length > 1;
  return {
    model: JEV_MODEL,
    state: {
      card_a: turn.cards[0] ?? '',
      ...(two ? { card_b: turn.cards[1] ?? '' } : {}),
      learner_said: turn.said,
    },
    questions: { card: cardQuestion(two) },
  };
}

const probability = z.number().min(0).max(1);

export function parseCard(json: unknown, two: boolean): Omit<CardJudgement, 'ms'> | null {
  const schema = z.object({
    answers: z.object({
      card: z.object({
        probabilities: z.object({
          card_a: probability,
          card_b: two ? probability : probability.optional(),
          neither: probability,
        }),
      }),
    }),
    usage: z.object({ input_tokens: z.number().int().min(0).catch(0) }).catch({ input_tokens: 0 }),
  });
  const parsed = schema.safeParse(json);
  if (!parsed.success) return null;
  const card = parsed.data.answers.card.probabilities;
  const cards = two ? [card.card_a, card.card_b ?? 0] : [card.card_a];
  const best = cards.reduce((b, p, i) => (p > (cards[b] ?? 0) ? i : b), 0);
  return {
    card: (cards[best] ?? 0) >= CARD_THRESHOLD ? best : null,
    probabilities: { cards, neither: card.neither },
    inputTokens: parsed.data.usage.input_tokens,
  };
}

/** Asks Jev which card was read. Never throws: no answer in time is logged and returns null. */
export async function judgeCard(
  turn: CardToJudge,
  options: JudgeOptions,
): Promise<CardJudgement | null> {
  const start = Date.now();
  const fail = (reason: JudgeFailure): null => {
    if (!options.signal?.aborted) {
      console.warn('call card judge unavailable', { reason, ms: Date.now() - start });
    }
    return null;
  };
  if (!options.apiKey) return fail('missing_key');
  if (turn.cards.length === 0) return null;
  const timeout = AbortSignal.timeout(options.timeoutMs ?? JEV_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  let json: unknown;
  try {
    const response = await upstream.fetch(JEV_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${options.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(cardRequest(turn)),
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      return fail(response.status === 429 ? 'rate_limited' : 'provider_error');
    }
    json = await response.json();
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return fail(timedOut ? 'timeout' : 'transport_error');
  }
  const parsed = parseCard(json, turn.cards.length > 1);
  if (parsed === null) return fail('invalid_response');
  return { ...parsed, ms: Date.now() - start };
}
