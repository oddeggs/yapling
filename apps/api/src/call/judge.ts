import type { ErrorTargetBrief } from '@yapling/story';
import { z } from 'zod';

import type { Outcome } from './control';
import { upstream } from './upstream';

/*
 * Jev, the turn judge: one request per learner turn asks every typed question about it at once
 * (how the turn went, a yes/no per active error target, whether they asked to hear the line again
 * or slower, and the crisis screen) and answers with probabilities, never prose. It runs beside the
 * listener's reply, not before it; when it is late or down, the reply's own case stands.
 *
 * The question wording, the model version and every threshold come from the spike that measured
 * them (`spikes/jev/REPORT.md`, `questions.mts`, `tasks.mts`, `prod-request.mts`): change one only
 * with a rerun of its labelled set (`test/call/fixtures/jev-recorded.json`).
 *
 * Only the turn is sent: the line before it, what the beat hoped for and what was heard.
 */

export const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
/** Thresholds belong to this version. */
export const JEV_MODEL = 'jev-1.13.0';
/** Jev answers in ~90 ms (P90 110–166 ms) from US West; past this, the reply's case stands. */
export const JEV_TIMEOUT_MS = 800;

/** Decision thresholds, tuned in the spike (REPORT.md, "Decision rules"). */
export const THRESHOLDS = {
  /** `garbled` at or over this: unclear, whatever the outcome question says. */
  garbled: 0.5,
  /** Fine needs p(fine), averaged over both option orders, and `hoped` at or over these. */
  fine: 0.5,
  hoped: 0.5,
  /** A fine turn with a target this likely is a target error (where the beat corrects). */
  target: 0.35,
  /** p(repeat) or p(slower) at or over this replays the last line. */
  again: 0.6,
  /** Crisis when p(crisis) or `preparation` reaches these... */
  crisis: 0.1,
  preparation: 0.5,
  /** ...or when the reply's own safety flag is up and p(crisis) reaches this. */
  crisisWithFlag: 0.05,
  /** A moment stops at once from this p(crisis); under it, a first worry is only asked about. */
  crisisSure: 0.5,
} as const;

// ---- the questions, verbatim from the spike ----

type Question =
  | {
      readonly type: 'choice';
      readonly instructions: string;
      readonly criteria: Record<string, string>;
    }
  | {
      readonly type: 'noul';
      readonly instructions: string;
      readonly criteria?: { readonly true: string; readonly false: string };
    };

const OUTCOME_CRITERIA = {
  fine: 'It does what hoped_for describes, or part of it, in English, in any words: broken grammar, missing words, a single word, a greeting or question around it, or a small speech-recognition slip (a wrong name or place) are fine.',
  unclear:
    "They say they don't know or don't understand, ask to hear it again or slower, answer in Vietnamese, only say hello, or the words make no sense as a reply (garbled speech recognition).",
  question:
    'They ask the character about something else, or talk near the topic, instead of doing what hoped_for describes.',
  off_topic: 'They talk about something unrelated to the conversation.',
  silent: 'Nothing usable: empty, or only hesitation sounds such as um or uh.',
} as const;
type OutcomeOption = keyof typeof OUTCOME_CRITERIA;
const OUTCOME_OPTIONS = Object.keys(OUTCOME_CRITERIA) as OutcomeOption[];

const OUTCOME_INSTRUCTIONS =
  "An English learner whose first language is Vietnamese is in a spoken role-play. learner_said is what speech recognition heard them say right after last_line. hoped_for is what we hoped their reply would do. Which best describes learner_said? A hello, a question back or another topic is not 'fine' unless hoped_for asks for it.";

/** The same options with fine last: Jev leans toward the first option, so both orders are asked. */
const REVERSED: readonly OutcomeOption[] = ['silent', 'off_topic', 'question', 'unclear', 'fine'];

const AGAIN_CRITERIA = {
  repeat:
    'They ask to hear it again: sorry?, pardon?, excuse me?, again please, can you repeat, what did you say, say that again, one more time, or the same in Vietnamese (nói lại).',
  slower:
    'They ask for it slower, or say it was too fast: slowly please, too fast, speak slower, or the same in Vietnamese (chậm thôi, nhanh quá).',
  neither:
    "Anything else: an answer, a question about what a word means, 'I don't know', a 'sorry' that is not asking to hear it again (sorry, I'm late), or a question about what comes next (and what?, what else?, and then?, what now?).",
} as const;

const CARE_CRITERIA = {
  ordinary:
    'Ordinary talk or an everyday worry. Includes dark idioms with no real danger (dying of hunger, my boss will kill me, killing time), films and stories, and sad news about others.',
  heavy:
    'A heavy personal matter, such as a death in the family, serious illness, failing, money trouble or feeling very sad, with no sign the learner may be harmed.',
  crisis:
    'The learner may be in danger: wanting to die or to harm themselves, stated directly or hinted at (saying goodbye, giving belongings away, not being here soon, being a burden, a method or a place to do it), or being hurt or threatened by someone at home.',
} as const;

export const QUESTIONS = {
  outcome: {
    type: 'choice',
    instructions: OUTCOME_INSTRUCTIONS,
    criteria: { ...OUTCOME_CRITERIA },
  },
  outcome_r: {
    type: 'choice',
    instructions: OUTCOME_INSTRUCTIONS,
    criteria: Object.fromEntries(REVERSED.map((k) => [k, OUTCOME_CRITERIA[k]])),
  },
  hoped: {
    type: 'noul',
    instructions:
      'Does learner_said do what hoped_for describes, or part of it, in English? Any words count: broken grammar, a single word, a greeting around it or a small speech-recognition slip are fine. A hello alone, a question about something else, Vietnamese, "I don\'t know" or garbled words do not.',
  },
  garbled: {
    type: 'noul',
    instructions:
      'learner_said comes from speech recognition of a Vietnamese learner speaking English. Is it garbled: English words that make no sense together as a reply to last_line (speech recognition mishearing), rather than a reply a person could mean, however broken or short?',
    criteria: {
      true: 'Garbled: the words do not fit together or do not fit the conversation, as when speech recognition mishears accented speech.',
      false:
        'A reply a person could mean, even with broken grammar, missing words, one word, a question back, another topic, or Vietnamese.',
    },
  },
  again: {
    type: 'choice',
    instructions:
      'A learner of English just heard last_line in a practice call. learner_said is what they said back (from speech recognition; it may be Vietnamese). Are they asking to hear last_line again?',
    criteria: { ...AGAIN_CRITERIA },
  },
  care: {
    type: 'choice',
    instructions:
      "learner_said is what a Vietnamese learner of English said in a spoken English practice call with an AI character, in broken English or Vietnamese. Which kind of thing did they say? Judge the real meaning, not single words: exaggerated everyday idioms about being hungry, busy, tired or annoyed are ordinary, and so is a story, a film or someone else's death. Crisis is about the learner's own safety.",
    criteria: { ...CARE_CRITERIA },
  },
  preparation: {
    type: 'noul',
    instructions:
      'learner_said is what a Vietnamese learner of English said in a spoken practice call, often in broken English or Vietnamese. Could the learner be planning or preparing to end their life or seriously harm themselves? Look for indirect signs as well as plain words: a place, time or means chosen to be alone, such as a bridge, a rooftop or water at night; giving belongings or pets away for good; saying goodbye or that this is the last time; saying they will soon not be here. A sign counts unless learner_said gives it an ordinary reason (a trip, a move, a story, a game, a swim).',
    criteria: {
      true: 'At least one sign of planning or preparing to end their own life or harm themselves, stated or indirect, with no ordinary reason given.',
      false: 'No such sign, or each one has an ordinary reason in learner_said.',
    },
  },
} as const satisfies Record<string, Question>;

/** One yes/no per active error target, named `target_<id>`. */
export const targetQuestion = (description: string): Question => ({
  type: 'noul',
  instructions: `Does learner_said make this English mistake: ${description}?`,
  criteria: {
    true: `It makes this mistake at least once: ${description}.`,
    false: 'It does not make this mistake (other mistakes do not count).',
  },
});

// ---- the turn and the decision ----

export interface TurnToJudge {
  /** The line just before the learner's turn, as "<Name>: <text>"; null when there was none. */
  readonly lastLine: string | null;
  /** What the beat hoped the learner would do (`answer.expects`). */
  readonly hoped: string;
  /** What was heard. */
  readonly said: string;
  /** The learner's active error targets. */
  readonly targets: readonly ErrorTargetBrief[];
}

export type AgainAsk = 'repeat' | 'slower';

export interface Judgement {
  /** How the turn went; `target_error` wherever a target fired, even on a beat that accepts it. */
  readonly outcome: Outcome;
  /** The most likely target for a target error, else null. */
  readonly targetId: string | null;
  /** They asked to hear the last line again, or slower. */
  readonly again: AgainAsk | null;
  /** Jev's own crisis rule (the reply's flag is weighed in `isCrisis`). */
  readonly crisis: boolean;
  readonly probabilities: {
    /** p(fine), the average over both option orders. */
    readonly fine: number;
    readonly hoped: number;
    readonly garbled: number;
    readonly targets: Readonly<Record<string, number>>;
    readonly repeat: number;
    readonly slower: number;
    readonly crisis: number;
    readonly preparation: number;
  };
  readonly ms: number;
  readonly inputTokens: number;
}

/** The answers the rules read, parsed from Jev's response. */
export interface JevAnswers {
  readonly outcome: Readonly<Record<OutcomeOption, number>>;
  readonly outcome_r: Readonly<Record<OutcomeOption, number>>;
  readonly hoped: number;
  readonly garbled: number;
  readonly targets: Readonly<Record<string, number>>;
  readonly again: Readonly<Record<keyof typeof AGAIN_CRITERIA, number>>;
  readonly care: Readonly<Record<keyof typeof CARE_CRITERIA, number>>;
  readonly preparation: number;
}

const argmax = <K extends string>(p: Readonly<Record<K, number>>, keys: readonly K[]): K =>
  keys.reduce((best, k) => (p[k] > p[best] ? k : best));

/** The decision rules (REPORT.md): pure, so the recorded answers test them without a network. */
export function decide(a: JevAnswers): Omit<Judgement, 'ms' | 'inputTokens'> {
  const p = Object.fromEntries(
    OUTCOME_OPTIONS.map((k) => [k, (a.outcome[k] + a.outcome_r[k]) / 2]),
  ) as Record<OutcomeOption, number>;
  let outcome: Outcome;
  let targetId: string | null = null;
  if (a.garbled >= THRESHOLDS.garbled) {
    outcome = 'unclear';
  } else if (p.fine >= THRESHOLDS.fine && a.hoped >= THRESHOLDS.hoped) {
    outcome = 'fine';
    const ids = Object.keys(a.targets);
    if (ids.length > 0) {
      const top = argmax(a.targets, ids);
      if ((a.targets[top] ?? 0) >= THRESHOLDS.target) {
        outcome = 'target_error';
        targetId = top;
      }
    }
  } else {
    outcome = argmax(
      p,
      OUTCOME_OPTIONS.filter((k) => k !== 'fine'),
    );
  }
  const { repeat, slower } = a.again;
  const again =
    Math.max(repeat, slower) < THRESHOLDS.again ? null : repeat >= slower ? 'repeat' : 'slower';
  const crisis = a.care.crisis >= THRESHOLDS.crisis || a.preparation >= THRESHOLDS.preparation;
  return {
    outcome,
    targetId,
    again,
    crisis,
    probabilities: {
      fine: p.fine,
      hoped: a.hoped,
      garbled: a.garbled,
      targets: a.targets,
      repeat,
      slower,
      crisis: a.care.crisis,
      preparation: a.preparation,
    },
  };
}

/** The crisis rule with the reply's own safety flag weighed in (Jev answered). */
export function isCrisis(judgement: Pick<Judgement, 'crisis' | 'probabilities'>, flagged: boolean) {
  return (
    judgement.crisis || (flagged && judgement.probabilities.crisis >= THRESHOLDS.crisisWithFlag)
  );
}

/** How worried a moment is about a turn: stop now, or first ask if they're okay. */
export type Concern = 'crisis' | 'worry';

/**
 * A clear danger, or a plan or a method, stops a moment at once. A borderline turn (often a
 * misheard line: "All right, I'm out") is a worry: the character asks if they're okay, and a
 * second worry in a row stops the moment.
 */
export function concernOf(
  judgement: Pick<Judgement, 'crisis' | 'probabilities'>,
  flagged: boolean,
): Concern | null {
  const p = judgement.probabilities;
  if (p.crisis >= THRESHOLDS.crisisSure || p.preparation >= THRESHOLDS.preparation) return 'crisis';
  return isCrisis(judgement, flagged) ? 'worry' : null;
}

// ---- the request ----

export type JudgeFailure =
  | 'missing_key'
  | 'timeout'
  | 'rate_limited'
  | 'overloaded'
  | 'provider_error'
  | 'transport_error'
  | 'invalid_response';

export interface JudgeOptions {
  readonly apiKey: string | undefined;
  readonly timeoutMs?: number;
  /** Aborts the request (the turn was dropped). */
  readonly signal?: AbortSignal;
}

/** The request body for a turn: the state and every question, in one call. */
export function judgeRequest(turn: TurnToJudge): {
  model: string;
  state: Record<string, string>;
  questions: Record<string, Question>;
} {
  const questions: Record<string, Question> = { ...QUESTIONS };
  for (const t of turn.targets) questions[`target_${t.id}`] = targetQuestion(t.description);
  return {
    model: JEV_MODEL,
    state: { last_line: turn.lastLine ?? '', hoped_for: turn.hoped, learner_said: turn.said },
    questions,
  };
}

const probability = z.number().min(0).max(1);
const choice = <K extends string>(keys: readonly K[]) =>
  z.object({
    probabilities: z.object(
      Object.fromEntries(keys.map((k) => [k, probability])) as Record<K, typeof probability>,
    ),
  });
const noul = z.object({ noul: probability });
const tokenCount = z.number().int().min(0).catch(0);

/** Reads Jev's response; null when any asked question has no usable answer. */
export function parseAnswers(
  json: unknown,
  targets: readonly ErrorTargetBrief[],
): { answers: JevAnswers; inputTokens: number } | null {
  const target = Object.fromEntries(targets.map((t) => [`target_${t.id}`, noul]));
  const schema = z.object({
    answers: z.object({
      outcome: choice(OUTCOME_OPTIONS),
      outcome_r: choice(OUTCOME_OPTIONS),
      hoped: noul,
      garbled: noul,
      again: choice(Object.keys(AGAIN_CRITERIA) as (keyof typeof AGAIN_CRITERIA)[]),
      care: choice(Object.keys(CARE_CRITERIA) as (keyof typeof CARE_CRITERIA)[]),
      preparation: noul,
      ...target,
    }),
    usage: z.object({ input_tokens: tokenCount }).catch({ input_tokens: 0 }),
  });
  const parsed = schema.safeParse(json);
  if (!parsed.success) return null;
  const a = parsed.data.answers as unknown as Record<string, { noul: number }>;
  const { answers } = parsed.data;
  return {
    answers: {
      outcome: answers.outcome.probabilities,
      outcome_r: answers.outcome_r.probabilities,
      hoped: answers.hoped.noul,
      garbled: answers.garbled.noul,
      targets: Object.fromEntries(targets.map((t) => [t.id, a[`target_${t.id}`]?.noul ?? 0])),
      again: answers.again.probabilities,
      care: answers.care.probabilities,
      preparation: answers.preparation.noul,
    },
    inputTokens: parsed.data.usage.input_tokens,
  };
}

const failureFor = (status: number): JudgeFailure =>
  status === 429 ? 'rate_limited' : status === 529 ? 'overloaded' : 'provider_error';

const isTimeout = (error: unknown) =>
  error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');

/**
 * Judges one learner turn with one Jev request. Never throws: no answer in time, or an answer
 * the rules can't read, is logged and returns null, and the reply's own case stands.
 */
export async function judgeTurn(
  turn: TurnToJudge,
  options: JudgeOptions,
): Promise<Judgement | null> {
  const start = Date.now();
  const fail = (reason: JudgeFailure): null => {
    if (!options.signal?.aborted) {
      console.warn('call judge unavailable', { reason, ms: Date.now() - start });
    }
    return null;
  };
  if (!options.apiKey) return fail('missing_key');
  const timeout = AbortSignal.timeout(options.timeoutMs ?? JEV_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  let json: unknown;
  try {
    const response = await upstream.fetch(JEV_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${options.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(judgeRequest(turn)),
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      return fail(failureFor(response.status));
    }
    json = await response.json();
  } catch (error) {
    return fail(isTimeout(error) ? 'timeout' : 'transport_error');
  }
  const parsed = parseAnswers(json, turn.targets);
  if (parsed === null) return fail('invalid_response');
  return { ...decide(parsed.answers), ms: Date.now() - start, inputTokens: parsed.inputTokens };
}
