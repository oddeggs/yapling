-- Every change the learner asked for (`POST /api/me/stage`, contracts `StageRequestReason`) and
-- the placement call's (`placement`), for the call logs and analytics. `from_stage` and `to_stage`
-- are the same for "stay". `call_id` is the placement call's; null for a request. One placement
-- row per learner at most (its id is derived from the user id). Epoch milliseconds.
CREATE TABLE stage_changes (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  call_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX stage_changes_user_idx ON stage_changes (user_id, created_at);
