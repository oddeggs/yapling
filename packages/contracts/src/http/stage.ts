import { z } from 'zod';

import { Stage } from '../primitives';

/*
 * The learner moving their own stage. Placement sets the first stage on the server; everything
 * the learner chooses afterwards comes through here, and the answer is the updated `Profile`.
 */

/**
 * Why the learner asks. `self_select`: the onboarding level question. `too_hard` / `too_easy`: the
 * "too hard" sheet or "Thử nhanh hơn". `stage_up`: accepting Linh's Newcomer card. `stay`: "Ở lại
 * thêm" (`to` is the stage the learner already has).
 */
export const STAGE_REQUEST_REASONS = [
  'self_select',
  'too_hard',
  'too_easy',
  'stage_up',
  'stay',
] as const;
export const StageRequestReason = z.enum(STAGE_REQUEST_REASONS);
export type StageRequestReason = z.infer<typeof StageRequestReason>;

/** `POST /api/me/stage`: the stage the learner asks for, and why. Answers `Profile`. */
export const StageRequest = z.object({ to: Stage, reason: StageRequestReason });
export type StageRequest = z.infer<typeof StageRequest>;
