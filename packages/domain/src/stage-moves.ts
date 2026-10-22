import type { Stage, StageRequest } from '@yapling/contracts';

import { adjustStage, nextStage } from './stages';

/*
 * How a learner's stage is set and moved on the beginner path: the placement call's rule, the
 * Visitor-to-Newcomer rule at the end of week 1, and which stage requests the learner may make.
 * Nothing here is ever shown as a level or a score.
 */

// --- Placement: the unpacking call on day 1 ---

/** The placement call's open boxes (work, after work, what to get better at), after the warm-up. */
export const PLACEMENT_OPEN_BOXES = 3;
/** At most this many fine open boxes places the learner as a Visitor. */
export const PLACEMENT_VISITOR_MAX_FINE = 1;

/**
 * Whether Pip skips the last open box ("Phew! Heavy boxes. Let's rest!"): the first two open boxes
 * both missed, so nobody gets three misses in a row. `openBoxesFine` is one flag per open box
 * played so far, in order; the closed warm-up box is never scored and never in it.
 */
export const placementSkipsLastBox = (openBoxesFine: readonly boolean[]): boolean =>
  openBoxesFine.length === PLACEMENT_OPEN_BOXES - 1 && openBoxesFine.every((fine) => !fine);

/**
 * The stage the placement call sets when it ends: Visitor when at most one of the three open boxes
 * got a fine answer, otherwise Newcomer. A box not played (the early stop, or a call that ended
 * before it) counts as not fine. Placement is only a starting guess; the learner can move it.
 */
export const placementStage = (openBoxesFine: readonly boolean[]): 'visitor' | 'newcomer' => {
  const fine = openBoxesFine.slice(0, PLACEMENT_OPEN_BOXES).filter(Boolean).length;
  return fine <= PLACEMENT_VISITOR_MAX_FINE ? 'visitor' : 'newcomer';
};

// --- Visitor to Newcomer: Linh's card at the end of week 1 ---

/**
 * How one learner turn passed (the turn log's pass kind). `match`: passed on its own (the beat's
 * word heard, or judged fine). `generous`: passed on the second English try without the word.
 * `skip`: the learner tapped "Bỏ qua". `fallback`: the turn ran out and another character said it.
 */
export type TurnPass = 'match' | 'generous' | 'skip' | 'fallback';

/** The share of week-1 turns, in percent, that must pass on their own for Linh's Newcomer card. */
export const STAGE_UP_MATCH_PERCENT = 70;

/**
 * Whether Linh hands a Visitor the Newcomer residency card at the end of week 1's ring (day 5's
 * keepsake): at least 70% of their week-1 turns passed without the generous pass. Skips and
 * fallbacks count as turns not passed on their own. No turns yet: not yet, and Linh offers again
 * next week. Only a Visitor is offered the card; the learner can still say "Ở lại thêm".
 */
export const earnsNewcomerCard = (stage: Stage, weekOneTurns: readonly TurnPass[]): boolean => {
  if (stage !== 'visitor' || weekOneTurns.length === 0) return false;
  const matched = weekOneTurns.filter((t) => t === 'match').length;
  // Whole numbers, so exactly 70% passes.
  return matched * 100 >= weekOneTurns.length * STAGE_UP_MATCH_PERCENT;
};

// --- The learner moving their own stage (`POST /api/me/stage`) ---

/**
 * The stage a request moves the learner to, or null when the request doesn't fit their stage.
 *
 * - `self_select`: the onboarding level question, Visitor ("Mình mới bắt đầu") or Newcomer, from
 *   either.
 * - `too_hard`: "Tập với Linh trước" takes a Newcomer to Visitor; above Newcomer, one stage down.
 * - `too_easy`: one stage up ("Thử nhanh hơn"; from Visitor, Newcomer).
 * - `stage_up`: a Visitor accepting Linh's Newcomer card.
 * - `stay`: "Ở lại thêm", `to` is the stage the learner has.
 */
export const resolveStageRequest = (current: Stage, request: StageRequest): Stage | null => {
  const { to } = request;
  switch (request.reason) {
    case 'self_select':
      return (current === 'visitor' || current === 'newcomer') &&
        (to === 'visitor' || to === 'newcomer')
        ? to
        : null;
    case 'too_hard': {
      if (current === 'newcomer') return to === 'visitor' ? to : null;
      const down = adjustStage(current, 'too_hard');
      return down !== current && to === down ? to : null;
    }
    case 'too_easy': {
      const up = nextStage(current);
      return up !== current && to === up ? to : null;
    }
    case 'stage_up':
      return current === 'visitor' && to === 'newcomer' ? to : null;
    case 'stay':
      return to === current ? to : null;
  }
};
