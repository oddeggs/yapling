-- The story director's tables. A learner's own record (what the town knows: their name, language,
-- country, and the director's learner model), the moments planned for them (one conversation each),
-- and the paintings they kept (one per played moment, with what the judge saw). Times are epoch ms.
CREATE TABLE learners (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  -- What the learner said their name is, or null until they have.
  name TEXT,
  first_language TEXT NOT NULL,
  -- ISO country code from the device region, then from the request.
  country TEXT,
  timezone TEXT NOT NULL,
  -- The director's learner model (judge output), JSON, null before the first conversation.
  model TEXT,
  -- Story threads still open, JSON array of at most two strings.
  open_threads TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE moments (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- planning | ready | played | failed
  status TEXT NOT NULL,
  -- director | first | free
  source TEXT NOT NULL,
  place TEXT,
  variant INTEGER,
  -- The plan, JSON, once written.
  plan TEXT,
  -- The learner's local hour the plan was written for.
  planned_hour REAL,
  created_at INTEGER NOT NULL,
  played_at INTEGER,
  call_id TEXT,
  cost_usd REAL NOT NULL DEFAULT 0
);
CREATE INDEX moments_user_created_idx ON moments (user_id, created_at DESC);

CREATE TABLE paintings (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  moment_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  place TEXT NOT NULL,
  variant INTEGER NOT NULL,
  -- The learner's local hour, date and the town's weather when it was kept.
  hour REAL NOT NULL,
  local_date TEXT NOT NULL,
  weather TEXT NOT NULL,
  speaker TEXT NOT NULL,
  title_open TEXT NOT NULL,
  title TEXT NOT NULL,
  kept_at INTEGER NOT NULL,
  -- judging | done | failed
  status TEXT NOT NULL,
  -- 1 when the conversation was cut short (minutes, a hang-up): it keeps its opening title.
  cut INTEGER NOT NULL DEFAULT 0,
  -- JSON arrays filled by the judge: can-dos seen, and the words the learner used well.
  can_dos TEXT NOT NULL DEFAULT '[]',
  words TEXT NOT NULL DEFAULT '[]',
  -- One line on what the resident learned from the learner.
  learned TEXT,
  -- The judge's session record (summary, things to call back), JSON: the story's memory.
  record TEXT
);
CREATE INDEX paintings_user_kept_idx ON paintings (user_id, kept_at DESC);
CREATE UNIQUE INDEX paintings_call_idx ON paintings (call_id);
