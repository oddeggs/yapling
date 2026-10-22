import { Hono } from 'hono';

import { accountRoutes } from './account';
import { callSocketRoutes, callTranslateRoutes } from './call';
import { callRecordRoutes } from './calls';
import type { AppEnv } from './env';
import { purchaseRoutes } from './purchases';

/** The API, served at `<host>/api/*`. */
export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>().basePath('/api');

  app.get('/health', (c) =>
    c.json({ status: 'ok', environment: c.env.ENVIRONMENT, commit: c.env.COMMIT_SHA }),
  );

  // Sessions, the session guard for every `/me` and `/calls` route, and the learner's own data.
  app.route('/', accountRoutes());
  // The call socket (its token comes in `hello`), a live call's tap-to-translate, the records.
  app.route('/', callSocketRoutes());
  app.route('/', callTranslateRoutes());
  app.route('/', callRecordRoutes());
  // RevenueCat's webhook: its own secret, no session.
  app.route('/', purchaseRoutes());

  app.notFound((c) => c.json({ error: { code: 'not_found' } }, 404));

  app.onError((error, c) => {
    // The path and the error only: never a body, a header or a query string.
    console.error('unhandled error', { path: c.req.path, error });
    return c.json({ error: { code: 'internal' } }, 500);
  });

  return app;
}
