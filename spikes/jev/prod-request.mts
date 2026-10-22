/* The request the call would send per learner turn: every judgment in one Jev call. */
import { readFileSync, writeFileSync } from 'node:fs';
import { answerOf, lastLineFor, TARGETS } from './context.mts';
import { outcomeV2, outcomeV2r, hopedV2, garbledV1, targetQ } from './questions.mts';
import { TASKS } from './tasks.mts';

export function turnRequest(c: { beat: string; said: string; src?: string; targets?: boolean }) {
  const last = lastLineFor(c.beat, c.src);
  const state = { last_line: last, hoped_for: answerOf(c.beat).expects, learner_said: c.said };
  const questions: Record<string, any> = {
    outcome: outcomeV2, outcome_r: outcomeV2r, hoped: hopedV2, garbled: garbledV1,
    again: TASKS.c3!.questions({}).ask, care: TASKS.c5!.questions({}).care, preparation: TASKS.c5!.questions({}).preparation,
  };
  if (c.targets) for (const t of TARGETS) questions[`target_${t.id}`] = targetQ(t.description);
  return { model: 'jev-1.13.0', state, questions };
}
if (process.argv[2] === 'dump') {
  const set = [...JSON.parse(readFileSync('sets/c1-outcome.json', 'utf8')), ...JSON.parse(readFileSync('sets/c1-holdout.json', 'utf8'))];
  writeFileSync('results/prod-bodies.json', JSON.stringify(set.map(turnRequest)));
  console.log('bodies', set.length);
}
