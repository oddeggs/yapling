import type { JevAnswers } from '../../src/call/judge';
import recorded from './fixtures/jev-recorded.json';

/*
 * Jev's answers for the tests: the recorded answers of the turn judge spike (jev-1.13.0, three
 * runs per case, `fixtures/jev-recorded.json`) in the shape the rules read, and Jev's wire format
 * for the provider fake. No test reaches the network.
 */

type Probs5 = [number, number, number, number, number];

export interface OutcomeCase {
  readonly id: string;
  readonly set: 'main' | 'holdout';
  readonly beat: string;
  readonly said: string;
  /** The labelled outcome; `alsoOk` lists others a careful reader would accept. */
  readonly label: string;
  readonly alsoOk?: readonly string[];
  /** Whether the case was asked with the two targets (final_s, past_ed). */
  readonly targets: boolean;
  readonly runs: readonly {
    readonly outcome: Probs5;
    readonly outcome_r: Probs5;
    readonly hoped: number;
    readonly garbled: number;
    readonly targets?: readonly [number, number];
    /** Haiku's outcome on the call path, same turn. */
    readonly haiku: string;
  }[];
}

export interface AgainCase {
  readonly id: string;
  readonly said: string;
  readonly label: 'repeat' | 'slower' | 'neither';
  readonly alsoOk?: readonly string[];
  /** [repeat, slower, neither] per run. */
  readonly runs: readonly (readonly [number, number, number])[];
}

export interface CrisisCase {
  readonly id: string;
  readonly said: string;
  readonly label: 'crisis' | 'ok';
  readonly runs: readonly {
    /** [ordinary, heavy, crisis] */
    readonly care: readonly [number, number, number];
    readonly preparation: number;
    /** Haiku's control-line safety flag on the same turn. */
    readonly haikuFlag: boolean;
  }[];
}

const fixture = recorded as unknown as {
  outcome: OutcomeCase[];
  again: AgainCase[];
  crisis: CrisisCase[];
};
export const OUTCOME_CASES = fixture.outcome;
export const AGAIN_CASES = fixture.again;
export const CRISIS_CASES = fixture.crisis;

const ORDER = ['fine', 'unclear', 'question', 'off_topic', 'silent'] as const;
const keyed = (p: Probs5) =>
  Object.fromEntries(ORDER.map((k, i) => [k, p[i] ?? 0])) as Record<(typeof ORDER)[number], number>;

/** Neutral answers for the questions a set did not ask. */
const QUIET = {
  again: { repeat: 0, slower: 0, neither: 1 },
  care: { ordinary: 1, heavy: 0, crisis: 0 },
  preparation: 0.02,
};

export function outcomeAnswers(run: OutcomeCase['runs'][number]): JevAnswers {
  return {
    outcome: keyed(run.outcome),
    outcome_r: keyed(run.outcome_r),
    hoped: run.hoped,
    garbled: run.garbled,
    targets: run.targets ? { final_s: run.targets[0], past_ed: run.targets[1] } : {},
    ...QUIET,
  };
}

const FINE: JevAnswers = {
  outcome: { fine: 0.95, unclear: 0.02, question: 0.02, off_topic: 0.01, silent: 0 },
  outcome_r: { fine: 0.95, unclear: 0.02, question: 0.02, off_topic: 0.01, silent: 0 },
  hoped: 0.92,
  garbled: 0.04,
  targets: {},
  ...QUIET,
};

export function againAnswers(run: AgainCase['runs'][number]): JevAnswers {
  return { ...FINE, again: { repeat: run[0], slower: run[1], neither: run[2] } };
}

export function crisisAnswers(run: CrisisCase['runs'][number]): JevAnswers {
  const [ordinary, heavy, crisis] = run.care;
  return { ...FINE, care: { ordinary, heavy, crisis }, preparation: run.preparation };
}

/** What a test turn should get from Jev; anything left out is a clear, fine, harmless turn. */
export interface JevScript {
  /** The most likely outcome, at 0.9. */
  readonly outcome?: 'fine' | 'unclear' | 'question' | 'off_topic' | 'silent';
  readonly hoped?: number;
  readonly garbled?: number;
  /** p(yes) per target id; unlisted targets get 0.02. */
  readonly targets?: Readonly<Record<string, number>>;
  readonly again?: 'repeat' | 'slower';
  readonly crisis?: number;
  readonly preparation?: number;
}

export function scriptedAnswers(script: JevScript, targetIds: readonly string[]): JevAnswers {
  const top = script.outcome ?? 'fine';
  const outcome = Object.fromEntries(
    ORDER.map((k) => [k, k === top ? 0.9 : 0.025]),
  ) as JevAnswers['outcome'];
  const crisis = script.crisis ?? 0;
  return {
    outcome,
    outcome_r: outcome,
    hoped: script.hoped ?? (top === 'fine' ? 0.9 : 0.1),
    garbled: script.garbled ?? 0.04,
    targets: Object.fromEntries(targetIds.map((id) => [id, script.targets?.[id] ?? 0.02])),
    again:
      script.again === 'repeat'
        ? { repeat: 0.97, slower: 0, neither: 0.03 }
        : script.again === 'slower'
          ? { repeat: 0.02, slower: 0.96, neither: 0.02 }
          : QUIET.again,
    care: { ordinary: 1 - crisis, heavy: 0, crisis },
    preparation: script.preparation ?? 0.02,
  };
}

const choice = (probabilities: Record<string, number>) => {
  const entries = Object.entries(probabilities);
  const [best] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { type: 'choice', choice: best, confidence: 0.9, probabilities };
};
const noul = (p: number) => ({ type: 'noul', noul: p });

/** Jev's response body for some answers. */
export function wire(a: JevAnswers, inputTokens = 1_100): Record<string, unknown> {
  const reversed = ['silent', 'off_topic', 'question', 'unclear', 'fine'] as const;
  return {
    model: 'jev-1.13.0',
    answers: {
      outcome: choice(a.outcome),
      outcome_r: choice(Object.fromEntries(reversed.map((k) => [k, a.outcome_r[k]]))),
      hoped: noul(a.hoped),
      garbled: noul(a.garbled),
      again: choice(a.again),
      care: choice(a.care),
      preparation: noul(a.preparation),
      ...Object.fromEntries(Object.entries(a.targets).map(([id, p]) => [`target_${id}`, noul(p)])),
    },
    usage: { input_tokens: inputTokens, output_tokens: 150 },
  };
}
