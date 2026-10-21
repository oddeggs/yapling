import { z } from 'zod';

import { EpochMs, Plan, Seconds } from '../primitives';

/**
 * `GET /api/me/minutes`: the live-minute ledger for the current period. Free: a generous first
 * week, then a weekly allowance; Plus: a monthly fair-use allowance. Seconds on the wire, minutes
 * on screen.
 */
export const MinutesSummary = z
  .object({
    plan: Plan,
    periodStart: EpochMs,
    periodEnd: EpochMs,
    allowanceSeconds: Seconds,
    usedSeconds: Seconds,
    leftSeconds: Seconds,
    /** The learner is in the first week's generous allowance. */
    firstWeek: z.boolean(),
  })
  .refine((m) => m.periodEnd > m.periodStart, { message: 'A period ends after it starts' })
  .refine((m) => m.leftSeconds <= m.allowanceSeconds, {
    message: 'No more left than the allowance',
  })
  .refine((m) => !(m.firstWeek && m.plan === 'plus'), {
    message: 'The first-week allowance is a free-plan rule',
  });
export type MinutesSummary = z.infer<typeof MinutesSummary>;
