import { z } from 'zod';

import { getSessionToken } from '../../data';
import { apiBase } from '../../data/config';
import { createHttp } from '../../data/http';

/*
 * The dev Worker's cost list (`GET /api/calls/dev/costs`): the learner's last calls with their
 * estimated cost and latency, and totals. A test-menu tool, not part of the app's contracts; the
 * store API doesn't answer it.
 */

export const COSTS_PATH = '/api/calls/dev/costs';

const Ms = z.number().nullable();

export const CallCostEntry = z.object({
  callId: z.string(),
  kind: z.string(),
  sceneId: z.string(),
  startedAt: z.number(),
  endedAt: z.number(),
  endReason: z.string(),
  learnerSeconds: z.number(),
  turns: z.number(),
  usd: z.object({
    stt: z.number(),
    tts: z.number(),
    llm: z.number(),
    summary: z.number(),
    total: z.number(),
  }),
  replyP50Ms: Ms,
  replyP90Ms: Ms,
});
export type CallCostEntry = z.infer<typeof CallCostEntry>;

export const CostTotals = z.object({
  calls: z.number(),
  minutes: z.number(),
  learnerMinutes: z.number(),
  usd: z.number(),
  usdPerMinute: z.number().nullable(),
  turns: z.number(),
  replyP50Ms: Ms,
  replyP90Ms: Ms,
  phoneP50Ms: Ms,
  phoneP90Ms: Ms,
});
export type CostTotals = z.infer<typeof CostTotals>;

export const CostList = z.object({ calls: z.array(CallCostEntry), totals: CostTotals });
export type CostList = z.infer<typeof CostList>;

/** The API the page reads, for its "from" line. */
export const costServer = (): string => apiBase();

/** The learner's last calls, with the session's token. */
export async function fetchCosts(limit = 20): Promise<CostList> {
  const http = createHttp({ base: apiBase() });
  return http.send({
    method: 'GET',
    path: `${COSTS_PATH}?limit=${limit}`,
    response: CostList,
    token: await getSessionToken(),
  });
}

/** "$0.0275", to the hundredth of a cent. */
export const dollars = (usd: number): string => usd.toFixed(4);

/** "1:05" from seconds. */
export const duration = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
