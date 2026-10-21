-- Yapling Plus, as RevenueCat reports it (`src/purchases`). The server's own mirror of the "plus"
-- entitlement: one row per learner who ever bought it. The learner object's ledger is set from this
-- row; the stores keep their own receipts. Times are epoch milliseconds.
CREATE TABLE plus_entitlements (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  -- 'active' until the subscription expires (or is refunded), then 'expired'.
  state TEXT NOT NULL,
  -- The logical product id (`yapling_plus_monthly`, `yapling_plus_yearly`).
  product TEXT,
  -- RevenueCat's names: `APP_STORE`…, `SANDBOX` or `PRODUCTION`, `NORMAL`/`INTRO`/`TRIAL`.
  store TEXT,
  environment TEXT,
  period_type TEXT,
  -- When the current paid period started: the ledger's Plus months count from here.
  period_start INTEGER NOT NULL,
  -- When the current period ends; null when RevenueCat didn't say.
  expires_at INTEGER,
  -- 0 once the learner turned auto-renew off; the entitlement still runs to `expires_at`.
  will_renew INTEGER NOT NULL,
  -- The newest event applied: an older one delivered late changes nothing.
  event_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Every webhook event applied, by RevenueCat's event id: a redelivery is acknowledged and skipped.
-- Holds no learner id, so account deletion leaves it.
CREATE TABLE revenuecat_events (
  id TEXT NOT NULL PRIMARY KEY,
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
