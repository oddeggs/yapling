-- Scheduled pushes the jobs consumer has sent, by the scheduled push's id: a message the queue
-- delivers twice is sent once. Epoch milliseconds.
CREATE TABLE push_sends (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  sent_at INTEGER NOT NULL
);
CREATE INDEX push_sends_user_idx ON push_sends (user_id);
