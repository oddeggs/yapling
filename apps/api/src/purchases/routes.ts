import { Hono } from 'hono';

import { errorResponse } from '../auth';
import type { AppEnv, Bindings } from '../env';
import { userObject } from '../user';
import { planOf, readEntitlement } from './entitlements';
import { applyRevenueCatEvent, forgetEvent, RevenueCatWebhook } from './events';
import { sameText, webhookAuthOf } from './secrets';

/** Sets each learner's ledger to the plan their mirrored entitlement gives now. */
async function syncPlans(env: Bindings, learners: readonly string[], now: number): Promise<void> {
  for (const userId of learners) {
    const { plan, periodStart } = planOf(await readEntitlement(env.DB, userId), now);
    await userObject(env, userId).setPlan(plan, periodStart);
  }
}

/**
 * `POST /api/purchases/webhook`: RevenueCat tells the server what the App Store sold. The app never
 * reports a purchase itself; the server learns of it here. Authorised by the shared secret as the
 * whole `Authorization` header; applied once per event id. The learner's ledger moves to Plus or
 * back to free from the mirrored entitlement; if that fails the event is forgotten and RevenueCat's
 * retry applies it again.
 */
export function purchaseRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.post('/purchases/webhook', async (c) => {
    const secret = webhookAuthOf(c.env);
    if (secret === undefined) return errorResponse(c, 503, 'not_configured');
    if (!sameText(c.req.header('authorization') ?? '', secret)) {
      return errorResponse(c, 401, 'unauthorized');
    }
    const parsed = RevenueCatWebhook.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) return errorResponse(c, 400, 'bad_request');
    const { event } = parsed.data;
    const now = Date.now();
    const applied = await applyRevenueCatEvent(c.env.DB, event, c.env.ENVIRONMENT, now);
    try {
      await syncPlans(c.env, applied.learners, now);
    } catch (error) {
      await forgetEvent(c.env.DB, event.id);
      throw error;
    }
    return c.json({ ok: true, outcome: applied.outcome });
  });

  return routes;
}
