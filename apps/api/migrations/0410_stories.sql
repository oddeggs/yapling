-- Stories: the director now tells each learner one story at a time (five or six scenes with a
-- shape, a twist and a payoff), built on what they told the town when they arrived. Times are
-- epoch ms.

-- What the learner told the town on arrival (name, why English, work, interests, what's hard,
-- their own feel for their level), JSON; null until they have arrived.
ALTER TABLE learners ADD COLUMN arrival TEXT;
-- When they arrived (epoch ms): the first conversation with Pip follows it.
ALTER TABLE learners ADD COLUMN arrived_at INTEGER;

CREATE TABLE stories (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- planning | active | done | failed
  status TEXT NOT NULL,
  -- The outline (premise, scenes, plants and payoffs), JSON, once written.
  outline TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  cost_usd REAL NOT NULL DEFAULT 0
);
CREATE INDEX stories_user_created_idx ON stories (user_id, created_at DESC);

-- A director moment is one scene of a story (1-based); fixed moments have neither.
ALTER TABLE moments ADD COLUMN story_id TEXT;
ALTER TABLE moments ADD COLUMN scene_no INTEGER;
-- The scene was rewritten after the one before it was played, so it follows on from it.
ALTER TABLE moments ADD COLUMN followed INTEGER NOT NULL DEFAULT 0;

-- One plan written at a time per learner: two opens at once used to start two.
UPDATE moments SET status = 'failed' WHERE status IN ('planning', 'ready');
CREATE UNIQUE INDEX moments_one_planning_idx ON moments (user_id)
  WHERE status = 'planning' AND source = 'director';
