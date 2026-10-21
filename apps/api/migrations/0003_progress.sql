-- The learner's progress (contracts `Progress`): one row each, its lists as JSON arrays checked
-- against the contracts on every read and write. `revision` grows on every change; a write based
-- on an older revision is refused, so the server wins any conflict. `installed_on` is the install
-- day in the learner's timezone (`YYYY-MM-DD`); the day index is counted from it on each read.
CREATE TABLE progress (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  installed_on TEXT NOT NULL,
  phrases TEXT NOT NULL,
  error_targets TEXT NOT NULL,
  can_dos TEXT NOT NULL,
  keepsakes TEXT NOT NULL,
  weeks TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
