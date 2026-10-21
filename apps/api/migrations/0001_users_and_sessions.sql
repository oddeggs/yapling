-- Learners and their sign-in records. Better Auth owns these tables under the names it is
-- configured with in `src/auth/options.ts`; `src/auth/schema.test.ts` checks them against Better
-- Auth's own migrator. Better Auth writes its times as ISO 8601 text and its booleans as 0/1;
-- columns Yapling adds hold epoch milliseconds.

-- A learner: Better Auth's user. `id` is the user id everywhere. A guest has a placeholder email and
-- `is_anonymous = 1` until they sign in with Apple.
CREATE TABLE users (
  id TEXT NOT NULL PRIMARY KEY,
  -- The name Apple gave, if any. Never shown; the profile's display name is.
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL,
  image TEXT,
  created_at DATE NOT NULL,
  updated_at DATE NOT NULL,
  is_anonymous INTEGER,
  -- The random id the app keeps in the keychain for its install; a guest session asked for again
  -- by the same install is the same guest. Null once the guest signed in with Apple.
  install_id TEXT UNIQUE
);

CREATE TABLE sessions (
  id TEXT NOT NULL PRIMARY KEY,
  expires_at DATE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at DATE NOT NULL,
  updated_at DATE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

-- One row per identity: `provider_id` is apple, `account_id` Apple's subject.
CREATE TABLE accounts (
  id TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at DATE,
  refresh_token_expires_at DATE,
  scope TEXT,
  password TEXT,
  created_at DATE NOT NULL,
  updated_at DATE NOT NULL
);
CREATE INDEX accounts_user_id_idx ON accounts (user_id);
CREATE UNIQUE INDEX accounts_provider_account_idx ON accounts (provider_id, account_id);

-- Identity-token reservations against replay (`src/auth/replay.ts`), by hashed identifier.
CREATE TABLE verifications (
  id TEXT NOT NULL PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at DATE NOT NULL,
  created_at DATE NOT NULL,
  updated_at DATE NOT NULL
);
CREATE INDEX verifications_identifier_idx ON verifications (identifier);

-- Better Auth's per-address request limits.
CREATE TABLE rate_limits (
  id TEXT NOT NULL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  last_request BIGINT NOT NULL
);
