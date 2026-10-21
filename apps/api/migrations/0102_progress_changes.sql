-- Server-side progress changes applied once each (the post-call job's, keyed by the call id). The
-- row is written in the same batch as the progress update it records, so a retried job finds it
-- and applies nothing twice. `revision` is the progress revision the change produced; `data` is
-- what the change left for the caller (JSON). Epoch milliseconds.
CREATE TABLE progress_changes (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX progress_changes_user_idx ON progress_changes (user_id);
