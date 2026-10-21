-- "What Pip remembers" (contracts `MemoryItem`): the visible, editable memory page. Items come from
-- the post-call summary (`source_call_id`) or from the learner (null). Times are epoch milliseconds.
CREATE TABLE memory_items (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  source_call_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX memory_items_user_created_idx ON memory_items (user_id, created_at DESC);
