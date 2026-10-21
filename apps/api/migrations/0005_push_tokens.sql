-- Expo push tokens for voicemails and incoming calls, one row per phone. A token belongs to the
-- learner who registered it last (a phone that changed accounts moves with it). Epoch milliseconds.
CREATE TABLE push_tokens (
  token TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX push_tokens_user_idx ON push_tokens (user_id);
