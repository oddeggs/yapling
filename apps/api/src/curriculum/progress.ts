import type { Arrival } from '@yapling/contracts';

import { STAGES, type Stage } from '../director/world';
import { UNITS, unitById, type Unit } from './units';

/*
 * Where the learner is in the syllabus: their stage, the units they have lived through as stories,
 * the can-dos the judge saw them do in a free task without rescue, and the chunks due for review.
 * Units are a spiral, not a corridor: the order inside a stage follows what the learner told the
 * town, and they move up on evidence (or when the conversations place them higher).
 */

export interface Progress {
  readonly stage: Stage;
  /** Units told as stories, oldest first. */
  readonly done: readonly string[];
  /** Units whose can-do was seen in a free task without rescue. */
  readonly evidenced: readonly string[];
}

export const START: Progress = { stage: 'visitor', done: [], evidenced: [] };

/** Units the learner's reason for English brings forward (re-ordered, never replaced). */
const PULL_WHY: Readonly<Record<Arrival['why'][number], readonly string[]>> = {
  work: ['B5', 'R3', 'R5', 'B6', 'L2', 'N3'],
  interview: ['V4', 'B8', 'L8', 'R1'],
  travel: ['N3', 'N4', 'B4', 'B6', 'L6', 'V2'],
  move: ['N3', 'N4', 'B4', 'B6', 'L6', 'L1'],
  friends: ['N7', 'B1', 'B7', 'L7', 'C3', 'N2'],
  media: ['N7', 'B2', 'B7', 'L7', 'C3'],
  family: ['N7', 'N8', 'B7', 'R7'],
  study: ['R1', 'R3', 'B3', 'R2'],
  exam: ['B3', 'R1', 'R4', 'L2', 'B8'],
  me: ['B1', 'B2', 'N6'],
};

const PULL_HARD: Readonly<Record<Arrival['hard'][number], readonly string[]>> = {
  meetings: ['B5', 'R3', 'R5', 'C4'],
  small_talk: ['N7', 'B1', 'C1'],
  phone: ['N3', 'B6'],
  fast_speech: ['C1', 'C3'],
  words: ['R2', 'C6'],
  pronunciation: [],
  interviews: ['B8', 'L8'],
  nerves: ['V6', 'R6'],
};

const stageIndex = (s: Stage) => STAGES.indexOf(s);

/** How much a unit is pulled forward for this learner. */
function pull(unit: Unit, arrival: Arrival | null): number {
  if (!arrival) return 0;
  let n = 0;
  for (const w of arrival.why) if (PULL_WHY[w].includes(unit.id)) n += 2;
  for (const h of arrival.hard) if (PULL_HARD[h].includes(unit.id)) n += 1;
  return n;
}

/**
 * The stage to teach at: the learner's own progress, lifted to where the conversations place them
 * (never lowered by one quiet story).
 */
export function teachingStage(progress: Progress, placed: Stage): Stage {
  return stageIndex(placed) > stageIndex(progress.stage) ? placed : progress.stage;
}

/**
 * The next unit to tell as a story: the stage's units not yet told, those the learner's goals pull
 * first, then in the syllabus's own order. When a stage is told through, the next stage begins.
 */
export function nextUnit(
  progress: Progress,
  placed: Stage,
  arrival: Arrival | null,
  /** Units of stories still under way or just told: never picked again straight away. */
  recent: readonly string[] = [],
): Unit {
  let stage = teachingStage(progress, placed);
  const skip = (x: Unit) => progress.done.includes(x.id) || recent.includes(x.id);
  const order = (x: Unit) => UNITS.indexOf(x);
  const best = (units: readonly Unit[]) =>
    [...units].sort((a, b) => pull(b, arrival) - pull(a, arrival) || order(a) - order(b))[0];
  for (let guard = 0; guard < STAGES.length; guard++) {
    const found = best(UNITS.filter((x) => x.stage === stage && !skip(x)));
    if (found) return found;
    const up = STAGES[stageIndex(stage) + 1];
    if (!up) break;
    stage = up;
  }
  // Everything told: the spiral starts again from the learner's goals at their stage.
  const again = best(
    UNITS.filter((x) => x.stage === teachingStage(progress, placed) && !recent.includes(x.id)),
  );
  if (again) return again;
  const any = UNITS[0];
  if (!any) throw new Error('no units');
  return any;
}

/** The chunks due for review: the last two units' chunks come back in the next story. */
export function dueChunks(progress: Progress): string[] {
  return progress.done
    .slice(-2)
    .flatMap((id) => unitById(id)?.chunks.slice(0, 2) ?? [])
    .slice(0, 3);
}

/** After a story: the unit is told, its can-do evidenced or not, and the stage may move up. */
export function afterStory(
  progress: Progress,
  unitId: string,
  evidenced: boolean,
  placed: Stage,
): Progress {
  const done = progress.done.includes(unitId) ? progress.done : [...progress.done, unitId];
  const ev =
    evidenced && !progress.evidenced.includes(unitId)
      ? [...progress.evidenced, unitId]
      : progress.evidenced;
  let stage = teachingStage(progress, placed);
  const units = UNITS.filter((x) => x.stage === stage);
  // Up a stage when most of its can-dos were shown in free tasks, across at least two stories.
  const shown = units.filter((x) => ev.includes(x.id)).length;
  const up = STAGES[stageIndex(stage) + 1];
  if (shown >= Math.max(2, Math.ceil(units.length * 0.6)) && up) stage = up;
  return { stage, done, evidenced: ev };
}
